import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
const { expectRevert } = require("@openzeppelin/test-helpers");
import hre from "hardhat";
import { units } from "../units";
import { leverageStake } from "../utils";
import { getTestAddress } from "../getTestAddress";
import { deployAll } from "../../scripts/deploy/deployAll";

describe("Invi Burning Test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let inviSwapPoolContract: Contract;
  let inviTokenContract: Contract;
  let lendingPoolContract: Contract;

  const network: string = hre.network.name;
  const testAddresses: any = getTestAddress(network);

  this.beforeAll(async function () {
    // for testnet test
    if (network === "hardhat") {
      return; // test only for actual testnet
    } else {
      inviCoreContract = await ethers.getContractAt("InviCore", testAddresses.inviCoreContractAddress);
      stakeNFTContract = await ethers.getContractAt("StakeNFT", testAddresses.stakeNFTContractAddress);
      lpPoolContract = await ethers.getContractAt("LiquidityProviderPool", testAddresses.lpPoolContractAddress);
      inviSwapPoolContract = await ethers.getContractAt("InviSwapPool", testAddresses.inviSwapPoolContractAddress);
      inviTokenContract = await ethers.getContractAt("InviToken", testAddresses.inviTokenContractAddress);
      lendingPoolContract = await ethers.getContractAt("LendingPool", testAddresses.lendingPoolContractAddress);
    }
  });

  it("Test without liquidity providing or invi staking", async () => {
    const [deployer, LP1, LP2, LP3, userA, userB, userC] = await ethers.getSigners();
    console.log(LP1.address);
    console.log(userA.address);
    let standardAmount: BigNumber = ethers.utils.parseEther("0.1");
    let tx;
    let receipt;
    let totalGasUsed: number = 0;
    //*given
    // LP Pool: 10000
    // User Coin: 100
    // Swap Pool LP: 1000 1000

    const swapNativeToInvi = async (amount: BigNumber) => {
      let expectedAmountOut = await inviSwapPoolContract.getNativeToInviOutAmount(amount);
      expectedAmountOut = expectedAmountOut[0].sub(expectedAmountOut[1]);
      //console.log("expectedAmountOut    : ", ethers.utils.formatEther(expectedAmountOut.toString()));
      tx = await inviSwapPoolContract.connect(userA).swapNativeToInvi(expectedAmountOut.mul(99).div(100), {
        value: amount,
      });
      receipt = await tx.wait();
    };

    const swapInviToNative = async (amount: BigNumber) => {
      let inviAmountToSwap = amount;
      console.log("inviAmountToSwap          : ", ethers.utils.formatEther(inviAmountToSwap.toString()));
      const getInviToNativeOutMaxInput = await inviSwapPoolContract.getInviToNativeOutMaxInput();
      inviAmountToSwap = inviAmountToSwap.sub(getInviToNativeOutMaxInput).isNegative()
        ? inviAmountToSwap.mul(999).div(1000)
        : getInviToNativeOutMaxInput.mul(999).div(1000);
      console.log("getInviToNativeOutMaxInput: ", ethers.utils.formatEther(getInviToNativeOutMaxInput.toString()));
      console.log("inviAmountToSwap          : ", ethers.utils.formatEther(inviAmountToSwap.toString()));
      let expectedAmountOut = await inviSwapPoolContract.getInviToNativeOutAmount(inviAmountToSwap);
      expectedAmountOut = expectedAmountOut[0].sub(expectedAmountOut[1]);
      const swapInviToNative = await inviSwapPoolContract
        .connect(userA)
        .swapInviToNative(inviAmountToSwap, expectedAmountOut.mul(99).div(100));
      receipt = await swapInviToNative.wait();
      const userABalanceAfterSwap = await ethers.provider.getBalance(userA.address);
      console.log("userA Balance After Swap  : ", ethers.utils.formatEther(userABalanceAfterSwap.toString()));
      //console.log("gasUsed: ", receipt.gasUsed.toString());
    };

    // check Initial Status
    console.log("======== Initial Status =========");
    let initialUserABalance = await ethers.provider.getBalance(userA.address);
    console.log("UserA Balance        : ", ethers.utils.formatEther(initialUserABalance));
    const initialUserAInviBalance = await inviTokenContract.balanceOf(userA.address);
    console.log("UserA INVI Balance   : ", ethers.utils.formatEther(initialUserAInviBalance));
    // get lp pool balance
    const initialTotalStakedLP = await lpPoolContract.totalStakedAmount();
    console.log("totalStakedLPPool    : ", ethers.utils.formatEther(initialTotalStakedLP));
    // get swap pool balance
    const initialTotalLiquidityInvi = await inviSwapPoolContract.totalLiquidityInvi();
    console.log("totalLiquidityInvi   : ", ethers.utils.formatEther(initialTotalLiquidityInvi));
    const initialTotalLiquidityNative = await inviSwapPoolContract.totalLiquidityNative();
    console.log("totalLiquidityNative : ", ethers.utils.formatEther(initialTotalLiquidityNative));

    const iterate = async (iteration: number, account: any) => {
      // Iterate Operation
      console.log("======== Start Iteration =========");
      for (let i = 0; i < iteration; i++) {
        console.log("======== Iteration ", i, " =========");
        console.log("======== Step 1: leverage Stake =========");
        // get userA Balance
        let accountBalance = await ethers.provider.getBalance(account.address);
        console.log("Account Balance        : ", ethers.utils.formatEther(accountBalance));
        let stakeAmount = standardAmount;
        // get max leverage ratio
        const leverageNone = BigNumber.from(units.leverageUnit.toString());
        console.log("leverage     : ", leverageNone);
        // get min lock period
        const minLockPeriod = await inviCoreContract.functions.getLockPeriod(leverageNone);

        // leverage Stake
        try {
          await leverageStake(
            inviCoreContract,
            userA,
            stakeAmount,
            units.leverageUnit,
            parseFloat(minLockPeriod.toString()),
            0
          );
        } catch (e) {
          console.log(e);
        }

        console.log("======== Step 2: lend NFT =========");
        // get NFTOwnership
        const NFTOwnership = await stakeNFTContract.connect(account).getNFTOwnership(account.address);
        console.log("NFTOwnership: ", NFTOwnership.toString());
        // get principal
        // get NFT principals of UserA
        const allStakeInfoOfUser = await stakeNFTContract.getAllStakeInfoOfUser(account.address);

        // console.log("NFT ID: ", NFTOwnership[i].toString());
        const principal = allStakeInfoOfUser[i].principal;
        console.log("NFT Principal: ", ethers.utils.formatEther(principal));
        const stakedAmount = allStakeInfoOfUser[i].stakedAmount;
        console.log("NFT StakedAmount: ", ethers.utils.formatEther(stakedAmount));
        // get max lend amount
        const maxLendAmount = await lendingPoolContract.connect(account).getMaxLendAmountByNFT(NFTOwnership[i]);
        console.log("maxLendAmountByNFT: ", ethers.utils.formatEther(maxLendAmount.toString()));
        const maxLendAmountWithBoost = await lendingPoolContract.connect(account).getMaxLendAmountWithBoost(principal);
        console.log("maxLendAmountWithBoost: ", ethers.utils.formatEther(maxLendAmountWithBoost.toString()));
        try {
          // lend NFT
          const lend = await lendingPoolContract.connect(account).lend(NFTOwnership[i], maxLendAmountWithBoost);
          await lend.wait();
        } catch (e) {
          console.log("lend error: ", e);
        }
        console.log("======== Step 4: Swap INVI to Klay =========");
        let inviAmountToSwap: BigNumber = standardAmount;
        while (1) {
          // get expected amounts out inviToNative
          let expectedAmountOut = await inviSwapPoolContract.getInviToNativeOutAmount(inviAmountToSwap);
          console.log("expected amount out: ", ethers.utils.formatEther(expectedAmountOut[0].toString()));
          if (expectedAmountOut[0].sub(stakeAmount) > 0) {
            break;
          } else {
            inviAmountToSwap = inviAmountToSwap.mul(10).div(9);
          }
        }
        try {
          // swap INVI to KLAY
          await swapInviToNative(inviAmountToSwap);
        } catch {
          console.log("swap error");
        }

        let totalLiquidityInvi = await inviSwapPoolContract.totalLiquidityInvi();
        console.log("totalLiquidityInvi   : ", ethers.utils.formatEther(totalLiquidityInvi));
        let totalLiquidityNative = await inviSwapPoolContract.totalLiquidityNative();
        console.log("totalLiquidityNative : ", ethers.utils.formatEther(totalLiquidityNative));
      }
    };

    const checkStatus = async () => {
      // check Initial Status
      console.log("======== Initial Status =========");
      console.log("UserA Balance        : ", ethers.utils.formatEther(initialUserABalance));
      // get lp pool balance
      console.log("totalStakedLPPool    : ", ethers.utils.formatEther(initialTotalStakedLP));
      // get swap pool balance
      console.log("totalLiquidityInvi   : ", ethers.utils.formatEther(initialTotalLiquidityInvi));
      console.log("totalLiquidityNative : ", ethers.utils.formatEther(initialTotalLiquidityNative));

      // check Final Status
      console.log("======== Current Status =========");
      // get NFT principals of UserA
      const allStakeInfoOfUser = await stakeNFTContract.getAllStakeInfoOfUser(userA.address);
      let totalNFTPrincipal = ethers.BigNumber.from(0);
      let totalNFTStakedAmount = ethers.BigNumber.from(0);
      for (let i = 0; i < allStakeInfoOfUser.length; i++) {
        console.log("NFT                : ", i);
        const principal = allStakeInfoOfUser[i].principal;
        totalNFTPrincipal = totalNFTPrincipal.add(principal);
        console.log("NFT Principal      : ", ethers.utils.formatEther(principal));
        const stakedAmount = allStakeInfoOfUser[i].stakedAmount;
        totalNFTStakedAmount = totalNFTStakedAmount.add(stakedAmount);
        console.log("NFT StakedAmount   : ", ethers.utils.formatEther(stakedAmount));
        // const lockPeriod = allStakeInfoOfUser[i].lockPeriod;
        // console.log("NFT LockPeriod     : ", lockPeriod.toString());
        // const lockStart = allStakeInfoOfUser[i].lockStart;
        // console.log("NFT LockStart      : ", lockStart.toString());
        // const lockEnd = allStakeInfoOfUser[i].lockEnd;
        // console.log("NFT LockEnd        : ", lockEnd.toString());
      }
      console.log("totalNFTPrincipal    : ", ethers.utils.formatEther(totalNFTPrincipal));
      console.log("totalNFTStakedAmount : ", ethers.utils.formatEther(totalNFTStakedAmount));
      let userABalance = await ethers.provider.getBalance(userA.address);
      console.log("UserA Native Balance : ", ethers.utils.formatEther(userABalance));
      let userAInviBalance = await inviTokenContract.balanceOf(userA.address);
      console.log("UserA Invi Balance   : ", ethers.utils.formatEther(userAInviBalance));
      // get lp pool balance
      let totalStakedLP = await lpPoolContract.totalStakedAmount();
      console.log("totalStakedLPPool    : ", ethers.utils.formatEther(totalStakedLP));
      // get swap pool balance
      let totalLiquidityInvi = await inviSwapPoolContract.totalLiquidityInvi();
      console.log("totalLiquidityInvi   : ", ethers.utils.formatEther(totalLiquidityInvi));
      let totalLiquidityNative = await inviSwapPoolContract.totalLiquidityNative();
      console.log("totalLiquidityNative : ", ethers.utils.formatEther(totalLiquidityNative));

      // get total staked amount
      let totalStakedAmount = await inviCoreContract.getTotalStakedAmount();
      console.log("totalStakedAmount    : ", ethers.utils.formatEther(totalStakedAmount));
      // get lpPool total lent amount
      let totalLentAmount = await lpPoolContract.totalLentAmount();
      console.log("totalLentAmount      : ", ethers.utils.formatEther(totalLentAmount));
      // get lp1 swap pool reward
      let lp1NativeReward = await inviSwapPoolContract.lpRewardNative(LP1.address);
      console.log("lp1NativeReward      : ", ethers.utils.formatEther(lp1NativeReward));
      let lp1InviReward = await inviSwapPoolContract.lpRewardInvi(LP1.address);
      console.log("lp1InviReward        : ", ethers.utils.formatEther(lp1InviReward));
    };

    const startUnstake = async () => {
      //=============== Give Rewards and start unstake ===============//
      console.log("======== start unstake =========");
      // get user nft list
      const userNFTList = await stakeNFTContract.getNFTOwnership(userA.address);
      console.log("userNFTList          : ", userNFTList);
      let userAInviBalance = await inviTokenContract.balanceOf(userA.address);
      console.log("UserA Invi Balance   : ", ethers.utils.formatEther(userAInviBalance));
      let userABalance = await ethers.provider.getBalance(userA.address);
      console.log("UserA Native Balance : ", ethers.utils.formatEther(userABalance));
      // return all nfts
      for (let i = userNFTList.length - 1; i >= 0; i--) {
        console.log("nft ID: ", userNFTList[i].toString());
        let nativeAmountToSwap = standardAmount;
        while (1) {
          // get expected amounts out inviToNative
          let expectedAmountOut = await inviSwapPoolContract.getNativeToInviOutAmount(nativeAmountToSwap);
          if (expectedAmountOut[0].sub(nativeAmountToSwap)) {
            break;
          } else {
            nativeAmountToSwap = nativeAmountToSwap.mul(5).div(4);
          }
        }
        try {
          await swapNativeToInvi(nativeAmountToSwap);
        } catch (e) {
          console.log("Swap Native to Invi error");
        }

        try {
          let tx = await lendingPoolContract.connect(userA).repay(userNFTList[i]);
          await tx.wait();
        } catch (e) {
          console.log("Repay error", e);
        }
        userAInviBalance = await inviTokenContract.balanceOf(userA.address);
        //console.log("UserA Invi Balance   : ", ethers.utils.formatEther(userAInviBalance));
        userABalance = await ethers.provider.getBalance(userA.address);
        //console.log("UserA Native Balance : ", ethers.utils.formatEther(userABalance));
        //console.log("gasUsed              : ", receipt.gasUsed.toString());

        try {
          // boostUnlock
          tx = await inviCoreContract.connect(userA).boostUnlock(userNFTList[i]);
          await tx.wait();
        } catch (e) {
          console.log("Boost Unlock error");
        }

        try {
          tx = await inviCoreContract.connect(userA).repayNFT(userNFTList[i]);
          await tx.wait();
          console.log("repay success");
        } catch (e) {
          console.log("Repay NFT error", e);
        }

        try {
          // claim unstaked amount
          tx = await inviCoreContract.connect(userA).claimUnstaked();
          await tx.wait();
        } catch (e) {
          console.log("Claim error");
        }
        userAInviBalance = await inviTokenContract.balanceOf(userA.address);
        console.log("UserA Invi Balance   : ", ethers.utils.formatEther(userAInviBalance));
        userABalance = await ethers.provider.getBalance(userA.address);
        console.log("UserA Native Balance : ", ethers.utils.formatEther(userABalance));
      }

      let totalLiquidityInvi = await inviSwapPoolContract.totalLiquidityInvi();
      //console.log("totalLiquidityInvi   : ", ethers.utils.formatEther(totalLiquidityInvi));
      let totalLiquidityNative = await inviSwapPoolContract.totalLiquidityNative();
      //console.log("totalLiquidityNative : ", ethers.utils.formatEther(totalLiquidityNative));

      // get status
      console.log("======== Final Status after returning nfts =========");
      userABalance = await ethers.provider.getBalance(userA.address);
      console.log("UserA Native Balance : ", ethers.utils.formatEther(userABalance));
      userAInviBalance = await inviTokenContract.balanceOf(userA.address);
      console.log("UserA Invi Balance   : ", ethers.utils.formatEther(userAInviBalance));
      // get lp pool balance
      let totalStakedLP = await lpPoolContract.totalStakedAmount();
      console.log("totalStakedLPPool    : ", ethers.utils.formatEther(totalStakedLP));
      // get swap pool balance
      totalLiquidityInvi = await inviSwapPoolContract.totalLiquidityInvi();
      console.log("totalLiquidityInvi   : ", ethers.utils.formatEther(totalLiquidityInvi));
      totalLiquidityNative = await inviSwapPoolContract.totalLiquidityNative();
      console.log("totalLiquidityNative : ", ethers.utils.formatEther(totalLiquidityNative));
      // get total staked amount
      let totalStakedAmount = await inviCoreContract.getTotalStakedAmount();
      console.log("totalStakedAmount    : ", ethers.utils.formatEther(totalStakedAmount));
      // get lpPool total lent amount
      let totalLentAmount = await lpPoolContract.totalLentAmount();
      console.log("totalLentAmount      : ", ethers.utils.formatEther(totalLentAmount));
      // get lp1 swap pool reward
      let lp1NativeReward = await inviSwapPoolContract.lpRewardNative(LP1.address);
      console.log("lp1NativeSwapReward  : ", ethers.utils.formatEther(lp1NativeReward));
      let lp1InviReward = await inviSwapPoolContract.lpRewardInvi(LP1.address);
      console.log("lp1InviSwapReward    : ", ethers.utils.formatEther(lp1InviReward));
      let lp1LpReward = await lpPoolContract.nativeRewardAmount(LP1.address);
      console.log("lp1LpReward          : ", ethers.utils.formatEther(lp1LpReward));
      let totalBurntAmount = await inviTokenContract.totalBurntAmount();
      console.log("totalBurntAmount     : ", ethers.utils.formatEther(totalBurntAmount));
      let swapPoolNativeBalance = await ethers.provider.getBalance(inviSwapPoolContract.address);
      console.log("swapPoolNativeBalance: ", ethers.utils.formatEther(swapPoolNativeBalance));
    };

    // iteration
    let iterateCount: number = 50;
    for (let i = 0; i < iterateCount; i++) {
      try {
        await iterate(10, userA);
      } catch (e) {
        console.log("iterate error", e);
      }
      try {
        await checkStatus();
      } catch (e) {
        console.log("checkStatus error", e);
      }
      try {
        await startUnstake();
      } catch (e) {
        console.log("startUnstake error", e);
      }
    }
  });
});
