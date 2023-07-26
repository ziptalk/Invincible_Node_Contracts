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
  leverageStake,
  provideLiquidity,
  splitUnstakedLPP,
} from "../utils";
import { getTestAddress } from "../getTestAddress";
import { deployAll } from "../../scripts/deploy/deployAll";

describe("Invi core service test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let stTokenContract: Contract;
  let lendingPoolContract: Contract;
  let inviTokenContract: Contract;
  let inviTokenStakeContract: Contract;

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
      } = await deployAll());
    } else {
      console.log("only hardhat test");
    }
  });

  it("Test reward function", async () => {
    if (network !== "hardhat") return; // only hardhat test

    const [deployer, LP, userA, userB, userC] = await ethers.getSigners();

    let nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    let nonceLP = await ethers.provider.getTransactionCount(LP.address);
    let nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    let nonceUserB = await ethers.provider.getTransactionCount(userB.address);
    let tx;

    // Step 1. Provide liquidity and stake
    console.log("step 1");
    const lpAmount: BigNumber = ethers.utils.parseEther("1000");
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

    // Step2. Regular Minting
    console.log("step 2");
    const regularMinting = await inviTokenContract.connect(deployer).regularMinting();
    await regularMinting.wait();

    // check INVI balances
    const inviBalanceLendingPool = await inviTokenContract.connect(userA).balanceOf(lendingPoolContract.address);
    const inviBalanceLP = await inviTokenContract.connect(userA).balanceOf(lpPoolContract.address);
    const inviBalanceInviStake = await inviTokenContract.connect(userA).balanceOf(inviTokenStakeContract.address);
    console.log("inviBalanceLendingPool     : ", ethers.utils.formatEther(inviBalanceLendingPool.toString()));
    console.log("inviBalanceLP              : ", ethers.utils.formatEther(inviBalanceLP.toString()));
    console.log("inviBalanceInviStake       : ", ethers.utils.formatEther(inviBalanceInviStake.toString()));

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
    expect(inviBalanceUserA).to.equal(maxLendAmount);

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
  });
});
