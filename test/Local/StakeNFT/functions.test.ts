import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { BigNumber, Contract } from "ethers";
import Web3 from "web3";
import { deployAllWithSetting } from "../../deploy";

const [principal, lockPeriod, expectedReward, leverageRatio, protocolFee, lockStart, lockEnd] = [1000, 10000, 100000, 3, 0, 0, 0];

describe("Stake NFT Test", function () {
  let stakeNFTContract: Contract;

  this.beforeEach(async () => {
    ({ stakeNFTContract } = await deployAllWithSetting());
  });

  it("Test deploy success", async () => {
    const [deployer, userA, userB, userC] = await ethers.getSigners();
    console.log(`stakeNft contract ${stakeNFTContract.address}`);

    // verify init
    expect(await stakeNFTContract.owner()).equals(deployer.address);
  });
});
