import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { deployInviToken, deployInviTokenStakeContract } from "../deploy";

describe("InviToken Stake Test", function () {
  let inviTokenContract: Contract;
  let inviTokenStakeContract: Contract;

  this.beforeEach(async () => {
    const [deployer, stakeManager, userA, userB, userC] = await ethers.getSigners();

    // deploy inviToken contract
    inviTokenContract = await deployInviToken();

    // deploy inviCore contract
    inviTokenStakeContract = await deployInviTokenStakeContract(stakeManager.address, inviTokenContract);
  });

  it("Test Stake", async function () {
    console.log("-------------------Test Stake-------------------");
    const [deployer, stakeManager, userA, userB, userC] = await ethers.getSigners();
    const amount = 1000000;
    await inviTokenContract.functions.mintToken(userA.address, amount);
    await inviTokenContract.connect(userA).approve(inviTokenStakeContract.address, amount);
    await inviTokenStakeContract.connect(userA).stake(amount);

    // expect totalStakedAmount == userAStakedAmount == amount
    const totalStakedAmount = await inviTokenStakeContract.functions.totalStakedAmount();
    const userAStakedAmount = await inviTokenStakeContract.functions.stakedAmount(userA.address);
    expect(totalStakedAmount.toString()).to.equal(amount.toString());
    expect(userAStakedAmount.toString()).to.equal(amount.toString());
  });

  it("Test UpdateReward", async function () {
    console.log("----------------Test Update Reward----------------");
    const [deployer, stakeManager, userA, userB, userC] = await ethers.getSigners();
    const stakeAmount: Number = 1000000;
    const rewardAmountEther: string = "3";

    // stake from multiple addresses
    // user 1
    await inviTokenContract.functions.mintToken(userA.address, stakeAmount);
    await inviTokenContract.connect(userA).approve(inviTokenStakeContract.address, stakeAmount);
    await inviTokenStakeContract.connect(userA).stake(stakeAmount);
    // user 2
    await inviTokenContract.functions.mintToken(userB.address, stakeAmount);
    await inviTokenContract.connect(userB).approve(inviTokenStakeContract.address, stakeAmount);
    await inviTokenStakeContract.connect(userB).stake(stakeAmount);
    // user 3
    await inviTokenContract.functions.mintToken(userC.address, stakeAmount);
    await inviTokenContract.connect(userC).approve(inviTokenStakeContract.address, stakeAmount);
    await inviTokenStakeContract.connect(userC).stake(stakeAmount);

    const totalStakedAmount = await inviTokenStakeContract.functions.totalStakedAmount();
    const userAStakedAmount = await inviTokenStakeContract.functions.stakedAmount(userA.address);
    console.log(totalStakedAmount.toString());

    // updateReward to stakers
    await inviTokenStakeContract
      .connect(stakeManager)
      .updateReward({ value: ethers.utils.parseEther(rewardAmountEther) })
      .catch((error: any) => {
        console.error(error);
      });
    const userAReward = await inviTokenStakeContract.functions.rewardAmount(userA.address);
    const expecteduserAReward = ethers.utils.parseEther((parseInt(rewardAmountEther) / 3).toString());
    expect(userAReward.toString()).to.equal(expecteduserAReward.toString());
  });

  it("Test Unstake", async function () {
    console.log("----------------Test Unstake----------------");
    const [deployer, stakeManager, userA, userB, userC] = await ethers.getSigners();
    const stakeAmount: Number = 1000000;
    // stake
    await inviTokenContract.functions.mintToken(userA.address, stakeAmount);
    await inviTokenContract.connect(userA).approve(inviTokenStakeContract.address, stakeAmount);
    await inviTokenStakeContract.connect(userA).stake(stakeAmount);
    const userAStakedAmount = await inviTokenStakeContract.functions.stakedAmount(userA.address);
    expect(userAStakedAmount.toString()).to.equal(stakeAmount.toString());
    // unstake
    await inviTokenStakeContract.connect(userA).unStake(stakeAmount);
    const userAStakedAmountAfterUnstake = await inviTokenStakeContract.functions.stakedAmount(userA.address);
    expect(userAStakedAmountAfterUnstake.toString()).to.equal("0");
  });
});
