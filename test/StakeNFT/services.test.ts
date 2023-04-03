import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { BigNumber, Contract } from "ethers";
import Web3 from "web3";
import { deployAllWithSetting } from "../deploy";
import units from "../units.json";

const [principal, lockPeriod, expectedReward, leverageRatio, protocolFee, lockStart, lockEnd, minReward, maxReward] = [
  1000, 10000, 100000, 3, 0, 0, 0, 100, 200,
];

describe("Stake NFT Test", function () {
  let stakeNFTContract: Contract;

  this.beforeEach(async () => {
    const [deployer, stakeManager, LP, inviCore, userA, userB, userC] = await ethers.getSigners();
    ({stakeNFTContract} = await deployAllWithSetting());
    await stakeNFTContract.connect(deployer).setInviCoreAddress(inviCore.address); // set inviCore address (for test)
  });


  // 1. test token minting
  it("Test mint nft", async function () {
    const [deployer, stakeManager, LP, inviCore, userA, userB, userC] = await ethers.getSigners();

    //* given
    const stakeInfoA = {
      user: userA.address,
      principal: principal,
      leverageRatio: leverageRatio,
      stakedAmount: Math.floor(principal * leverageRatio / units.leverageUnit),
      protocolFee: protocolFee,
      lockStart: lockStart,
      lockEnd: lockEnd,
      lockPeriod: lockPeriod,
      minReward: minReward,
      maxReward: maxReward,
    };

    const stakeInfoA2 = {
      user: userA.address,
      principal: principal,
      leverageRatio: leverageRatio,
      stakedAmount: Math.floor(principal * leverageRatio / units.leverageUnit),
      protocolFee: protocolFee,
      lockStart: lockStart,
      lockEnd: lockEnd,
      lockPeriod: lockPeriod,
      minReward: minReward,
      maxReward: maxReward,
    };

    const stakeInfoB = {
      user: userB.address,
      principal: principal,
      leverageRatio: leverageRatio,
      stakedAmount: Math.floor(principal * leverageRatio / units.leverageUnit),
      protocolFee: protocolFee,
      lockStart: lockStart,
      lockEnd: lockEnd,
      lockPeriod: lockPeriod,
      minReward: minReward,
      maxReward: maxReward,
    };

    const stakeInfoC = {
      user: userC.address,
      principal: principal,
      leverageRatio: leverageRatio,
      stakedAmount: Math.floor(principal * leverageRatio / units.leverageUnit),
      protocolFee: protocolFee,
      lockStart: lockStart,
      lockEnd: lockEnd,
      lockPeriod: lockPeriod,
      minReward: minReward,
      maxReward: maxReward,
    };

    //* when
    await stakeNFTContract.connect(inviCore).mintNFT(stakeInfoA);
    await stakeNFTContract.connect(inviCore).mintNFT(stakeInfoA2);
    await stakeNFTContract.connect(inviCore).mintNFT(stakeInfoB);
    await stakeNFTContract.connect(inviCore).mintNFT(stakeInfoC);

    //* then
    expect((await stakeNFTContract.functions.balanceOf(userA.address)).toString()).to.equal("2");
    expect((await stakeNFTContract.functions.balanceOf(userB.address)).toString()).to.equal("1");
    expect((await stakeNFTContract.functions.balanceOf(userC.address)).toString()).to.equal("1");
    expect((await stakeNFTContract.getNFTOwnership(userA.address)).length).to.equal(2);
    expect((await stakeNFTContract.getNFTOwnership(userB.address)).length).to.equal(1);
    expect((await stakeNFTContract.getNFTOwnership(userC.address)).length).to.equal(1);
    expect(await stakeNFTContract.totalStakedAmount()).to.equal(stakeInfoA.stakedAmount + stakeInfoA2.stakedAmount + stakeInfoB.stakedAmount + stakeInfoC.stakedAmount);
  });

  // 2. test token transfer
  it("Test nft transfer", async function () {
    const [deployer, stakeManager, LP, inviCore, userA, userB, userC] = await ethers.getSigners();

    //* given
    const stakeInfoA = {
      user: userA.address,
      principal: principal,
      leverageRatio: leverageRatio,
      stakedAmount: Math.floor(principal * leverageRatio / units.leverageUnit),
      protocolFee: protocolFee,
      lockStart: lockStart,
      lockEnd: lockEnd,
      lockPeriod: lockPeriod,
      minReward: minReward,
      maxReward: maxReward,
    };

    await stakeNFTContract.connect(inviCore).mintNFT(stakeInfoA); // mint nfts
    const tokenId = await stakeNFTContract.NFTOwnership(userA.address, 0); // get tokenID

    //* when
    await stakeNFTContract.connect(userA).approve(userB.address, tokenId); // approve transfer
    await stakeNFTContract.connect(userB).transferFrom(userA.address, userB.address, tokenId); // transfer

    //* then
    expect((await stakeNFTContract.functions.balanceOf(userA.address)).toString()).to.equal("0");
    expect((await stakeNFTContract.functions.balanceOf(userB.address)).toString()).to.equal("1");
    expect(await stakeNFTContract.NFTOwnership(userB.address, 0)).to.equal(tokenId); 
    expect((await stakeNFTContract.getNFTOwnership(userA.address)).length).to.equal(0);
  });
});

