import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { deployInviToken, deployInviTokenStakeContract } from "../deploy";

describe("InviToken Stake Test", function () {
  let inviTokenContract: Contract;
  let inviTokenStakeContract: Contract;

  this.beforeEach(async () => {
    const [deployer, stakeManager, user1, user2, user3] = await ethers.getSigners();

    // deploy inviToken contract
    inviTokenContract = await deployInviToken();

    // deploy inviCore contract
    inviTokenStakeContract = await deployInviTokenStakeContract(inviTokenContract);
  });

  it("Test Stake", async function () {
    console.log("-------------------Test Stake-------------------");
    const [deployer, stakeManager, user1, user2, user3] = await ethers.getSigners();
    const amount = 1000000;
    await inviTokenContract.functions.mintToken(user1.address, amount);
    await inviTokenContract.connect(user1).approve(inviTokenStakeContract.address, amount);
    await inviTokenStakeContract.connect(user1).stake(amount);

    // expect totalStakedAmount == user1StakedAmount == amount
    const totalStakedAmount = await inviTokenStakeContract.functions.totalStakedAmount();
    const user1StakedAmount = await inviTokenStakeContract.functions.stakedAmount(user1.address);
    expect(totalStakedAmount.toString()).to.equal(amount.toString());
    expect(user1StakedAmount.toString()).to.equal(amount.toString());
  });

  it("Test UpdateReward", async function () {
    console.log("----------------Test Update Reward----------------");
    const [deployer, stakeManager, user1, user2, user3] = await ethers.getSigners();
    const stakeAmount: Number = 1000000;
    const rewardAmountEther: string = "3";

    // stake from multiple addresses
    // user 1
    await inviTokenContract.functions.mintToken(user1.address, stakeAmount);
    await inviTokenContract.connect(user1).approve(inviTokenStakeContract.address, stakeAmount);
    await inviTokenStakeContract.connect(user1).stake(stakeAmount);
    // user 2
    await inviTokenContract.functions.mintToken(user2.address, stakeAmount);
    await inviTokenContract.connect(user2).approve(inviTokenStakeContract.address, stakeAmount);
    await inviTokenStakeContract.connect(user2).stake(stakeAmount);
    // user 3
    await inviTokenContract.functions.mintToken(user3.address, stakeAmount);
    await inviTokenContract.connect(user3).approve(inviTokenStakeContract.address, stakeAmount);
    await inviTokenStakeContract.connect(user3).stake(stakeAmount);

    const totalStakedAmount = await inviTokenStakeContract.functions.totalStakedAmount();
    const user1StakedAmount = await inviTokenStakeContract.functions.stakedAmount(user1.address);
    console.log(totalStakedAmount.toString());

    // updateReward to stakers
    await inviTokenStakeContract
      .connect(stakeManager)
      .updateReward({ value: ethers.utils.parseEther(rewardAmountEther) })
      .catch((error: any) => {
        console.error(error);
      });
    const user1Reward = await inviTokenStakeContract.functions.rewardAmount(user1.address);
    const expectedUser1Reward = ethers.utils.parseEther((parseInt(rewardAmountEther) / 3).toString());
    expect(user1Reward.toString()).to.equal(expectedUser1Reward.toString());
  });
});
