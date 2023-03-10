import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import Web3 from "web3";

describe("Liquidity Provider Pool Test", function () {
  // deploy contracts
  async function deployFixture() {
    const [deployer, user1, user2, user3, stakeManager] =
      await ethers.getSigners();
    console.log("addresses: ", deployer.address, user1.address, user2.address);

    // deploy ILPTokenContract
    const ILPTokenContract = await ethers.getContractFactory("ILPToken");
    const iLPTokenContract = await upgrades.deployProxy(ILPTokenContract, [], {
      initializer: "initialize",
    });
    await iLPTokenContract.deployed();

    // deploy inviTokenContract
    const InviTokenContract = await ethers.getContractFactory("InviToken");
    const inviTokenContract = await upgrades.deployProxy(
      InviTokenContract,
      [],
      {
        initializer: "initialize",
      }
    );
    await inviTokenContract.deployed();

    // deploy LiquidityProviderPoolContract
    const LiquidityProviderPoolContract = await ethers.getContractFactory(
      "LiquidityProviderPool"
    );
    const liquidityProviderPoolContract = await upgrades.deployProxy(
      LiquidityProviderPoolContract,
      [iLPTokenContract.address, inviTokenContract.address],
      { initializer: "initialize" }
    );
    await liquidityProviderPoolContract.deployed();

    // switch ILP, inviToken contract owner to LiquidityProviderPool
    await iLPTokenContract.functions.transferOwnership(
      liquidityProviderPoolContract.address
    );
    await inviTokenContract.functions.transferOwnership(
      liquidityProviderPoolContract.address
    );

    // expect deployer == owner
    expect(await liquidityProviderPoolContract.owner()).to.equal(
      deployer.address
    );
    const web3 = new Web3();
    return {
      web3,
      deployer,
      user1,
      user2,
      user3,
      stakeManager,
      iLPTokenContract,
      inviTokenContract,
      liquidityProviderPoolContract,
    };
  }

  const stakeAmountEther: string = "1";
  it("Test Stake", async function () {
    console.log("-------------------Test Stake-------------------");
    const { user1, liquidityProviderPoolContract } = await deployFixture();
    await liquidityProviderPoolContract
      .connect(user1)
      .stake({ value: ethers.utils.parseEther(stakeAmountEther) });

    // expect totalStakedAmount == user1StakedAmount == amount
    const expectedUser1Reward = ethers.utils.parseEther(stakeAmountEther);
    const totalStakedAmount =
      await liquidityProviderPoolContract.functions.totalStakedAmount();
    const user1StakedAmount =
      await liquidityProviderPoolContract.functions.stakedAmount(user1.address);
    expect(totalStakedAmount.toString()).to.equal(
      expectedUser1Reward.toString()
    );
    expect(user1StakedAmount.toString()).to.equal(
      expectedUser1Reward.toString()
    );
  });

  it("Test Update and Receive Reward", async function () {
    console.log("----------------Test Update Reward----------------");
    const {
      user1,
      user2,
      user3,
      stakeManager,
      inviTokenContract,
      liquidityProviderPoolContract,
    } = await deployFixture();
    const stakeAmount: Number = 1000000;
    const rewardAmountEther: string = "3";

    // stake from multiple addresses
    // user 1
    await liquidityProviderPoolContract
      .connect(user1)
      .stake({ value: ethers.utils.parseEther(stakeAmountEther) });
    // user 2
    await liquidityProviderPoolContract
      .connect(user2)
      .stake({ value: ethers.utils.parseEther(stakeAmountEther) });
    // user 3
    await liquidityProviderPoolContract
      .connect(user3)
      .stake({ value: ethers.utils.parseEther(stakeAmountEther) });

    const totalStakedAmount =
      await liquidityProviderPoolContract.functions.totalStakedAmount();
    const user1StakedAmount =
      await liquidityProviderPoolContract.functions.stakedAmount(user1.address);
    console.log(totalStakedAmount.toString());

    // updateReward to stakers
    await liquidityProviderPoolContract
      .connect(stakeManager)
      .updateReward({ value: ethers.utils.parseEther(rewardAmountEther) })
      .catch((error: any) => {
        console.error(error);
      });
    const user1NativeReward =
      await liquidityProviderPoolContract.functions.nativeRewardAmount(
        user1.address
      );
    const user1InviReward =
      await liquidityProviderPoolContract.functions.inviRewardAmount(
        user1.address
      );
    const expectedUser1Reward = ethers.utils.parseEther(
      (parseInt(rewardAmountEther) / 3).toString()
    );
    expect(user1NativeReward.toString()).to.equal(
      expectedUser1Reward.toString()
    );
    expect(user1InviReward.toString()).to.equal(expectedUser1Reward.toString());

    // receive reward
    await liquidityProviderPoolContract.connect(user1).receiveReward();
    const user1InviBalance = await inviTokenContract.functions.balanceOf(
      user1.address
    );
    expect(user1InviBalance.toString()).to.equal(
      expectedUser1Reward.toString()
    );
  });
});
