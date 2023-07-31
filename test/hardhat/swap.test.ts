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

describe("Invi core service test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let stTokenContract: Contract;
  let lendingPoolContract: Contract;
  let inviTokenContract: Contract;
  let inviTokenStakeContract: Contract;
  let inviSwapPoolContract: Contract;
  let iSPTTokenContract: Contract;

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
        iSPTTokenContract,
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

    //* given - INVI Token
    // Regular Minting
    console.log("step 0");
    const regularMinting = await inviTokenContract.connect(deployer).regularMinting();
    await regularMinting.wait();

    // provide lp
    const lpAmount: BigNumber = ethers.utils.parseEther("1000");
    await provideLiquidity(lpPoolContract, LP, lpAmount, nonceLP); // lp stake
    await provideLiquidity(lpPoolContract, userB, lpAmount, nonceUserB); // lp stake
    console.log("provided liquidity LP / userB");

    // get inviRewardInterval
    const inviRewardInterval = await lpPoolContract.inviRewardInterval();
    console.log("inviRewardInterval: ", inviRewardInterval.toString());

    // distribute inviToken reward
    for (let i = 0; i < 10; i++) {
      const distributeInviTokenReward = await lpPoolContract.connect(deployer).distributeInviTokenReward();
      await distributeInviTokenReward.wait();
      // time pass
      await ethers.provider.send("evm_increaseTime", [inviRewardInterval.toNumber()]);
    }
    // claim inviToken
    const claimInviTokenLP = await lpPoolContract.connect(LP).claimInviReward();
    await claimInviTokenLP.wait();
    const claimInviTokenUserB = await lpPoolContract.connect(userB).claimInviReward();
    await claimInviTokenUserB.wait();
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
    const lpAmountPool: BigNumber = ethers.utils.parseEther("1000");
    // get native amount
    const nativeAmount = await inviSwapPoolContract.connect(LP).getAddLiquidityNative(lpAmountPool);
    console.log("required native amount: ", ethers.utils.formatEther(nativeAmount.toString()));
    const getCurrentBalance = await ethers.provider.getBalance(LP.address);
    console.log("getCurrentBalance     : ", ethers.utils.formatEther(getCurrentBalance.toString()));
    const addLiquidity = await inviSwapPoolContract
      .connect(LP)
      .addLiquidity(lpAmount, 1 * units.slippageUnit, { value: nativeAmount });
    await addLiquidity.wait();
    await getSwapPoolStatus(inviSwapPoolContract, inviTokenContract, deployer);

    const testIteration = 10;
    const swapSimulation = async () => {
      // Step 2. Swap Native to INVI (iterate 10 times)
      console.log("======Step 2");
      for (let i = 0; i < 10; i++) {
        const getNativeToInviOutMaxInput: BigNumber = await inviSwapPoolContract.getNativeToInviOutMaxInput();
        console.log("getNativeToInviOutMaxInput: ", ethers.utils.formatEther(getNativeToInviOutMaxInput.toString()));
        const nativeBalanceUserA = await ethers.provider.getBalance(userA.address);
        console.log("nativeBalanceUserA        : ", ethers.utils.formatEther(nativeBalanceUserA.toString()));
        const nativeAmountToSwap = !getNativeToInviOutMaxInput.sub(nativeBalanceUserA).isNegative()
          ? nativeBalanceUserA.mul(50).div(100)
          : getNativeToInviOutMaxInput.mul(50).div(100);

        console.log("nativeAmountToSwap        : ", ethers.utils.formatEther(nativeAmountToSwap.toString()));
        const expectedAmountOut = await inviSwapPoolContract.getNativeToInviOutAmount(nativeAmountToSwap);
        const swapNativeToInvi = await inviSwapPoolContract
          .connect(userA)
          .swapNativeToInvi(expectedAmountOut.mul(99).div(100), { value: nativeAmountToSwap });
        await swapNativeToInvi.wait();
        await getSwapPoolStatus(inviSwapPoolContract, inviTokenContract, deployer);
      }

      // Step3. Claim INVI Rewards
      console.log("======Step 3");
      // get totalProvided lp
      const totalProvidedLP = await inviSwapPoolContract.lpLiquidityInvi(LP.address);
      console.log("totalProvidedLP: ", ethers.utils.formatEther(totalProvidedLP.toString()));
      // get inviToken Balance
      const inviTokenBalanceOfSwapPool = await inviTokenContract.balanceOf(inviSwapPoolContract.address);
      console.log("inviTokenBalanceOfSwapPool: ", ethers.utils.formatEther(inviTokenBalanceOfSwapPool.toString()));
      // get reward amount
      const inviRewardAmount = await inviSwapPoolContract.lpRewardInvi(LP.address);
      console.log("inviRewardAmount: ", ethers.utils.formatEther(inviRewardAmount.toString()));
      const totalRewardInvi = await inviSwapPoolContract.totalRewardInvi();
      console.log("totalRewardInvi: ", ethers.utils.formatEther(totalRewardInvi.toString()));
      // get Invi balance of userA
      const inviBalanceOfLP = await inviTokenContract.balanceOf(LP.address);
      const withdrawFees = await inviSwapPoolContract.connect(LP).withdrawFees();
      await withdrawFees.wait();
      const inviBalanceOfLPAfterWithdrawFees = await inviTokenContract.balanceOf(LP.address);
      console.log("inviBalanceOfLP: ", ethers.utils.formatEther(inviBalanceOfLP.toString()));
      console.log(
        "inviBalanceOfUserAAfterWithdrawFees: ",
        ethers.utils.formatEther(inviBalanceOfLPAfterWithdrawFees.toString())
      );

      // Step4. Swap invi to Native (iterate 10 times)
      console.log("======Step 4");
      const inviTokenBalanceUserB: BigNumber = await inviTokenContract.balanceOf(userB.address);
      console.log("invi token balance userB: ", ethers.utils.formatEther(inviTokenBalanceUserB.toString()));
      const lpAmountUserB: BigNumber = inviTokenBalanceUserB.mul(50).div(100);
      // get native amount
      const nativeAmountUserB = await inviSwapPoolContract.connect(LP).getAddLiquidityNative(lpAmountUserB);
      console.log("require invi amount   : ", ethers.utils.formatEther(lpAmountUserB.toString()));
      console.log("required native amount: ", ethers.utils.formatEther(nativeAmountUserB.toString()));

      const addLiquidityUserB = await inviSwapPoolContract
        .connect(userB)
        .addLiquidity(lpAmountUserB, 1 * units.slippageUnit, { value: nativeAmountUserB });
      await addLiquidityUserB.wait();
      await getSwapPoolStatus(inviSwapPoolContract, inviTokenContract, deployer);

      for (let i = 0; i < 10; i++) {
        const getInviTokenBalanceOfUserA = await inviTokenContract.balanceOf(userA.address);
        console.log("userA inviToken Balance   : ", ethers.utils.formatEther(getInviTokenBalanceOfUserA.toString()));
        const getInviToNativeOutMaxInput = await inviSwapPoolContract.getInviToNativeOutMaxInput();
        const inviAmountToSwap = getInviTokenBalanceOfUserA.sub(getInviToNativeOutMaxInput).isNegative()
          ? getInviTokenBalanceOfUserA.mul(50).div(100)
          : getInviToNativeOutMaxInput.mul(50).div(100);
        console.log("getInviToNativeOutMaxInput: ", ethers.utils.formatEther(getInviToNativeOutMaxInput.toString()));
        const expectedAmountOut = await inviSwapPoolContract.getInviToNativeOutAmount(inviAmountToSwap);
        const swapInviToNative = await inviSwapPoolContract
          .connect(userA)
          .swapInviToNative(inviAmountToSwap, expectedAmountOut.mul(99).div(100));
        await swapInviToNative.wait();
        await getSwapPoolStatus(inviSwapPoolContract, inviTokenContract, deployer);
      }
    };

    for (let i = 0; i < testIteration; i++) {
      console.log("=================Iteration: ", i + 1, "=================");
      await swapSimulation();
    }

    // Get results
    const isptBalanceLP = await iSPTTokenContract.balanceOf(LP.address);
    console.log("isptBalanceLP: ", ethers.utils.formatEther(isptBalanceLP.toString()));
    const isptBalanceUserB = await iSPTTokenContract.balanceOf(userB.address);
    console.log("isptBalanceUserB: ", ethers.utils.formatEther(isptBalanceUserB.toString()));

    // remove liquidities
  });
});
