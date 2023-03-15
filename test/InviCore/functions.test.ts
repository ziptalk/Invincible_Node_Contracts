import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { deployInviToken, deployILPToken, deployStakeNFT, deployLpPoolContract, deployInviCoreContract } from "../deploy";

describe("Invi Core functions Test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let iLPTokenContract: Contract;
  let inviTokenContract: Contract;

  this.beforeEach(async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    // deploy inviToken contract
    inviTokenContract = await deployInviToken();
    // deploy ILPToken contract
    iLPTokenContract = await deployILPToken();
    // deploy stakeNFT contract
    stakeNFTContract = await deployStakeNFT();
    // deploy liquidity pool contract
    lpPoolContract = await deployLpPoolContract(stakeManager.address, iLPTokenContract, inviTokenContract);
    // deploy inviCore contract
    inviCoreContract = await deployInviCoreContract(stakeManager.address, stakeNFTContract, lpPoolContract);

    // change stakeNFT owner
    await stakeNFTContract.connect(deployer).transferOwnership(inviCoreContract.address);

    // change ILPToken owner
    await iLPTokenContract.connect(deployer).transferOwnership(lpPoolContract.address);

    // set inviCore contract address
    await lpPoolContract.connect(deployer).setInviCoreAddress(inviCoreContract.address);
  });

  it("Test getStakeInfo function", async () => {
    const [deployer, stakeManager, userA, userB, userC] = await ethers.getSigners();

    const principal = 100;
    const leverageRatio = 2;

    const stakeInfo = await inviCoreContract.connect(userA).getStakeInfo(principal, leverageRatio);

    //verify stake info
    expect(stakeInfo.user).to.equal(userA.address);
    expect(stakeInfo.principal).to.equal(principal);
    expect(stakeInfo.leverageRatio).to.equal(leverageRatio);
  });
});
