import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { BigNumber, Contract } from "ethers";
import Web3 from "web3";
import { deployStakeNFT } from "../deploy";

const [principal, lockPeriod, expectedReward, leverageRatio, protocolFee, lockStart, lockEnd, minReward, maxReward] = [
  1000, 10000, 100000, 3, 0, 0, 0, 100, 200,
];

describe("Stake NFT Test", function () {
  let stakeNFTContract: Contract;

  this.beforeEach(async () => {
    const [deployer, userA, userB, userC] = await ethers.getSigners();

    // deploy stakeNFT contract
    stakeNFTContract = await deployStakeNFT();
  });

  // 1. test token minting
  it("Test minting logic", async function () {
    console.log("-------------------Test Minting-------------------");
    const [deployer, userA, userB, userC] = await ethers.getSigners();
    const stakeInfo = {
      user: userA.address,
      principal: principal,
      leverageRatio: leverageRatio,
      protocolFee: protocolFee,
      lockStart: lockStart,
      lockEnd: lockEnd,
      lockPeriod: lockPeriod,
      minReward: minReward,
      maxReward: maxReward,
    };

    // mint nft
    await stakeNFTContract.functions.mintNFT(stakeInfo);

    // check balance
    const userABalance = await stakeNFTContract.functions.balanceOf(userA.address);
    expect(userABalance.toString()).to.equal("1");
  });

  // 2. test token transfer
  it("Test token transfer logic", async function () {
    console.log("-------------------Test Token Transfer-------------------");
    const [deployer, userA, userB, userC] = await ethers.getSigners();
    const tokenID = 1;
    const stakeInfo = {
      user: userA.address,
      principal: principal,
      leverageRatio: leverageRatio,
      protocolFee: protocolFee,
      lockStart: lockStart,
      lockEnd: lockEnd,
      lockPeriod: lockPeriod,
      minReward: minReward,
      maxReward: maxReward,
    };

    // mint nfts
    await stakeNFTContract.functions.mintNFT(stakeInfo);
    await stakeNFTContract.functions.mintNFT(stakeInfo);

    // user 1 approve user 2 to use token
    await stakeNFTContract.connect(userA).approve(userB.address, tokenID);

    // transfer one NFT(tokenID 1) from userA to userB
    await stakeNFTContract.connect(userB).transferFrom(userA.address, userB.address, tokenID);

    // NFT Ownership - now user 2 owns tokenID 1
    const userABalance = await stakeNFTContract.functions.balanceOf(userA.address);
    const userBBalance = await stakeNFTContract.functions.balanceOf(userB.address);
    const ownership = await stakeNFTContract.functions.NFTOwnership(
      userB.address,
      0 // first element
    );
    expect(userABalance.toString()).to.equal("1");
    expect(userBBalance.toString()).to.equal("1");
    expect(ownership.toString()).to.equal("1");
  });
});
