import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, network, upgrades } from "hardhat";
import { deployAllWithSetting } from "../deploy";

const { expectRevert } = require("@openzeppelin/test-helpers");

describe("InviSwapPool Function Test", function () {
  let inviSwapPoolContract: Contract;
  let inviTokenContract: Contract;

  this.beforeEach(async () => {
    ({ inviTokenContract, inviSwapPoolContract } = await deployAllWithSetting());
  });

  it("Test Swap functions", async () => {
    console.log(inviSwapPoolContract.address);
  });
});
