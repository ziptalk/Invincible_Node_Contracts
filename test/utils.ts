import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "ethers";
import { units } from "./units";

type SignerWithAddress = ethers.Signer & { getAddress: () => Promise<string> };

export const provideLiquidity = async (lpPoolContract: Contract, user: SignerWithAddress, amount: BigNumber, nonce: number) => {
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
    const stakeInfo = await inviCoreContract.connect(user).createStakeInfo(await user.getAddress(), principal, leverageRatio, lockPeriod, { nonce: nonce });
    const slippage = 3 * units.slippageUnit;
    let tx = await inviCoreContract.connect(user).stake(principal, leverageRatio, lockPeriod, slippage, { value: principal, nonce: nonce });
    await tx.wait();
    return stakeInfo;
  } catch (e) {
    console.log("leverageStake failed at " + nonce, e);
  }
};

export const verifyRequest = async (request: any, recipient: string, amount: number, fee: number, type: number) => {
  expect(request.recipient).to.equal(recipient);
  expect(request.amount).to.equal(amount);
  expect(request.fee).to.equal(fee);
  expect(request.requestType).to.equal(type);
};
