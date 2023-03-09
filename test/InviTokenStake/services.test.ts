import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import Web3 from "web3";

describe("InviToken Stake Test", function () {
  // deploy contracts
  async function deployFixture() {
    const [deployer, user1, user2, user3, stakeManager] =
      await ethers.getSigners();
    console.log("addresses: ", deployer.address, user1.address, user2.address);

    // deploy InviTokenContract
    const InviTokenContract = await ethers.getContractFactory("InviToken");
    const inviTokenContract = await upgrades.deployProxy(
      InviTokenContract,
      [],
      { initializer: "initialize" }
    );
    await inviTokenContract.deployed();

    // deploy InviTokenStakeContract
    const InviTokenStakeContract = await ethers.getContractFactory(
      "InviTokenStake"
    );
    const inviTokenStakeContract = await upgrades.deployProxy(
      InviTokenStakeContract,
      [inviTokenContract.address],
      {
        initializer: "initialize",
      }
    );
    await inviTokenStakeContract.deployed();

    // expect deployer == owner
    expect(await inviTokenStakeContract.owner()).to.equal(deployer.address);
    const web3 = new Web3();
    return {
      web3,
      deployer,
      user1,
      user2,
      user3,
      stakeManager,
      inviTokenContract,
      inviTokenStakeContract,
    };
  }

  it("Test Stake", async function () {
    console.log("-------------------Test Stake-------------------");
    const { deployer, user1, inviTokenContract, inviTokenStakeContract } =
      await deployFixture();
    const amount = 1000000;
    await inviTokenContract.functions.mintToken(user1.address, amount);
    await inviTokenContract
      .connect(user1)
      .approve(inviTokenStakeContract.address, amount);
    await inviTokenStakeContract.connect(user1).stake(amount);

    // expect totalStakedAmount == user1StakedAmount == amount
    const totalStakedAmount =
      await inviTokenStakeContract.functions.totalStakedAmount();
    const user1StakedAmount =
      await inviTokenStakeContract.functions.stakedAmount(user1.address);
    expect(totalStakedAmount.toString()).to.equal(amount.toString());
    expect(user1StakedAmount.toString()).to.equal(amount.toString());
  });

  it("Test UpdateReward", async function () {
    console.log("----------------Test Update Reward----------------");
    const {
      deployer,
      user1,
      user2,
      user3,
      stakeManager,
      inviTokenContract,
      inviTokenStakeContract,
    } = await deployFixture();
    const stakeAmount = 1000000;
    const rewardAmount = 100000000;

    // stake from multiple addresses
    // user 1
    await inviTokenContract.functions.mintToken(user1.address, stakeAmount);
    await inviTokenContract
      .connect(user1)
      .approve(inviTokenStakeContract.address, stakeAmount);
    await inviTokenStakeContract.connect(user1).stake(stakeAmount);
    // user 2
    await inviTokenContract.functions.mintToken(user2.address, stakeAmount);
    await inviTokenContract
      .connect(user2)
      .approve(inviTokenStakeContract.address, stakeAmount);
    await inviTokenStakeContract.connect(user2).stake(stakeAmount);
    // user 3
    await inviTokenContract.functions.mintToken(user3.address, stakeAmount);
    await inviTokenContract
      .connect(user3)
      .approve(inviTokenStakeContract.address, stakeAmount);
    await inviTokenStakeContract.connect(user3).stake(stakeAmount);

    const totalStakedAmount =
      await inviTokenStakeContract.functions.totalStakedAmount();
    const user1StakedAmount =
      await inviTokenStakeContract.functions.stakedAmount(user1.address);
    console.log(totalStakedAmount.toString());

    // updateReward to stakers
    await inviTokenStakeContract
      .connect(stakeManager)
      .updateReward({ value: ethers.utils.parseEther("1") })
      .then((tx: any) => {
        console.log(tx);
      })
      .catch((error: any) => {
        console.error(error);
      });
    console.log(
      await inviTokenStakeContract.functions.rewardAmount(user1.address)
    );
  });
});
