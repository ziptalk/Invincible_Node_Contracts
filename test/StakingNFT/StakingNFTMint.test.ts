import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import Web3 from "web3";
import { string } from "hardhat/internal/core/params/argumentTypes";

describe("Staking NFT Test", function () {
  // deploy contract
  async function deployFixture() {
    const [deployer, user1, user2] = await ethers.getSigners();
    console.log("addresses: ", deployer.address, user1.address, user2.address);
    const StakingNFTContract = await ethers.getContractFactory("StakingNFT");
    const stakingNFTContract = await StakingNFTContract.deploy();
    await stakingNFTContract.deployed();

    // expect deployer == owner
    expect(await stakingNFTContract.owner()).to.equal(deployer.address);
    const web3 = new Web3();
    return { web3, deployer, user1, user2, stakingNFTContract };
  }

  // 1. test token minting
  it("Test minting logic", async function () {
    const { web3, deployer, user1, user2, stakingNFTContract } =
      await deployFixture();
    const [principal, lockPeriod, expectedReward] = [1000, 10000, 100000];
    // console.log(stakingNFTContract.functions.mintNFT);
    await stakingNFTContract.functions.mintNFT(
      user1.address,
      principal,
      lockPeriod,
      expectedReward
    );

    const test = await stakingNFTContract.functions.balanceOf(user1.address);
    console.log(test);
  });

  // 2. test token transfer
  it("Test token transfer logic", async function () {
    const { web3, deployer, user1, user2, stakingNFTContract } =
      await deployFixture();
    const [principal, lockPeriod, expectedReward] = [1000, 10000, 100000];
    const tokenID = 0;

    // mint nft
    await stakingNFTContract.functions.mintNFT(
      user1.address,
      principal,
      lockPeriod,
      expectedReward
    );

    // user 1 approve user 2 to use token
    console.log(
      await stakingNFTContract.connect(user1).approve(user2.address, tokenID)
    );
    // transfer NFT from user1 to user2
    console.log(
      await stakingNFTContract
        .connect(user2)
        .transferFrom(user1.address, user2.address, tokenID)
    );
  });
});
