import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import hre from "hardhat";
import { units } from "../units";
import { leverageStake, provideLiquidity } from "../utils";
import { checkTx } from "../checkTx";
import { deployAll } from "../../scripts/deploy/deployAll";

describe("Tokenomics test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let stTokenContract: Contract;
  let iLPTokenContract: Contract;
  let lendingPoolContract: Contract;
  let inviTokenContract: Contract;
  let inviTokenStakeContract: Contract;
  let inviSwapPoolContract: Contract;
  let iSPTTokenContract: Contract;

  const network: string = hre.network.name;
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

  it("Test with all operation", async () => {
    if (network !== "hardhat") return; // only hardhat test

    const [deployer, LP1, LP2, LP3, userA, userB, userC] = await ethers.getSigners();

    let tx;
    let receipt;

    //*given
    // LP Pool: 10000
    // User Coin: 100
    // Swap Pool LP: 1000 1000
    console.log("======== Initial Setup =========");
    // regular minting INVI Token
    const regularMinting = await inviTokenContract.connect(deployer).regularMinting();
    await regularMinting.wait();

    // lp 1 and lp 2 provide liquidity of 5000 each
    let lpAmount = ethers.utils.parseEther("5000");
    tx = await provideLiquidity(lpPoolContract, LP1, lpAmount, 0);
    tx = await provideLiquidity(lpPoolContract, LP2, lpAmount, 0);

    // spread INVI to give INVI tokens to LPs
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
    // claim inviToken reward
    const claimInviTokenReward = await lpPoolContract.connect(LP1).claimInviReward();
    receipt = await claimInviTokenReward.wait();
    console.log("gasUsed: ", receipt.gasUsed.toString());

    // lp 1  provide liquidity to swap pool 1000 each
    console.log("lp1 invi balance: ", (await inviTokenContract.balanceOf(LP1.address)).toString());
    const lpAmountPool: BigNumber = ethers.utils.parseEther("1000");
    const addLiquidity = await inviSwapPoolContract
      .connect(LP1)
      .addLiquidity(lpAmountPool, 1 * units.slippageUnit, { value: lpAmountPool });
    receipt = await addLiquidity.wait();
    console.log("gasUsed: ", receipt.gasUsed.toString());

    console.log("lp1 invi balance: ", (await inviTokenContract.balanceOf(LP1.address)).toString());

    // send INVI to userA
    // get lending pool boost requirement
    const lendingPoolBoostRequirement = await lendingPoolContract.boostRequirementAmount();
    tx = await inviTokenContract.connect(LP1).transfer(userA.address, lendingPoolBoostRequirement);

    // userA stake inviToken to inviTokenStakeContract
    const stakeAmount = lendingPoolBoostRequirement;
    tx = await inviTokenStakeContract.connect(userA).stake(stakeAmount);

    // userA sends 9900 ether to lp1
    const userAAmount = ethers.utils.parseEther("9990");
    tx = await userA.sendTransaction({
      to: LP1.address,
      value: userAAmount,
    });
    receipt = await tx.wait();
    console.log("gasUsed: ", receipt.gasUsed.toString());

    // check Initial Status
    console.log("======== Initial Status =========");
    const initialUserABalance = await ethers.provider.getBalance(userA.address);
    console.log("UserA Balance        : ", ethers.utils.formatEther(initialUserABalance));
    // get lp pool balance
    const initialTotalStakedLP = await lpPoolContract.totalStakedAmount();
    console.log("totalStakedLPPool    : ", ethers.utils.formatEther(initialTotalStakedLP));
    // get swap pool balance
    const initialTotalLiquidityInvi = await inviSwapPoolContract.totalLiquidityInvi();
    console.log("totalLiquidityInvi   : ", ethers.utils.formatEther(initialTotalLiquidityInvi));
    const initialTotalLiquidityNative = await inviSwapPoolContract.totalLiquidityNative();
    console.log("totalLiquidityNative : ", ethers.utils.formatEther(initialTotalLiquidityNative));

    // Iterate Operation
    console.log("======== Start Iteration =========");
    let iteration = 1;
    for (let i = 0; i < iteration; i++) {
      console.log("======== Iteration ", i, " =========");
      console.log("======== Step 1: leverage Stake =========");
      // get userA Balance
      let userABalance = await ethers.provider.getBalance(userA.address);
      console.log("UserA Balance        : ", ethers.utils.formatEther(userABalance));
      let stakeAmount = userABalance.mul(97).div(100);
      // get max leverage ratio
      const maxLeverageRatio = await inviCoreContract.getMaxLeverageRatio(stakeAmount);
      console.log("maxLeverageRatio     : ", maxLeverageRatio.toString());
      // get min lock period
      const minLockPeriod = await inviCoreContract.functions.getLockPeriod(maxLeverageRatio);

      // leverage Stake
      await leverageStake(
        inviCoreContract,
        userA,
        stakeAmount,
        parseFloat(maxLeverageRatio.toString()),
        parseFloat(minLockPeriod.toString()),
        0
      );

      console.log("======== Step 2: lend NFT =========");
      // get NFTOwnership
      const NFTOwnership = await stakeNFTContract.connect(userA).getNFTOwnership(userA.address);
      console.log("NFTOwnership: ", NFTOwnership.toString());
      // get principal
      // get NFT principals of UserA
      const allStakeInfoOfUser = await stakeNFTContract.getAllStakeInfoOfUser(userA.address);
      console.log("NFT ID: ", i);
      const principal = allStakeInfoOfUser[i].principal;
      console.log("NFT Principal: ", ethers.utils.formatEther(principal));
      const stakedAmount = allStakeInfoOfUser[i].stakedAmount;
      console.log("NFT StakedAmount: ", ethers.utils.formatEther(stakedAmount));
      // get max lend amount
      const maxLendAmount = await lendingPoolContract.connect(userA).getMaxLendAmountByNFT(NFTOwnership[0]);
      console.log("maxLendAmount: ", ethers.utils.formatEther(maxLendAmount.toString()));
      const maxLendAmountWithBoost = await lendingPoolContract.connect(userA).getMaxLendAmountWithBoost(principal);
      console.log("maxLendAmountWithBoost: ", ethers.utils.formatEther(maxLendAmountWithBoost.toString()));
      // lend NFT
      const lend = await lendingPoolContract.connect(userA).lend(NFTOwnership[0], maxLendAmountWithBoost);
      await lend.wait();

      console.log("======== Step 3: Invi Stake =========");
      // get userA INVI balance
      const userAINVIBalance = await inviTokenContract.balanceOf(userA.address);
      console.log("userAINVIBalance: ", ethers.utils.formatEther(userAINVIBalance));
      // get invi stake amount
      const inviStakeAmount = userAINVIBalance.div(2);
      console.log("inviStakeAmount: ", ethers.utils.formatEther(inviStakeAmount));
      // stake INVI
      const stakeInvi = await inviTokenStakeContract.connect(userA).stake(inviStakeAmount);
      await stakeInvi.wait();

      console.log("======== Step 4: Swap INVI to Klay =========");
      const getInviTokenBalanceOfUserA = await inviTokenContract.balanceOf(userA.address);
      console.log("userA inviToken Balance   : ", ethers.utils.formatEther(getInviTokenBalanceOfUserA.toString()));
      const getInviToNativeOutMaxInput = await inviSwapPoolContract.getInviToNativeOutMaxInput();
      const inviAmountToSwap = getInviTokenBalanceOfUserA.sub(getInviToNativeOutMaxInput).isNegative()
        ? getInviTokenBalanceOfUserA.mul(99).div(100)
        : getInviToNativeOutMaxInput.mul(99).div(100);
      console.log("getInviToNativeOutMaxInput: ", ethers.utils.formatEther(getInviToNativeOutMaxInput.toString()));
      console.log("inviAmountToSwap          : ", ethers.utils.formatEther(inviAmountToSwap.toString()));
      const expectedAmountOut = await inviSwapPoolContract.getInviToNativeOutAmount(inviAmountToSwap);
      const swapInviToNative = await inviSwapPoolContract
        .connect(userA)
        .swapInviToNative(inviAmountToSwap, expectedAmountOut.mul(99).div(100));
      receipt = await swapInviToNative.wait();
      console.log("gasUsed: ", receipt.gasUsed.toString());

      console.log("======== Step 5: Provide Liquidity =========");
      // get userA Balance
      userABalance = await ethers.provider.getBalance(userA.address);
      const lpAmount = userABalance.div(2);
      // provide liquidity
      tx = await provideLiquidity(lpPoolContract, userA, lpAmount, 0);
    }

    // check Initial Status
    console.log("======== Initial Status =========");
    console.log("UserA Balance        : ", ethers.utils.formatEther(initialUserABalance));
    // get lp pool balance
    console.log("totalStakedLPPool    : ", ethers.utils.formatEther(initialTotalStakedLP));
    // get swap pool balance
    console.log("totalLiquidityInvi   : ", ethers.utils.formatEther(initialTotalLiquidityInvi));
    console.log("totalLiquidityNative : ", ethers.utils.formatEther(initialTotalLiquidityNative));

    // check Final Status
    console.log("======== Final Status =========");

    // get NFT principals of UserA
    const allStakeInfoOfUser = await stakeNFTContract.getAllStakeInfoOfUser(userA.address);
    let totalNFTPrincipal = ethers.BigNumber.from(0);
    let totalNFTStakedAmount = ethers.BigNumber.from(0);
    for (let i = 0; i < allStakeInfoOfUser.length; i++) {
      console.log("NFT ID: ", i);
      const principal = allStakeInfoOfUser[i].principal;
      totalNFTPrincipal = totalNFTPrincipal.add(principal);
      console.log("NFT Principal: ", ethers.utils.formatEther(principal));
      const stakedAmount = allStakeInfoOfUser[i].stakedAmount;
      totalNFTStakedAmount = totalNFTStakedAmount.add(stakedAmount);
      console.log("NFT StakedAmount: ", ethers.utils.formatEther(stakedAmount));
    }
    console.log("totalNFTPrincipal   : ", ethers.utils.formatEther(totalNFTPrincipal));
    console.log("totalNFTStakedAmount: ", ethers.utils.formatEther(totalNFTStakedAmount));
    let userABalance = await ethers.provider.getBalance(userA.address);
    console.log("UserA Balance        : ", ethers.utils.formatEther(userABalance));
    // get lp pool balance
    let totalStakedLP = await lpPoolContract.totalStakedAmount();
    console.log("totalStakedLPPool    : ", ethers.utils.formatEther(totalStakedLP));
    // get swap pool balance
    let totalLiquidityInvi = await inviSwapPoolContract.totalLiquidityInvi();
    console.log("totalLiquidityInvi   : ", ethers.utils.formatEther(totalLiquidityInvi));
    let totalLiquidityNative = await inviSwapPoolContract.totalLiquidityNative();
    console.log("totalLiquidityNative : ", ethers.utils.formatEther(totalLiquidityNative));
    // get total Invi Staked userA
    const totalInviStakedUserA = await inviTokenStakeContract.stakedAmount(userA.address);
    console.log("totalInviStakedUserA : ", ethers.utils.formatEther(totalInviStakedUserA));
  });
});
