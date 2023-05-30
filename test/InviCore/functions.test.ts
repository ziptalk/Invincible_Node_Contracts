import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { deployAllWithSetting } from "../deploy";
import units from "../units.json";
import { testAddressBfc } from "../../scripts/testAddresses/address.bfc";
import { currentNetwork } from "../currentNetwork";

let network = currentNetwork; // BIFROST, KLAYTN, EVMOS

describe("Invi Core functions Test", function () {
  let inviTokenContract: Contract;
  let iLPTokenContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let inviCoreContract: Contract;

  this.beforeAll(async function () {
    // for testnet test
    if (network === "BIFROST") {
      inviCoreContract = await ethers.getContractAt("BfcInviCore", testAddressBfc.inviCoreContractAddress);
      inviTokenContract = await ethers.getContractAt("InviToken", testAddressBfc.inviTokenContractAddress);
      iLPTokenContract = await ethers.getContractAt("ILPToken", testAddressBfc.iLPTokenContractAddress);
      stakeNFTContract = await ethers.getContractAt("StakeNFT", testAddressBfc.stakeNFTContractAddress);
      lpPoolContract = await ethers.getContractAt("BfcLiquidityProviderPool", testAddressBfc.lpPoolContractAddress);
    } else {
      ({ inviCoreContract, inviTokenContract, iLPTokenContract, stakeNFTContract, lpPoolContract } = await deployAllWithSetting());
    }
  });

  it("Test deploy success", async () => {
    console.log("invicore address: ", inviCoreContract.address);
    console.log("inviToken address: ", inviTokenContract.address);
    console.log("iLPToken address: ", iLPTokenContract.address);
    console.log("stakeNFT address: ", stakeNFTContract.address);
    console.log("lpPool address: ", lpPoolContract.address);

    // verify init
    expect(await inviCoreContract.stakeNFTContract()).equals(stakeNFTContract.address);
    expect(await inviCoreContract.lpPoolContract()).equals(lpPoolContract.address);
    expect(await lpPoolContract.inviCoreContract()).equals(inviCoreContract.address);

    // verify owner
    expect(await iLPTokenContract.owner()).equals(lpPoolContract.address);
  });

  it("Test getStakeInfo function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    // lp stake coin
    const lpAmount = 1000000;
    await lpPoolContract.connect(LP).stake({ value: lpAmount });

    const principal = 1000;
    const leverageRatio = 2 * units.leverageUnit;
    const minLockPeriod = await inviCoreContract.functions.getLockPeriod(leverageRatio);
    const lockPeriod = minLockPeriod * 2;
    const stakeInfo = await inviCoreContract.connect(userA).getStakeInfo(userA.address, principal, leverageRatio, lockPeriod);

    //verify stake info
    expect(stakeInfo.user).to.equal(userA.address);
    expect(stakeInfo.principal).to.equal(principal);
    expect(stakeInfo.leverageRatio).to.equal(leverageRatio);
  });

  it("Test getExpectedReward function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    // lp stake coin
    const lpAmount = 100000;
    await lpPoolContract.connect(LP).stake({ value: lpAmount });

    const principal = 1000;
    const lockPeriod = 1000000;
    const expectedReward = await inviCoreContract.connect(userA).getExpectedReward(principal, lockPeriod);

    console.log("expected reward: ", expectedReward);
  });
});
