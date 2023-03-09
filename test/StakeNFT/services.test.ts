import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import Web3 from "web3";

const [
  principal,
  lockPeriod,
  expectedReward,
  leverageRatio,
  protocolFee,
  lockStart,
  lockEnd,
] = [1000, 10000, 100000, 3, 0, 0, 0];

describe("Stake NFT Test", function () {
  // deploy contract
  async function deployFixture() {
    const [deployer, user1, user2] = await ethers.getSigners();
    console.log("addresses: ", deployer.address, user1.address, user2.address);

    // stakeNFT Contract deploy
    const StakeNFTContract = await ethers.getContractFactory("StakeNFT");
    const stakeNFTContract = await upgrades.deployProxy(StakeNFTContract, [], {
      initializer: "initialize",
    });
    await stakeNFTContract.deployed();

    // expect deployer == owner
    expect(await stakeNFTContract.owner()).to.equal(deployer.address);
    const web3 = new Web3();
    return { web3, deployer, user1, user2, stakeNFTContract };
  }

  // 1. test token minting
  it("Test minting logic", async function () {
    console.log("-------------------Test Minting-------------------");
    const { user1, stakeNFTContract } = await deployFixture();
    const stakeInfo = {
      user: user1.address,
      principal: principal,
      leverageRatio: leverageRatio,
      protocolFee: protocolFee,
      lockStart: lockStart,
      lockEnd: lockEnd,
      lockPeriod: lockPeriod,
      expectedReward: expectedReward,
    };

    // mint nft
    await stakeNFTContract.functions.mintNFT(stakeInfo);

    // check balance
    const user1Balance = await stakeNFTContract.functions.balanceOf(
      user1.address
    );
    expect(user1Balance.toString()).to.equal("1");
  });

  // 2. test token transfer
  it("Test token transfer logic", async function () {
    console.log("-------------------Test Token Transfer-------------------");
    const { user1, user2, stakeNFTContract } = await deployFixture();
    const tokenID = 1;
    const stakeInfo = {
      user: user1.address,
      principal: principal,
      leverageRatio: leverageRatio,
      protocolFee: protocolFee,
      lockStart: lockStart,
      lockEnd: lockEnd,
      lockPeriod: lockPeriod,
      expectedReward: expectedReward,
    };

    // mint nfts
    await stakeNFTContract.functions.mintNFT(stakeInfo);
    await stakeNFTContract.functions.mintNFT(stakeInfo);

    // user 1 approve user 2 to use token
    await stakeNFTContract.connect(user1).approve(user2.address, tokenID);

    // transfer one NFT(tokenID 1) from user1 to user2
    await stakeNFTContract
      .connect(user2)
      .transferFrom(user1.address, user2.address, tokenID);

    // NFT Ownership - now user 2 owns tokenID 1
    const user1Balance = await stakeNFTContract.functions.balanceOf(
      user1.address
    );
    const user2Balance = await stakeNFTContract.functions.balanceOf(
      user2.address
    );
    const ownership = await stakeNFTContract.functions.NFTOwnership(
      user2.address,
      0 // first element
    );
    expect(user1Balance.toString()).to.equal("1");
    expect(user2Balance.toString()).to.equal("1");
    expect(ownership.toString()).to.equal("1");
  });
});
