import { BigNumber, Contract } from "ethers";
import hre, { ethers } from "hardhat";
import { units } from "../units";
import { getSwapPoolStatus, provideLiquidity } from "../utils";

export const swapSimulation = async (
  inviSwapPoolContract: Contract,
  inviTokenContract: Contract,
  deployer: any,
  LP: any,
  userA: any,
  userB: any
) => {
  let receipt: any;
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
    receipt = await swapNativeToInvi.wait();
    console.log("gasUsed: ", receipt.gasUsed.toString());

    await getSwapPoolStatus(inviSwapPoolContract, inviTokenContract, deployer);
  }

  // Step3. Claim INVI Rewards
  console.log("======Step 3");
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
  let totalLiquidityNative = await inviSwapPoolContract.totalLiquidityNative();
  console.log("totalLiquidityNative : ", ethers.utils.formatEther(totalLiquidityNative.toString()));
  let currentBalance = await ethers.provider.getBalance(inviSwapPoolContract.address);
  console.log("currentBalance       : ", ethers.utils.formatEther(currentBalance.toString()));
  const withdrawFees = await inviSwapPoolContract.connect(LP).withdrawFees();
  receipt = await withdrawFees.wait();
  console.log("gasUsed: ", receipt.gasUsed.toString());

  const inviBalanceOfLPAfterWithdrawFees = await inviTokenContract.balanceOf(LP.address);
  console.log("inviBalanceOfLP: ", ethers.utils.formatEther(inviBalanceOfLP.toString()));
  console.log(
    "inviBalanceOfUserAAfterWithdrawFees: ",
    ethers.utils.formatEther(inviBalanceOfLPAfterWithdrawFees.toString())
  );
  totalLiquidityNative = await inviSwapPoolContract.totalLiquidityNative();
  console.log("totalLiquidityNative : ", ethers.utils.formatEther(totalLiquidityNative.toString()));
  currentBalance = await ethers.provider.getBalance(inviSwapPoolContract.address);
  console.log("currentBalance       : ", ethers.utils.formatEther(currentBalance.toString()));

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
  receipt = await addLiquidityUserB.wait();
  console.log("gasUsed: ", receipt.gasUsed.toString());

  await getSwapPoolStatus(inviSwapPoolContract, inviTokenContract, deployer);
  console.log("======Start Iteration======");
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
    receipt = await swapInviToNative.wait();
    console.log("gasUsed: ", receipt.gasUsed.toString());

    await getSwapPoolStatus(inviSwapPoolContract, inviTokenContract, deployer);
  }
};
