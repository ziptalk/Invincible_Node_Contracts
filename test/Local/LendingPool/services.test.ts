import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { deployAllWithSetting } from "../../deploy";
import { leverageStake, provideLiquidity } from "../../utils";
import units from "../../units.json";

describe("LendingPool contract services test", function () {
  let lpPoolContract: Contract;
  let lendingPoolContract: Contract;
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let inviTokenContract: Contract;
  let priceManagerContract: Contract;

  let nonceDeployer;
  let nonceLP: number;
  let nonceUserA: number;
  let nonceUserB: number;
  let nonceUserC: number;
  let tx: any;

  this.beforeEach(async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    ({ lpPoolContract, lendingPoolContract, inviCoreContract, stakeNFTContract, inviTokenContract, priceManagerContract } = await deployAllWithSetting());
    nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    nonceLP = await ethers.provider.getTransactionCount(LP.address);
    nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    nonceUserB = await ethers.provider.getTransactionCount(userB.address);
    nonceUserC = await ethers.provider.getTransactionCount(userC.address);
    tx;
  });

  it("Test lend invi token", async function () {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();
    const lendRatio = 0.8 * units.lendRatioUnit;
    const slippage = 3 * units.slippageUnit;
    const stakeAmount: BigNumber = BigNumber.from("1000000");

    //* given
    await priceManagerContract.setInviPrice(1000000000000);
    await priceManagerContract.setNativePrice(200000000000);
    await inviTokenContract.functions.regularMinting();

    await provideLiquidity(lpPoolContract, LP, 10000000000000, nonceLP++);
    const leverageRatio = 3 * units.leverageUnit;
    const minLockPeriod = await inviCoreContract.functions.getLockPeriod(leverageRatio);
    const lockPeriod = minLockPeriod * 2;
    await leverageStake(inviCoreContract, userA, stakeAmount, leverageRatio, lockPeriod, nonceUserA++);
    const nftId = (await stakeNFTContract.getNFTOwnership(userA.address))[0];
    let lendInfo = (await lendingPoolContract.functions.createLendInfo(nftId, slippage))[0]; //TODO : 이게 왜 배열로 들어올까...

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
    const stakeAmount: BigNumber = BigNumber.from("1000000");

    const lendRatio = 0.8 * units.lendRatioUnit;

    //* given
    await priceManagerContract.setInviPrice(1000000000000);
    await priceManagerContract.setNativePrice(200000000000);
    await inviTokenContract.functions.regularMinting();

    await provideLiquidity(lpPoolContract, LP, 10000000000000, nonceLP++);
    const leverageRatio = 3 * units.leverageUnit;
    const minLockPeriod = await inviCoreContract.functions.getLockPeriod(leverageRatio);
    const lockPeriod = minLockPeriod * 2;
    const slippage = 3 * units.slippageUnit;
    await leverageStake(inviCoreContract, userA, stakeAmount, leverageRatio, lockPeriod, nonceUserA++);
    const nftId = (await stakeNFTContract.getNFTOwnership(userA.address))[0];
    let lendInfo = (await lendingPoolContract.functions.createLendInfo(nftId, slippage))[0]; //TODO : 이게 왜 배열로 들어올까...

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
      //expect(e.reason).to.equal("not found lend info");
    }
  });
});
