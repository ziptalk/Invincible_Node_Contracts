import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, network, upgrades } from "hardhat";
import { deployAllWithSetting } from "../deploy";

const { expectRevert } = require("@openzeppelin/test-helpers");

describe("InviSwapPool Service Test", function () {
  let inviSwapPoolContract: Contract;
  let inviTokenContract: Contract;

  this.beforeEach(async () => {
    ({ inviTokenContract, inviSwapPoolContract } = await deployAllWithSetting());
  });

  it("Test Swap functions", async () => {
    const [deployer, stakeManager, userA, userB, userC] = await ethers.getSigners();
    const owner = await inviSwapPoolContract.functions.owner();
    console.log(owner, deployer.address);

    let inviPrice = 10 ** 18;
    let klayPrice = 10 ** 19;
    // set prices
    await inviSwapPoolContract.functions.setInviPrice();
  });
});
