import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
const { expectRevert } = require("@openzeppelin/test-helpers");
import hre from "hardhat";
import { units } from "../units";
import { getTestAddress } from "../getTestAddress";

describe("LpPool service test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;

  const network: string = hre.network.name;
  const testAddresses: any = getTestAddress(network);

  this.beforeAll(async function () {
    // for testnet test

    inviCoreContract = await ethers.getContractAt("InviCore", testAddresses.inviCoreContractAddress);
    stakeNFTContract = await ethers.getContractAt("StakeNFT", testAddresses.stakeNFTContractAddress);
    lpPoolContract = await ethers.getContractAt("LiquidityProviderPool", testAddresses.lpPoolContractAddress);
  });

  it("Test functions", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    console.log("deployer: ", deployer.address);
    console.log("stakeManager: ", stakeManager.address);
    console.log("LP: ", LP.address);
    console.log("userA: ", userA.address);

    let nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    let nonceLP = await ethers.provider.getTransactionCount(LP.address);
    let nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    let tx;

    console.log("nonce lp: ", nonceLP);

    //* given

    //* when
    // get total staked amount
    const totalStakedAmount = await lpPoolContract.connect(LP).totalStakedAmount();
    console.log("totalStakedAmount: ", totalStakedAmount.toString());
    // get stake amount
    const stakedAmount = await lpPoolContract.connect(LP).stakedAmount(LP.address);
    console.log("stakedAmount: ", stakedAmount.toString());
    // get max lent amount
    const maxLentAmount = await lpPoolContract.connect(LP).getMaxLentAmount();
    console.log("maxLentAmount: ", maxLentAmount.toString());
    // get rewardAmount
    const rewardAmount = await lpPoolContract.connect(LP).getRewardAmount();
    console.log("rewardAmount: ", rewardAmount.toString());
    //* then
  });
});
