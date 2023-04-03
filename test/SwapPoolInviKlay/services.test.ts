import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, network, upgrades } from "hardhat";
import {
  deployInviToken,
  deployILPToken,
  deployStakeNFT,
  deployLpPoolContract,
  deployInviCoreContract,
  deployInviTokenStakeContract,
  deployStKlay,
  deployAllWithSetting,
} from "../deploy";
import units from "../units.json";
import { provideLiquidity, leverageStake } from "../utils";

const { expectRevert } = require("@openzeppelin/test-helpers");

describe("SwapPoolInviKlay Service Test", function () {
  let swapPoolInviKlay: Contract;
  let inviTokenContract: Contract;

  this.beforeEach(async () => {
    [inviTokenContract, swapPoolInviKlay] = await deployAllWithSetting();
  });

  it("Test stake function", async () => {});
});
