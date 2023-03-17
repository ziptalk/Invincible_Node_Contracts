import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { deployInviToken, deployInviTokenStakeContract } from "../deploy";

describe("InviToken Stake Test", function () {
  let inviTokenContract: Contract;
  let inviTokenStakeContract: Contract;

  this.beforeEach(async () => {
    const [deployer, stakeManager, user1, user2, user3] = await ethers.getSigners();

    // deploy inviToken contract
    inviTokenContract = await deployInviToken();

    // deploy inviCore contract
    inviTokenStakeContract = await deployInviTokenStakeContract(stakeManager.address, inviTokenContract);
  });

  it("Test deploy success", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();
    console.log(`invi token contract ${inviTokenContract.address}`);
    console.log(`invi token stake contract ${inviTokenStakeContract.address}`);

    // verify init
    expect(await inviTokenStakeContract.inviToken()).equals(inviTokenContract.address);

    // verify owner
  });
});
