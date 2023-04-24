import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { deployAllWithSetting } from "../deploy";
import { leverageStake, provideLiquidity } from "../utils";
import units from "../units.json";

describe("LendingPool functions test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let lendingPoolContract: Contract;

  this.beforeEach(async () => {
    ({ inviCoreContract, stakeNFTContract, lpPoolContract, lendingPoolContract } = await deployAllWithSetting());
  });

  it("Test getLendInfo function", async function () {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    //* given
    await provideLiquidity(lpPoolContract, LP, 10000000000000);
    const leverageRatio = 3 * units.leverageUnit;
    const minLockPeriod = await inviCoreContract.functions.getLockPeriod(leverageRatio);
    const lockPeriod = minLockPeriod * 2;
    await leverageStake(inviCoreContract, userA, 1000000, leverageRatio, lockPeriod);
    const nftId = (await stakeNFTContract.getNFTOwnership(userA.address))[0];

    //* when
    const lendRatio = 0.8 * units.lendRatioUnit;
    const swapLendRatio = 0.9;
    const lendInfo = (await lendingPoolContract.functions.createLendInfo(nftId, lendRatio))[0]; //TODO : 이게 왜 배열로 들어올까...

    //* then
    expect(lendInfo.user).to.equals(userA.address);
    expect(lendInfo.nftId).to.equals(nftId);
    expect(lendInfo.principal).to.equals(1000000);
    expect(lendInfo.lentAmount).to.equals(((1000000 * lendRatio) / units.lendRatioUnit) * swapLendRatio);
    expect(lendInfo.lendRatio).to.equals(lendRatio);
  });
});
