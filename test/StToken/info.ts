import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
const { expectRevert } = require("@openzeppelin/test-helpers");
import hre from "hardhat";
import { getTestAddress } from "../getTestAddress";

describe("LpPool service test", function () {
  let stTokenContract: Contract;
  let inviCoreContract: Contract;

  const network: string = hre.network.name;
  const testAddresses: any = getTestAddress(network);

  this.beforeAll(async function () {
    stTokenContract = await ethers.getContractAt("IStKlay", testAddresses.klaytnLiquidStaking);
    inviCoreContract = await ethers.getContractAt("InviCore", testAddresses.inviCoreContractAddress);
  });

  it("Test functions", async () => {
    //console.log(stTokenContract);

    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    const balanceOfInviCore = await stTokenContract.balanceOf(inviCoreContract.address);
    console.log("balanceOfInviCore: ", (balanceOfInviCore / 10 ** 18).toString());
  });
});
