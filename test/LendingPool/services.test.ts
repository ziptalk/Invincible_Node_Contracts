import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { deployAllWithSetting} from "../deploy";
import { leverageStake, provideLiquidity } from "../utils";
import units from "../units.json";

describe("LendingPool contract services test", function () {
  let lpPoolContract: Contract;
  let lendingPoolContract: Contract;
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let inviTokenContract: Contract;

  this.beforeEach(async () => {
     ({lpPoolContract, lendingPoolContract, inviCoreContract, stakeNFTContract, inviTokenContract} = await deployAllWithSetting());
  });

  it("Test lend invi token", async function () {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    //* given
    await provideLiquidity(lpPoolContract, LP, 10000000000000);
    const leverageRatio = 3 * units.leverageUnit;
    await leverageStake(inviCoreContract, userA, 1000000, leverageRatio);
    const nftId = (await stakeNFTContract.getNFTOwnership(userA.address))[0];
    const lendInfo = (await lendingPoolContract.functions.createLendInfo(nftId))[0]; //TODO : 이게 왜 배열로 들어올까...

    //* when
    await lendingPoolContract.connect(userA).lend(lendInfo);

    //* then
    expect(await lendingPoolContract.totalLentAmount()).to.equal(lendInfo.lentAmount);
    expect((await lendingPoolContract.getLendInfo(userA.address, 0)).user).to.equal(userA.address);
    expect((await stakeNFTContract.stakeInfos(nftId)).isLent).to.equal(true);
    expect(await inviTokenContract.balanceOf(userA.address)).to.equal(lendInfo.lentAmount);
  });

  it("Test repay invi token", async function () {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    //* given
    await provideLiquidity(lpPoolContract, LP, 10000000000000);
    const leverageRatio = 3 * units.leverageUnit;
    await leverageStake(inviCoreContract, userA, 1000000, leverageRatio);
    const nftId = (await stakeNFTContract.getNFTOwnership(userA.address))[0];
    const lendInfo = (await lendingPoolContract.functions.createLendInfo(nftId))[0]; //TODO : 이게 왜 배열로 들어올까...
    await lendingPoolContract.connect(userA).lend(lendInfo);

    //* when
    await inviTokenContract.connect(userA).approve(lendingPoolContract.address, lendInfo.lentAmount);
    await lendingPoolContract.connect(userA).repay(0);

    //* then
    expect(await lendingPoolContract.totalLentAmount()).to.equal(0);
    expect((await stakeNFTContract.stakeInfos(nftId)).isLent).to.equal(false);
    expect(await inviTokenContract.balanceOf(userA.address)).to.equal(0);
  });
})
