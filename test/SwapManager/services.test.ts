import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, network, upgrades } from "hardhat";
import { deployAllWithSetting } from "../deploy";

const { expectRevert } = require("@openzeppelin/test-helpers");

describe("SwapManager Service Test", function () {
  let swapManagerContract: Contract;

  this.beforeEach(async () => {
    ({ swapManagerContract } = await deployAllWithSetting());
  });

  it("Test Fetch Price functions", async () => {
    const [deployer, stakeManager, userA, userB, userC] = await ethers.getSigners();
    const price = await swapManagerContract.functions.fetchKlayPrice(1);
    console.log(price);
  });
});
