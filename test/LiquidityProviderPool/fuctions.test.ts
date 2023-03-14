import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { deployInviToken, deployILPToken, deployLpPoolContract } from "../deploy";

describe("Liquidity Provider Pool Test", function () {
  let lpPoolContract: Contract;
  let iLPTokenContract: Contract;
  let inviTokenContract: Contract;

  this.beforeEach(async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    // deploy ILPToken contract
    iLPTokenContract = await deployILPToken();
    // deploy inviToken contract
    inviTokenContract = await deployInviToken();
    // deploy liquidity pool contract
    lpPoolContract = await deployLpPoolContract(iLPTokenContract, inviTokenContract);
    // change ILPToken owner
    await iLPTokenContract.connect(deployer).transferOwnership(lpPoolContract.address);
  });

  it("Test deploy success", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();
    console.log(`iLP token contract ${iLPTokenContract.address}`);
    console.log(`LP Pool contract ${lpPoolContract.address}`);

    // verify init
    expect(await lpPoolContract.iLP()).equals(iLPTokenContract.address);

    // verify owner
    expect(await iLPTokenContract.owner()).equals(lpPoolContract.address);
  });
});
