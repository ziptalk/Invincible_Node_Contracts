import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { deployAllWithSetting } from "../deploy";
import { leverageStake, provideLiquidity } from "../utils";
import units from "../units.json";

describe("LendingPool contract services test", function () {
  let lpPoolContract: Contract;
  let lendingPoolContract: Contract;
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let inviTokenContract: Contract;
  let priceManagerContract: Contract;

  this.beforeEach(async () => {
    ({ lpPoolContract, lendingPoolContract, inviCoreContract, stakeNFTContract, inviTokenContract, priceManagerContract } = await deployAllWithSetting());
  });

  it("Test lend invi token", async function () {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();
    const lendRatio = 0.8 * units.lendRatioUnit;
    const slippage = 3 * units.slippageUnit;

    //* given
    await priceManagerContract.setInviPrice(1000000000000);
    await priceManagerContract.setKlayPrice(200000000000);

    await provideLiquidity(lpPoolContract, LP, 10000000000000);
    const leverageRatio = 3 * units.leverageUnit;
    const minLockPeriod = await inviCoreContract.functions.getLockPeriod(leverageRatio);
    const lockPeriod = minLockPeriod * 2;
    await leverageStake(inviCoreContract, userA, 1000000, leverageRatio, lockPeriod);
    const nftId = (await stakeNFTContract.getNFTOwnership(userA.address))[0];
    let lendInfo = (await lendingPoolContract.functions.createLendInfo(nftId, lendRatio, slippage))[0]; //TODO : 이게 왜 배열로 들어올까...
    await inviTokenContract.functions.regularMinting();

    //* when
    await lendingPoolContract.connect(userA).lend(lendInfo);

    //* then
    lendInfo = await lendingPoolContract.lendInfos(nftId);
    expect(await lendingPoolContract.totalLentAmount()).to.equal(lendInfo.lentAmount);
    expect((await lendingPoolContract.getLendInfo(nftId)).user).to.equal(userA.address);
    expect((await stakeNFTContract.stakeInfos(nftId)).isLent).to.equal(true);
    expect(await inviTokenContract.balanceOf(userA.address)).to.equal(lendInfo.lentAmount);
  });

  it("Test repay invi token", async function () {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();
    const lendRatio = 0.8 * units.lendRatioUnit;

    //* given
    await priceManagerContract.setInviPrice(1000000000000);
    await priceManagerContract.setKlayPrice(200000000000);
    await inviTokenContract.functions.regularMinting();

    await provideLiquidity(lpPoolContract, LP, 10000000000000);
    const leverageRatio = 3 * units.leverageUnit;
    const minLockPeriod = await inviCoreContract.functions.getLockPeriod(leverageRatio);
    const lockPeriod = minLockPeriod * 2;
    const slippage = 3 * units.slippageUnit;
    await leverageStake(inviCoreContract, userA, 1000000, leverageRatio, lockPeriod);
    const nftId = (await stakeNFTContract.getNFTOwnership(userA.address))[0];
    let lendInfo = (await lendingPoolContract.functions.createLendInfo(nftId, lendRatio, slippage))[0]; //TODO : 이게 왜 배열로 들어올까...

    await lendingPoolContract.connect(userA).lend(lendInfo);
    lendInfo = await lendingPoolContract.lendInfos(nftId);

    //* when
    await inviTokenContract.connect(userA).approve(lendingPoolContract.address, lendInfo.lentAmount);
    await lendingPoolContract.connect(userA).repay(nftId);

    //* then
    expect(await lendingPoolContract.totalLentAmount()).to.equal(0);
    expect((await stakeNFTContract.stakeInfos(nftId)).isLent).to.equal(false);
    expect(await inviTokenContract.balanceOf(userA.address)).to.equal(0);

    try {
      await lendingPoolContract.getLendInfo(nftId);
    } catch (e) {
      expect(e.reason).to.equal("not found lend info");
    }
  });
});
