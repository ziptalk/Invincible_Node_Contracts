import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { deployInviToken, deployInviTokenStakeContract, deployAllWithSetting } from "../deploy";

describe("InviToken Stake Test", function () {
  let stKlayContract: Contract;
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let iLPTokenContract: Contract;
  let inviTokenContract: Contract;
  let inviTokenStakeContract: Contract;

  this.beforeEach(async () => {
    const [deployer, stakeManager, LP, inviCore, userB, userC] = await ethers.getSigners();
    [stKlayContract, inviCoreContract, iLPTokenContract, stakeNFTContract, inviTokenContract, lpPoolContract, inviTokenStakeContract] = await deployAllWithSetting();
    
  });

  it("Test stake", async function () {
    const [deployer, stakeManager, userA, userB, userC] = await ethers.getSigners();
    
    //* given
    const amountA = 1000000;
    const amountB = 2000000;
    const amountC = 3000000;
    await inviTokenContract.connect(deployer).mintToken(userA.address, amountA);
    await inviTokenContract.connect(userA).approve(inviTokenStakeContract.address, amountA);
    await inviTokenContract.connect(deployer).mintToken(userB.address, amountB);
    await inviTokenContract.connect(userB).approve(inviTokenStakeContract.address, amountB);
    await inviTokenContract.connect(deployer).mintToken(userC.address, amountC);
    await inviTokenContract.connect(userC).approve(inviTokenStakeContract.address, amountC);

    //* when
    await inviTokenStakeContract.connect(userA).stake(amountA);
    await inviTokenStakeContract.connect(userB).stake(amountB);
    await inviTokenStakeContract.connect(userC).stake(amountC);

    //* then
    expect((await inviTokenStakeContract.functions.totalStakedAmount()).toString()).to.equal((amountA + amountB + amountC).toString()); // totalStakedAmount
    expect((await inviTokenStakeContract.functions.stakedAmount(userA.address)).toString()).to.equal(amountA.toString()); // userAStakedAmount
    expect((await inviTokenStakeContract.functions.stakedAmount(userB.address)).toString()).to.equal(amountB.toString()); // userAStakedAmount
    expect((await inviTokenStakeContract.functions.stakedAmount(userC.address)).toString()).to.equal(amountC.toString()); // userAStakedAmount
  });

  it("Test Unstake", async function () {
    const [deployer, stakeManager, inviCore, userA, userB, userC] = await ethers.getSigners();
    
    //* given
    const stakedAmount = 10000000;
    await inviTokenContract.connect(deployer).mintToken(userA.address, stakedAmount);
    await inviTokenContract.connect(userA).approve(inviTokenStakeContract.address, stakedAmount);
    await inviTokenStakeContract.connect(userA).stake(stakedAmount);

    //* when
    await inviTokenStakeContract.connect(userA).unStake(stakedAmount);

    //* then
    expect((await inviTokenStakeContract.functions.stakedAmount(userA.address)).toString()).to.equal("0");
    expect(await inviTokenContract.balanceOf(userA.address)).to.equal(stakedAmount);
  });

  it("Test Unstake _ too many", async function () {
    const [deployer, stakeManager, inviCore, userA, userB, userC] = await ethers.getSigners();
    
    //* given
    const stakedAmount = 10000000;
    await inviTokenContract.connect(deployer).mintToken(userA.address, stakedAmount);
    await inviTokenContract.connect(userA).approve(inviTokenStakeContract.address, stakedAmount);
    await inviTokenStakeContract.connect(userA).stake(stakedAmount);

    //* when
    await inviTokenStakeContract.connect(userA).unStake(stakedAmount + 100).then(() => {}).catch((e : any) => {
      expect(e.message).to.equal("VM Exception while processing transaction: reverted with reason string 'Unstake Amount cannot be bigger than stake amount'");
    });

    //* then
    expect((await inviTokenStakeContract.functions.stakedAmount(userA.address)).toString()).to.equal(stakedAmount.toString());
    expect(await inviTokenContract.balanceOf(userA.address)).to.equal(0);
  });

  it("Test update native reward", async function () {
    const [deployer, stakeManager, inviCore, userA, userB, userC] = await ethers.getSigners();
    await inviTokenStakeContract.connect(deployer).setInviCoreAddress(inviCore.address);

    //* given
    const stakedAmount = 10000000;
    const ratioA = 0.2;
    const ratioB = 0.3;
    const ratioC = 0.5;
    // mint token
    await inviTokenContract.connect(deployer).mintToken(userA.address, stakedAmount * ratioA);
    await inviTokenContract.connect(deployer).mintToken(userB.address, stakedAmount * ratioB);
    await inviTokenContract.connect(deployer).mintToken(userC.address, stakedAmount * ratioC);
    // approve token
    await inviTokenContract.connect(userA).approve(inviTokenStakeContract.address, stakedAmount * ratioA);
    await inviTokenContract.connect(userB).approve(inviTokenStakeContract.address, stakedAmount * ratioB);
    await inviTokenContract.connect(userC).approve(inviTokenStakeContract.address, stakedAmount * ratioC);
    // stake
    await inviTokenStakeContract.connect(userA).stake(stakedAmount * ratioA);
    await inviTokenStakeContract.connect(userB).stake(stakedAmount * ratioB);
    await inviTokenStakeContract.connect(userC).stake(stakedAmount * ratioC);

    //* when
    const nativeRewardAmount = 10000000000000;
    await inviTokenStakeContract.connect(inviCore).updateNativeReward({ value: nativeRewardAmount });

    //* then
    expect((await inviTokenStakeContract.nativeRewardAmount(userA.address)).toString()).to.equal((nativeRewardAmount * ratioA).toString());
    expect((await inviTokenStakeContract.nativeRewardAmount(userB.address)).toString()).to.equal((nativeRewardAmount * ratioB).toString());
    expect((await inviTokenStakeContract.nativeRewardAmount(userC.address)).toString()).to.equal((nativeRewardAmount * ratioC).toString());
  });

});
