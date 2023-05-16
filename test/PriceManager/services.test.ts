import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, network, upgrades } from "hardhat";
import { deployAllWithSetting } from "../deploy";

const { expectRevert } = require("@openzeppelin/test-helpers");

describe("PriceManager Service Test", function () {
  let priceManagerContract: Contract;

  this.beforeEach(async () => {
    ({ priceManagerContract } = await deployAllWithSetting());
  });

  it("Test Fetch Price functions", async () => {
    const [deployer, stakeManager, userA, userB, userC] = await ethers.getSigners();
    const price = await priceManagerContract.functions.getNativePrice();
    console.log(price);
  });
});
