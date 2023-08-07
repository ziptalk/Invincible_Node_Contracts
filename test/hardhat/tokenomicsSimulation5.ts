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
        iSPTTokenContract,
      } = await deployAll());
    } else {
      console.log("only hardhat test");
    }
  });

  it("Test without liquidity providing or invi staking", async () => {
    if (network !== "hardhat") return; // only hardhat test

    const [deployer, LP1, LP2, LP3, userA, userB, userC] = await ethers.getSigners();

    let tx;
    let receipt;

    //*given
    // LP Pool: 10000
    // User Coin: 100
    // Swap Pool LP: 1000 10000

    const swapNativeToInvi = async (swapAmountRatio: number) => {
      // swap native to invi (user A balance)
      let userABalance = await ethers.provider.getBalance(userA.address);
      const nativeAmountToSwap = userABalance.mul(swapAmountRatio).div(100);
      //console.log("nativeAmountToSwap   : ", ethers.utils.formatEther(nativeAmountToSwap.toString()));
      let expectedAmountOut = await inviSwapPoolContract.getNativeToInviOutAmount(nativeAmountToSwap);
      //console.log("expectedAmountOut    : ", ethers.utils.formatEther(expectedAmountOut.toString()));
      tx = await inviSwapPoolContract.connect(userA).swapNativeToInvi(expectedAmountOut.mul(99).div(100), {
        value: nativeAmountToSwap,
      });
      receipt = await tx.wait();
      userABalance = await ethers.provider.getBalance(userA.address);
      //console.log("UserA Native Balance : ", ethers.utils.formatEther(userABalance));
      let userAInviBalance = await inviTokenContract.balanceOf(userA.address);
      //console.log("UserA Invi Balance   : ", ethers.utils.formatEther(userAInviBalance));
    };

    const swapInviToNative = async (account: any, swapAmountRatio: number) => {
      const getInviTokenBalanceOfAccount = await inviTokenContract.balanceOf(account.address);
      //console.log("userA inviToken Balance   : ", ethers.utils.formatEther(getInviTokenBalanceOfUserA.toString()));
      let inviAmountToSwap = getInviTokenBalanceOfAccount.mul(swapAmountRatio).div(100);
      console.log("inviAmountToSwap          : ", ethers.utils.formatEther(inviAmountToSwap.toString()));
      const getInviToNativeOutMaxInput = await inviSwapPoolContract.getInviToNativeOutMaxInput();
      inviAmountToSwap = inviAmountToSwap.sub(getInviToNativeOutMaxInput).isNegative()
        ? inviAmountToSwap.mul(999).div(1000)
        : getInviToNativeOutMaxInput.mul(999).div(1000);
      console.log("getInviToNativeOutMaxInput: ", ethers.utils.formatEther(getInviToNativeOutMaxInput.toString()));
      console.log("inviAmountToSwap          : ", ethers.utils.formatEther(inviAmountToSwap.toString()));
      let expectedAmountOut = await inviSwapPoolContract.getInviToNativeOutAmount(inviAmountToSwap);
      const swapInviToNative = await inviSwapPoolContract
        .connect(account)
        .swapInviToNative(inviAmountToSwap, expectedAmountOut.mul(99).div(100));
      receipt = await swapInviToNative.wait();
      const accountBalanceAfterSwap = await ethers.provider.getBalance(account.address);
      console.log("Account Balance After Swap  : ", ethers.utils.formatEther(accountBalanceAfterSwap.toString()));
      //console.log("gasUsed: ", receipt.gasUsed.toString());
    };

    console.log("======== Initial Setup =========");
    // regular minting INVI Token
    const regularMinting = await inviTokenContract.connect(deployer).regularMinting();
    await regularMinting.wait();

    // lp 1 and lp 2 provide liquidity of 5000 each
    let lpAmount = ethers.utils.parseEther("50000");
    tx = await provideLiquidity(lpPoolContract, LP1, lpAmount, 0);
    tx = await provideLiquidity(lpPoolContract, LP2, lpAmount, 0);

    // spread INVI to give INVI tokens to LPs
    // get inviRewardInterval
    const inviRewardInterval = await lpPoolContract.inviRewardInterval();
    console.log("inviRewardInterval: ", inviRewardInterval.toString());

    // distribute inviToken reward
    for (let i = 0; i < 20; i++) {
      const lpPoolInviBalance = await inviTokenContract.balanceOf(lpPoolContract.address);
      console.log("lpPool invi balance: ", ethers.utils.formatEther(lpPoolInviBalance));
      const distributeInviTokenReward = await lpPoolContract.connect(deployer).distributeInviTokenReward();
      receipt = await distributeInviTokenReward.wait();
      //console.log("gasUsed: ", receipt.gasUsed.toString());
      // time pass
      await ethers.provider.send("evm_increaseTime", [inviRewardInterval.toNumber()]);
    }
    // claim inviToken reward
    let claimInviTokenReward = await lpPoolContract.connect(LP1).claimInviReward();
    receipt = await claimInviTokenReward.wait();
    console.log("gasUsed: ", receipt.gasUsed.toString());
    claimInviTokenReward = await lpPoolContract.connect(LP2).claimInviReward();
    receipt = await claimInviTokenReward.wait();
    console.log("gasUsed: ", receipt.gasUsed.toString());

    // lp 1  provide liquidity to swap pool 1000 each
    let lp1InviBalance = await inviTokenContract.balanceOf(LP1.address);
    //console.log("lp1 invi balance: ", ethers.utils.formatEther(lp1InviBalance));
    const lpAmountPool: BigNumber = ethers.utils.parseEther("10000");
    const addLiquidity = await inviSwapPoolContract
      .connect(LP1)
      .addLiquidity(lpAmountPool, 1 * units.slippageUnit, { value: lpAmountPool });
    receipt = await addLiquidity.wait();
    //console.log("gasUsed: ", receipt.gasUsed.toString());

    // lp2 swap invi to native
    const lp2InviBalance = await inviTokenContract.balanceOf(LP2.address);
    console.log("lp2 invi balance: ", ethers.utils.formatEther(lp2InviBalance));
    await swapInviToNative(LP2, 2);
    await swapInviToNative(LP2, 2);

    // get liquidity pool balance
    const lpPoolInviBalance = await inviTokenContract.balanceOf(lpPoolContract.address);
    console.log("lpPool invi balance: ", ethers.utils.formatEther(lpPoolInviBalance));
    const lpPoolNativeBalance = await ethers.provider.getBalance(lpPoolContract.address);
    console.log("lpPool native balance: ", ethers.utils.formatEther(lpPoolNativeBalance.toString()));
    // userA sends 9900 ether to lp1
    const userAAmount = ethers.utils.parseEther("99800");
    tx = await userA.sendTransaction({
      to: LP1.address,
      value: userAAmount,
    });
    receipt = await tx.wait();
    console.log("gasUsed: ", receipt.gasUsed.toString());

    // lp2 stakes token to invi Stake

    // transfer 10000 INVI to userA
    tx = await inviTokenContract.connect(LP2).transfer(userA.address, ethers.utils.parseEther("10000"));
    await tx.wait();
    const lp2InviAmount = await inviTokenContract.balanceOf(LP2.address);
    console.log("lp2 invi balance: ", await ethers.utils.formatEther(lp2InviAmount));
    const stakeInviToken = await inviTokenStakeContract.connect(LP2).stake(lp2InviAmount);
    receipt = await stakeInviToken.wait();
    console.log("gasUsed: ", receipt.gasUsed.toString());

    // check Initial Status
    console.log("======== Initial Status =========");
    const initialUserABalance = await ethers.provider.getBalance(userA.address);
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

    const iterate = async (iteration: number) => {
      // Iterate Operation
      console.log("======== Start Iteration =========");
      for (let i = 0; i < iteration; i++) {
        console.log("======== Iteration ", i, " =========");
        console.log("======== Step 1: leverage Stake =========");
        // get userA Balance
        let userABalance = await ethers.provider.getBalance(userA.address);
        console.log("UserA Balance        : ", ethers.utils.formatEther(userABalance));
        let stakeAmount = userABalance.mul(45).div(100);
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
        const maxLendAmount = await lendingPoolContract.connect(userA).getMaxLendAmountByNFT(NFTOwnership[i]);
        console.log("maxLendAmount: ", ethers.utils.formatEther(maxLendAmount.toString()));
        const maxLendAmountWithBoost = await lendingPoolContract.connect(userA).getMaxLendAmountWithBoost(principal);
        console.log("maxLendAmountWithBoost: ", ethers.utils.formatEther(maxLendAmountWithBoost.toString()));
        // lend NFT
        const lend = await lendingPoolContract.connect(userA).lend(NFTOwnership[i], maxLendAmountWithBoost);
        await lend.wait();

        console.log("======== Step 4: Swap INVI to Klay =========");
        await swapInviToNative(userA, 1);
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
        console.log("NFT ID             : ", i);
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
      // get total Invi Staked userA
      let totalInviStakedUserA = await inviTokenStakeContract.stakedAmount(userA.address);
      console.log("totalInviStakedUserA : ", ethers.utils.formatEther(totalInviStakedUserA));
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
      // send 100 native to userA
      tx = await deployer.sendTransaction({
        to: userA.address,
        value: ethers.utils.parseEther("200"),
      });
      await tx.wait();

      // pass time by 10 seconds
      await ethers.provider.send("evm_increaseTime", [10]);
      await swapNativeToInvi(95);
      //console.log("gasUsed              : ", receipt.gasUsed.toString());
      // get user nft list
      const userNFTList = await stakeNFTContract.getNFTOwnership(userA.address);
      console.log("userNFTList          : ", userNFTList);
      // send 10 eth to userA for tx fee
      tx = await deployer.sendTransaction({
        to: userA.address,
        value: ethers.utils.parseEther("1"),
      });
      let userAInviBalance = await inviTokenContract.balanceOf(userA.address);
      console.log("UserA Invi Balance   : ", ethers.utils.formatEther(userAInviBalance));
      let userABalance = await ethers.provider.getBalance(userA.address);
      console.log("UserA Native Balance : ", ethers.utils.formatEther(userABalance));
      // return all nfts
      for (let i = userNFTList.length - 1; i > 0; i--) {
        console.log("nft ID: ", i);
        let gasPrice = 100000000;
        let gasLimit = 1000000;

        await swapNativeToInvi(95);
        userAInviBalance = await inviTokenContract.balanceOf(userA.address);
        console.log("===== balance after repay =====");
        console.log("UserA Invi Balance   : ", ethers.utils.formatEther(userAInviBalance));
        userABalance = await ethers.provider.getBalance(userA.address);
        console.log("UserA Native Balance : ", ethers.utils.formatEther(userABalance));
        try {
          let tx = await lendingPoolContract.connect(userA).repay(i);
          await tx.wait();
        } catch (e) {
          console.log("Repay error");
        }
        userAInviBalance = await inviTokenContract.balanceOf(userA.address);
        //console.log("UserA Invi Balance   : ", ethers.utils.formatEther(userAInviBalance));
        userABalance = await ethers.provider.getBalance(userA.address);
        //console.log("UserA Native Balance : ", ethers.utils.formatEther(userABalance));
        //console.log("gasUsed              : ", receipt.gasUsed.toString());

        // boostUnlock
        tx = await inviCoreContract.connect(userA).boostUnlock(i);
        await tx.wait();

        try {
          tx = await inviCoreContract.connect(userA).repayNFT(i, {
            gasPrice: gasPrice,
            gasLimit: gasLimit,
          });
          await tx.wait();
          console.log("repay success");
        } catch (e) {
          console.log("Repay NFT error");
        }
        // claim and split unstaked amount (core)
        tx = await inviCoreContract.connect(deployer).claimAndSplitUnstakedAmount();
        await tx.wait();
        // claim unstaked amount
        tx = await inviCoreContract.connect(userA).claimUnstaked();
        await tx.wait();
        userAInviBalance = await inviTokenContract.balanceOf(userA.address);
        console.log("UserA Invi Balance   : ", ethers.utils.formatEther(userAInviBalance));
        userABalance = await ethers.provider.getBalance(userA.address);
        console.log("UserA Native Balance : ", ethers.utils.formatEther(userABalance));
      }

      let totalLiquidityInvi = await inviSwapPoolContract.totalLiquidityInvi();
      //console.log("totalLiquidityInvi   : ", ethers.utils.formatEther(totalLiquidityInvi));
      let totalLiquidityNative = await inviSwapPoolContract.totalLiquidityNative();
      //console.log("totalLiquidityNative : ", ethers.utils.formatEther(totalLiquidityNative));

      //   await swapInviToNative(95);

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
      // get total Invi Staked userA
      let totalInviStakedUserA = await inviTokenStakeContract.stakedAmount(userA.address);
      console.log("totalInviStakedUserA : ", ethers.utils.formatEther(totalInviStakedUserA));
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
    };

    await iterate(50);
    await checkStatus();
    await startUnstake();
  });
});
