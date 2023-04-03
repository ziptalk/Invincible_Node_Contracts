import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { deployAllWithSetting} from "../deploy";

describe("InviToken Stake Test", function () {
  let inviTokenStakeContract: Contract;
  let  inviTokenContract: Contract;

  this.beforeEach(async () => {
    ({inviTokenContract, inviTokenStakeContract} = await deployAllWithSetting());

  
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
