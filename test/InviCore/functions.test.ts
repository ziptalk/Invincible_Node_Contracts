import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import {
  deployInviToken,
  deployILPToken,
  deployStakeNFT,
  deployLpPoolContract,
  deployInviCoreContract,
  deployInviTokenStakeContract,
  deployStKlay,
} from "../deploy";
import units from "../units.json";

describe("Invi Core functions Test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let iLPTokenContract: Contract;
  let inviTokenContract: Contract;
  let inviTokenStakeContract: Contract;
  let stKlayContract: Contract;

  this.beforeEach(async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    // deploy stKlay contract
    stKlayContract = await deployStKlay();
    // deploy inviToken contract
    inviTokenContract = await deployInviToken();
    // deploy ILPToken contract
    iLPTokenContract = await deployILPToken();
    // deploy stakeNFT contract
    stakeNFTContract = await deployStakeNFT();
    // deploy inviTokenStake Contract
    inviTokenStakeContract = await deployInviTokenStakeContract(stakeManager.address, inviTokenContract);
    // deploy liquidity pool contract
    lpPoolContract = await deployLpPoolContract(stakeManager.address, iLPTokenContract, inviTokenContract);
    // deploy inviCore contract
    inviCoreContract = await deployInviCoreContract(stakeManager.address, stakeNFTContract, lpPoolContract, inviTokenStakeContract, stKlayContract);
    +(
      // change stakeNFT owner
      (await stakeNFTContract.connect(deployer).transferOwnership(inviCoreContract.address))
    );

    // change ILPToken owner
    await iLPTokenContract.connect(deployer).transferOwnership(lpPoolContract.address);

    // change inviToken owner
    await inviTokenContract.connect(deployer).transferOwnership(lpPoolContract.address);

    // set inviCore contract address
    await lpPoolContract.connect(deployer).setInviCoreAddress(inviCoreContract.address);
  });

  it("Test deploy success", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();
    console.log(`invi token contract ${inviTokenContract.address}`);
    console.log(`iLP token contract ${iLPTokenContract.address}`);
    console.log(`stakeNft contract ${stakeNFTContract.address}`);
    console.log(`lpPool contract ${lpPoolContract.address}`);
    console.log(`invi core contract ${inviCoreContract.address}`);

    // verify init
    expect(await inviCoreContract.stakeNFTContract()).equals(stakeNFTContract.address);
    expect(await inviCoreContract.lpPoolContract()).equals(lpPoolContract.address);
    expect(await lpPoolContract.INVI_CORE()).equals(inviCoreContract.address);

    // verify owner
    expect(await stakeNFTContract.owner()).equals(inviCoreContract.address);
    expect(await iLPTokenContract.owner()).equals(lpPoolContract.address);
  });

  it("Test getStakeInfo function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    // lp stake coin
    const lpAmount = 100000;
    await lpPoolContract.connect(LP).stake({ value: lpAmount });

    const principal = 1000;
    const leverageRatio = 2 * units.leverageUnit;
    const stakeInfo = await inviCoreContract.connect(userA).getStakeInfo(principal, leverageRatio);

    //verify stake info
    expect(stakeInfo.user).to.equal(userA.address);
    expect(stakeInfo.principal).to.equal(principal);
    expect(stakeInfo.leverageRatio).to.equal(leverageRatio);
  });
});
