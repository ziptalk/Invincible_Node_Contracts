import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "ethers";
import { units } from "../units";
import { ethers as hardhatEthers } from "hardhat";

type SignerWithAddress = ethers.Signer & { getAddress: () => Promise<string> };

export const provideLiquidity = async (lpPoolContract: Contract, user: SignerWithAddress, amount: BigNumber) => {
  try {
    let tx = await lpPoolContract.connect(user).stake({ value: amount });
    await tx.wait();
  } catch (e) {
    console.log("provideLiquidity failed at ", e);
  }
};

export const leverageStake = async (
  inviCoreContract: Contract,
  user: SignerWithAddress,
  principal: BigNumber,
  leverageRatio: number,
  lockPeriod: number
) => {
  const slippage = 3 * units.slippageUnit;
  let tx = await inviCoreContract
    .connect(user)
    .stake(principal, leverageRatio, lockPeriod, slippage, { value: principal });
  // console.log(tx);
  await tx.wait();
};

export const verifyRequest = async (request: any, recipient: string, amount: number, fee: number, type: number) => {
  expect(request.recipient).to.equal(recipient);
  expect(request.amount).to.equal(amount);
  expect(request.fee).to.equal(fee);
  expect(request.requestType).to.equal(type);
};

export const checkUnstakeRequests = async (inviCoreContract: Contract, user: SignerWithAddress) => {
  // get unstake requests
  const unstakeRequestFront = await inviCoreContract.connect(user).unstakeRequestsFront();
  const unstakeRequestRear = await inviCoreContract.connect(user).unstakeRequestsRear();
  console.log("unstakeRequestFront        : ", unstakeRequestFront.toString());
  console.log("unstakeRequestRear         : ", unstakeRequestRear.toString());

  for (let i = unstakeRequestFront; i < unstakeRequestRear; i++) {
    const unstakeRequest = await inviCoreContract.connect(user).unstakeRequests(i);
    console.log("unstakeRequest             : ", unstakeRequest.toString());
  }

  const unstakeRequestAmount = await inviCoreContract.connect(user).unstakeRequestAmount();
  console.log("unstakeRequestAmount       : ", ethers.utils.formatEther(unstakeRequestAmount.toString()));
};

export const checkUnstakeRequestLPP = async (lpPoolContract: Contract, user: SignerWithAddress) => {
  // get unstake requests
  const unstakeRequestFront = await lpPoolContract.connect(user).unstakeRequestsFront();
  const unstakeRequestRear = await lpPoolContract.connect(user).unstakeRequestsRear();
  console.log("unstakeRequestFront        : ", unstakeRequestFront.toString());
  console.log("unstakeRequestRear         : ", unstakeRequestRear.toString());

  for (let i = unstakeRequestFront; i < unstakeRequestRear; i++) {
    const unstakeRequest = await lpPoolContract.connect(user).unstakeRequests(i);
    console.log("unstakeRequest             : ", unstakeRequest.toString());
  }

  const totalUnstakeRequestAmount = await lpPoolContract.connect(user).totalUnstakeRequestAmount();
  console.log("totalUnstakeRequestAmount       : ", ethers.utils.formatEther(totalUnstakeRequestAmount.toString()));
};

export const claimAndSplitCore = async (
  inviCoreContract: Contract,
  lpPoolContract: Contract,
  user: SignerWithAddress
) => {
  const claimAndSplit = await inviCoreContract.connect(user).claimAndSplitUnstakedAmount();
  await claimAndSplit.wait();

  // check inviCore balance
  const inviCoreBalance = await hardhatEthers.provider.getBalance(inviCoreContract.address);
  console.log("inviCoreBalance            : ", ethers.utils.formatEther(inviCoreBalance.toString()));
  // check lpPool balance
  const lpPoolBalance = await hardhatEthers.provider.getBalance(lpPoolContract.address);
  console.log("lpPoolBalance              : ", ethers.utils.formatEther(lpPoolBalance.toString()));
};

export const splitUnstakedLPP = async (lpPoolContract: Contract, user: SignerWithAddress) => {
  // get unstake requests
  const unstakeRequestFront = await lpPoolContract.connect(user).unstakeRequestsFront();
  const unstakeRequestRear = await lpPoolContract.connect(user).unstakeRequestsRear();
  if (unstakeRequestFront == unstakeRequestRear) return;

  const claimAndSplit = await lpPoolContract.connect(user).splitUnstakedAmount();
  await claimAndSplit.wait();

  // check lpPool balance
  const lpPoolBalance = await hardhatEthers.provider.getBalance(lpPoolContract.address);
  console.log("lpPoolBalance              : ", ethers.utils.formatEther(lpPoolBalance.toString()));
};

export const checkOverallStatus = async (
  inviCoreContract: Contract,
  lpPoolContract: Contract,
  stakeNFTContract: Contract,
  stTokenContract: Contract,
  user: SignerWithAddress
) => {
  console.log("===============Overall Status=================");
  const coreTotalStakedAmount = await inviCoreContract.connect(user).getTotalStakedAmount();
  console.log("coreTotalStakedAmount      : ", ethers.utils.formatEther(coreTotalStakedAmount.toString()));
  const coreStTokenBalance = await stTokenContract.balanceOf(inviCoreContract.address);
  console.log("coreStTokenBalance         : ", ethers.utils.formatEther(coreStTokenBalance.toString()));
  const coreTotalNFTRewards = await inviCoreContract.connect(user).totalNFTRewards();
  console.log("coreTotalNFTRewards        : ", ethers.utils.formatEther(coreTotalNFTRewards.toString()));
  const coreTotalClaimableAmount = await inviCoreContract.connect(user).totalClaimableAmount();
  console.log("coreTotalClaimableAmount   : ", ethers.utils.formatEther(coreTotalClaimableAmount.toString()));
  const lpTotalStakedAmount = await lpPoolContract.connect(user).getTotalStakedAmount();
  const lpTotalLentAmount = await lpPoolContract.connect(user).totalLentAmount();
  console.log("lpTotalStakedAmount        : ", ethers.utils.formatEther(lpTotalStakedAmount.toString()));
  console.log("lpTotalLentAmount          : ", ethers.utils.formatEther(lpTotalLentAmount.toString()));
  const nftTotalStakedAmount = await stakeNFTContract.connect(user).totalStakedAmount();
  console.log("nftTotalStakedAmount       : ", ethers.utils.formatEther(nftTotalStakedAmount.toString()));
  const inviCoreBalance = await hardhatEthers.provider.getBalance(inviCoreContract.address);
  console.log("inviCoreBalance            : ", ethers.utils.formatEther(inviCoreBalance.toString()));
  const lpPoolBalance = await hardhatEthers.provider.getBalance(lpPoolContract.address);
  console.log("lpPoolBalance              : ", ethers.utils.formatEther(lpPoolBalance.toString()));
  const lpPoolTotalNativeReward = await lpPoolContract.connect(user).totalNativeRewardAmount();
  console.log("lpPoolTotalNativeReward    : ", ethers.utils.formatEther(lpPoolTotalNativeReward.toString()));
  const lpPoolTotalClaimableUnstakeAmount = await lpPoolContract.connect(user).totalClaimableUnstakeAmount();
  console.log(
    "lpPoolTotalClaimableUnstakeAmount    : ",
    ethers.utils.formatEther(lpPoolTotalClaimableUnstakeAmount.toString())
  );
  //const stakeNFTTokenId
};

export const repayNFT = async (inviCoreContract: Contract, stakeNFTContract: Contract, user: SignerWithAddress) => {
  // get NFTOwnership
  const NFTOwnership = await stakeNFTContract.connect(user).getNFTOwnership(user.getAddress());
  console.log("NFTOwnership: ", NFTOwnership.toString());

  if (NFTOwnership.length === 0) return;

  // get stake Info
  const stakeInfoNft = await stakeNFTContract.connect(user).stakeInfos(NFTOwnership[0]);
  console.log("stakeInfoNft: ", stakeInfoNft.toString());
  // get lock period
  const nftLockPeriod = stakeInfoNft[1];
  console.log("lock period: ", nftLockPeriod.toString());

  // pass time until unstake end period
  await hardhatEthers.provider.send("evm_increaseTime", [nftLockPeriod.toNumber()]);
  await hardhatEthers.provider.send("evm_mine", []);

  // unstake NFT
  const unstakeNft = await inviCoreContract.connect(user).repayNFT(NFTOwnership[0]);
  await unstakeNft.wait();
};

export const stTokenRewardDistribution = async (
  inviCoreContract: Contract,
  stTokenContract: Contract,
  rewardAmount: BigNumber,
  user: SignerWithAddress
) => {
  // spread rewards to inviCore Contract
  const spreadRewards = await stTokenContract
    .connect(user)
    .spreadRewards(inviCoreContract.address, { value: rewardAmount });
  await spreadRewards.wait();

  const distributeRewards = await inviCoreContract.connect(user).distributeStTokenReward();
  await distributeRewards.wait();
};

export const getSwapPoolStatus = async (
  inviSwapPoolContract: Contract,
  inviTokenContract: Contract,
  user: SignerWithAddress
) => {
  // get pool status
  // lp count
  const lpCount = await inviSwapPoolContract.lpCount();
  console.log("lpCount: ", lpCount.toString());
  const totalLiquidityNative = await inviSwapPoolContract.totalLiquidityNative();
  console.log("totalLiquidityNative   : ", ethers.utils.formatEther(totalLiquidityNative.toString()));
  const totalLiquidityInvi = await inviSwapPoolContract.totalLiquidityInvi();
  console.log("totalLiquidityInvi     : ", ethers.utils.formatEther(totalLiquidityInvi.toString()));
  const totalRewardNative = await inviSwapPoolContract.totalRewardNative();
  console.log("totalRewardNative      : ", ethers.utils.formatEther(totalRewardNative.toString()));
  const totalRewardInvi = await inviSwapPoolContract.totalRewardInvi();
  console.log("totalRewardInvi        : ", ethers.utils.formatEther(totalRewardInvi.toString()));
  const inviTokenBalance = await inviTokenContract.balanceOf(inviSwapPoolContract.address);
  console.log("inviTokenBalance       : ", ethers.utils.formatEther(inviTokenBalance.toString()));
};
