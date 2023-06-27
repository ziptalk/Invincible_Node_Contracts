import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
const { expectRevert } = require("@openzeppelin/test-helpers");
import hre from "hardhat";
import { bfcTestAddress } from "../../scripts/addresses/testAddresses/address.bfc";
import { klaytnTestAddress } from "../../scripts/addresses/testAddresses/address.klaytn";
import { evmosTestAddress } from "../../scripts/addresses/testAddresses/address.evmos";
import { units } from "../units";
import { leverageStake, provideLiquidity } from "../utils";
import { getTestAddress } from "../getTestAddress";

describe("Invi core functions test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let inviTokenContract: Contract;
  let iLPTokenContract: Contract;

  const network: string = hre.network.name;
  const testAddresses: any = getTestAddress(network);

  this.beforeAll(async function () {
    // for testnet test
    inviCoreContract = await ethers.getContractAt("InviCore", testAddresses.inviCoreContractAddress);
    inviTokenContract = await ethers.getContractAt("InviToken", testAddresses.inviTokenContractAddress);
    iLPTokenContract = await ethers.getContractAt("ILPToken", testAddresses.iLPTokenContractAddress);
    stakeNFTContract = await ethers.getContractAt("StakeNFT", testAddresses.stakeNFTContractAddress);
    lpPoolContract = await ethers.getContractAt("LiquidityProviderPool", testAddresses.lpPoolContractAddress);
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
    console.log("network: ", network);
    console.log("lp address: ", LP.address);

    console.log(await lpPoolContract.owner());
    console.log(await lpPoolContract.inviCoreContract());
    await lpPoolContract.connect(LP).stake({ value: lpAmount });
    console.log("lp stake completes");

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
