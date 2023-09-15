import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
const { expectRevert } = require("@openzeppelin/test-helpers");
import hre from "hardhat";
import { units } from "../units";
import {
  checkUnstakeRequestLPP,
  checkUnstakeRequests,
  claimAndSplitCore,
  getSwapPoolStatus,
  leverageStake,
  provideLiquidity,
  splitUnstakedLPP,
} from "../utils";
import { getTestAddress } from "../getTestAddress";
import { deployAll } from "../../scripts/deploy/deployAll";
import { swapSimulation } from "./swapSimulation";

describe("Lending service test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let stTokenContract: Contract;
  let lendingPoolContract: Contract;
  let inviTokenContract: Contract;
  let inviTokenStakeContract: Contract;
  let inviSwapPoolContract: Contract;

  const network: string = hre.network.name;
  const testAddresses: any = getTestAddress(network);
  console.log(network);

  this.beforeAll(async function () {
    // for testnet test
    if (network === "hardhat") {
      ({
        inviCoreContract,
        stakeNFTContract,
        lpPoolContract,
        stTokenContract,
        lendingPoolContract,
        inviTokenStakeContract,
        inviTokenContract,
        inviSwapPoolContract,
      } = await deployAll());
    } else {
      console.log("only hardhat test");
    }
  });

  it("Test lending function", async () => {
    if (network !== "hardhat") return; // only hardhat test

    const [deployer, LP, userA, userB, userC] = await ethers.getSigners();

    let nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    let nonceLP = await ethers.provider.getTransactionCount(LP.address);
    let nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    let nonceUserB = await ethers.provider.getTransactionCount(userB.address);
    let tx;
    let receipt;

    //* given
    // Regular Minting
    console.log("step 0");
    const regularMinting = await inviTokenContract.connect(deployer).regularMinting();
    await regularMinting.wait();

    const lendingIteration = 3;
    const lendingSimulation = async () => {
      // Step 1. Provide liquidity and stake
      console.log("step 1");
      const lpAmount: BigNumber = ethers.utils.parseEther("10000");
      await provideLiquidity(lpPoolContract, LP, lpAmount, nonceLP); // lp stake
      console.log("provided liquidity");

      // userA
      const principalA: BigNumber = ethers.utils.parseEther("1");
      const leverageRatioA = 4 * units.leverageUnit;
      const minLockPeriodA = await inviCoreContract.functions.getLockPeriod(leverageRatioA);
      const lockPeriodA = minLockPeriodA * 2;
      await leverageStake(inviCoreContract, userA, principalA, leverageRatioA, lockPeriodA, nonceUserA); // userA stake

      // userB (repeat 10 times)
      for (let i = 0; i < 10; i++) {
        const principalB: BigNumber = ethers.utils.parseEther("5");
        const leverageRatioB = 2 * units.leverageUnit;
        const minLockPeriod = await inviCoreContract.functions.getLockPeriod(leverageRatioB);
        const lockPeriod = minLockPeriod * 1;
        await leverageStake(inviCoreContract, userB, principalB, leverageRatioB, lockPeriod, nonceUserB); // userA stake
      }

      // check INVI balances
      const inviBalanceLendingPool = await inviTokenContract.connect(userA).balanceOf(lendingPoolContract.address);
      const inviBalanceLP = await inviTokenContract.connect(userA).balanceOf(lpPoolContract.address);
      const inviBalanceInviStake = await inviTokenContract.connect(userA).balanceOf(inviTokenStakeContract.address);
      console.log("inviBalanceLendingPool     : ", ethers.utils.formatEther(inviBalanceLendingPool.toString()));
      console.log("inviBalanceLP              : ", ethers.utils.formatEther(inviBalanceLP.toString()));
      console.log("inviBalanceInviStake       : ", ethers.utils.formatEther(inviBalanceInviStake.toString()));

      // Step2. conduct Swap
      console.log("step 2");
      // provide lp
      await provideLiquidity(lpPoolContract, LP, lpAmount, nonceLP); // lp stake
      await provideLiquidity(lpPoolContract, userB, lpAmount, nonceUserB); // lp stake
      console.log("provided liquidity LP / userB");

      // get inviRewardInterval
      const inviRewardInterval = await lpPoolContract.inviRewardInterval();
      console.log("inviRewardInterval: ", inviRewardInterval.toString());

      // distribute inviToken reward
      for (let i = 0; i < 3; i++) {
        const distributeInviTokenReward = await lpPoolContract.connect(deployer).distributeInviTokenReward();
        receipt = await distributeInviTokenReward.wait();
        console.log("gasUsed: ", receipt.gasUsed.toString());
        // time pass
        await ethers.provider.send("evm_increaseTime", [inviRewardInterval.toNumber()]);
      }
      // claim inviToken
      const claimInviTokenLP = await lpPoolContract.connect(LP).claimInviReward();
      receipt = await claimInviTokenLP.wait();
      console.log("gasUsed: ", receipt.gasUsed.toString());
      const claimInviTokenUserB = await lpPoolContract.connect(userB).claimInviReward();
      receipt = await claimInviTokenUserB.wait();
      console.log("gasUsed: ", receipt.gasUsed.toString());

      // check inviToken balance
      // get lp, userB inviToken balance
      const lpInviTokenBalance = await inviTokenContract.balanceOf(LP.address);
      console.log("lpInviTokenBalance: ", ethers.utils.formatEther(lpInviTokenBalance.toString()));
      const userBInviTokenBalance = await inviTokenContract.balanceOf(userB.address);
      console.log("userBInviTokenBalance: ", ethers.utils.formatEther(userBInviTokenBalance.toString()));
      const totalInviRewardAmount = await lpPoolContract.totalInviRewardAmount();
      console.log("totalInviRewardAmount: ", ethers.utils.formatEther(totalInviRewardAmount.toString()));

      // Step 1. Add Liquidity
      console.log("======Step 1");
      const lpAmountPool: BigNumber = ethers.utils.parseEther("500");
      // get native amount
      const nativeAmount = await inviSwapPoolContract.connect(LP).getAddLiquidityNative(lpAmountPool);
      console.log("required native amount: ", ethers.utils.formatEther(nativeAmount.toString()));
      const getCurrentBalance = await ethers.provider.getBalance(LP.address);
      console.log("getCurrentBalance     : ", ethers.utils.formatEther(getCurrentBalance.toString()));
      const getAddLiquidityInvi = await inviSwapPoolContract.connect(LP).getAddLiquidityInvi(lpAmountPool);
      console.log("getAddLiquidityInvi   : ", ethers.utils.formatEther(getAddLiquidityInvi.toString()));
      const addLiquidity = await inviSwapPoolContract
        .connect(LP)
        .addLiquidity(getAddLiquidityInvi, 1 * units.slippageUnit, { value: lpAmountPool });
      receipt = await addLiquidity.wait();
      console.log("gasUsed: ", receipt.gasUsed.toString());

      await getSwapPoolStatus(inviSwapPoolContract, inviTokenContract, deployer);
      await swapSimulation(inviSwapPoolContract, inviTokenContract, deployer, LP, userA, userB);

      // Step3. Lend NFT and borrow INVI
      console.log("step 3");
      // get NFTOwnership
      const NFTOwnership = await stakeNFTContract.connect(userA).getNFTOwnership(userA.address);
      console.log("NFTOwnership: ", NFTOwnership.toString());
      // get max lend amount
      const maxLendAmount = await lendingPoolContract.connect(userA).getMaxLendAmountByNFT(NFTOwnership[0]);
      console.log("maxLendAmount: ", ethers.utils.parseEther(maxLendAmount.toString()));
      // lend NFT
      const lend = await lendingPoolContract.connect(userA).lend(NFTOwnership[0], maxLendAmount);
      await lend.wait();

      // get userA INVI balance
      const inviBalanceUserA = await inviTokenContract.connect(userA).balanceOf(userA.address);
      console.log("inviBalanceUserA           : ", ethers.utils.formatEther(inviBalanceUserA.toString()));
      //expect(inviBalanceUserA).to.equal(maxLendAmount);

      // Step4. Do same thing for half of nfts of B
      console.log("step 4");
      for (let i = 0; i < 5; i++) {
        // get lend Ratio
        const lendRatio = await lendingPoolContract.connect(userB).getLendRatio();
        console.log("lendRatio: ", lendRatio.toString());

        // get NFTOwnership
        const NFTOwnership = await stakeNFTContract.connect(userB).getNFTOwnership(userB.address);
        console.log("NFTOwnership: ", NFTOwnership.toString());
        // get max lend amount
        const maxLendAmount = await lendingPoolContract.connect(userB).getMaxLendAmountByNFT(NFTOwnership[i]);
        console.log("maxLendAmount: ", ethers.utils.parseEther(maxLendAmount.toString()));
        // lend NFT
        const lend = await lendingPoolContract.connect(userB).lend(NFTOwnership[i], maxLendAmount);
        await lend.wait();
      }
      const inviBalanceUserB = await inviTokenContract.connect(userB).balanceOf(userB.address);
      console.log("inviBalanceUserB           : ", ethers.utils.formatEther(inviBalanceUserB.toString()));

      // Step 5. Provide rewards for NFTs
      console.log("step 5");
      const rewardAmount = ethers.utils.parseEther("10");
      // spread rewards to inviCore Contract
      const spreadRewards = await stTokenContract
        .connect(deployer)
        .spreadRewards(inviCoreContract.address, { value: rewardAmount });
      await spreadRewards.wait();
      // get stToken distribution period
      const stTokenDistributionPeriod = await inviCoreContract.connect(deployer).stTokenDistributePeriod();
      // pass time to distribute rewards
      await ethers.provider.send("evm_increaseTime", [stTokenDistributionPeriod.toNumber() + 1]);
      // distribute rewards from inviCore Contract
      const distributeRewards = await inviCoreContract.connect(deployer).distributeStTokenReward();
      await distributeRewards.wait();

      // Step 6. lend and borrow for rest of NFTS
      console.log("step 6");
      for (let i = 5; i < 10; i++) {
        // get lend Ratio
        const lendRatio = await lendingPoolContract.connect(userB).getLendRatio();
        console.log("lendRatio: ", lendRatio.toString());

        // get NFTOwnership
        const NFTOwnership = await stakeNFTContract.connect(userB).getNFTOwnership(userB.address);
        console.log("NFTOwnership: ", NFTOwnership.toString());
        // get max lend amount
        const maxLendAmount = await lendingPoolContract.connect(userB).getMaxLendAmountByNFT(NFTOwnership[i]);
        console.log("maxLendAmount: ", ethers.utils.parseEther(maxLendAmount.toString()));
        // lend NFT
        const lend = await lendingPoolContract.connect(userB).lend(NFTOwnership[i], maxLendAmount);
        await lend.wait();
      }
      const inviBalanceUserB2 = await inviTokenContract.connect(userB).balanceOf(userB.address);
      console.log("inviBalanceUserB2           : ", ethers.utils.formatEther(inviBalanceUserB2.toString()));
    };

    for (let i = 0; i < lendingIteration; i++) {
      console.log("================lending iteration: ", i);
      await lendingSimulation();
    }
  });
});
