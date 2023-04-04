import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, network, upgrades } from "hardhat";
import { deployAllWithSetting } from "../deploy";

const { expectRevert } = require("@openzeppelin/test-helpers");

describe("SwapPoolInviKlay Service Test", function () {
  let swapPoolInviKlay: Contract;
  let inviTokenContract: Contract;

  this.beforeEach(async () => {
    ({ swapPoolInviKlay, inviTokenContract } = await deployAllWithSetting());
  });

  it("Test stake function", async () => {});
});
