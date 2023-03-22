import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "ethers";
import units from "./units.json";
type SignerWithAddress = ethers.Signer & { getAddress: () => Promise<string> };

export const provideLiquidity = async (lpPoolContract: Contract, user: SignerWithAddress, amount: number) => {
    await lpPoolContract.connect(user).stake({ value: amount });
}

export const leverageStake = async (inviCoreContract: Contract, user: SignerWithAddress, principal: number, leverageRatio: number) => {
    const stakeInfo = await inviCoreContract.connect(user).getStakeInfo(principal, leverageRatio);
    const slippage = 3 * units.slippageUnit;
    await inviCoreContract.connect(user).stake(stakeInfo, slippage, { value: principal });
    return stakeInfo;
}

export const verifyRequest = async (request : any, recipient : string, amount : number, fee : number, type : number) => {
    expect(request.recipient).to.equal(recipient);
    expect(request.amount).to.equal(amount);
    expect(request.fee).to.equal(fee);
    expect(request.requestType).to.equal(type);
}