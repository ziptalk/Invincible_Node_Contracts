import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "ethers";
import { units } from "./units";
import { ethers as hardhatEthers } from "hardhat";

type SignerWithAddress = ethers.Signer & { getAddress: () => Promise<string> };

export const provideLiquidity = async (
  lpPoolContract: Contract,
  user: SignerWithAddress,
  amount: BigNumber,
  nonce: number
) => {
  try {
    let tx = await lpPoolContract.connect(user).stake({ value: amount, nonce: nonce });
    await tx.wait();
  } catch (e) {
    console.log("provideLiquidity failed at " + nonce, e);
  }
};

export const leverageStake = async (
  inviCoreContract: Contract,
  user: SignerWithAddress,
  principal: BigNumber,
  leverageRatio: number,
  lockPeriod: number,
  nonce: number
) => {
  try {
    const slippage = 3 * units.slippageUnit;
    let tx = await inviCoreContract
      .connect(user)
      .stake(principal, leverageRatio, lockPeriod, slippage, { value: principal });
    await tx.wait();
  } catch (e) {
    console.log("leverageStake failed at " + e);
  }
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
  const coreTotalStakedAmount = await inviCoreContract.connect(user).getTotalStakedAmount();
  console.log("coreTotalStakedAmount      : ", ethers.utils.formatEther(coreTotalStakedAmount.toString()));
  const coreStTokenBalance = await stTokenContract.balanceOf(inviCoreContract.address);
  console.log("coreStTokenBalance         : ", ethers.utils.formatEther(coreStTokenBalance.toString()));
  const coreTotalNFTRewards = await inviCoreContract.connect(user).totalNFTRewards();
  console.log("coreTotalNFTRewards        : ", ethers.utils.formatEther(coreTotalNFTRewards.toString()));
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
};
