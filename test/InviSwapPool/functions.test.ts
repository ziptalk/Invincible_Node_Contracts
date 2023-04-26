import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, network, upgrades } from "hardhat";
import { deployAllWithSetting } from "../deploy";
import Web3 from "web3";
import units from "../units.json";

const { expectRevert } = require("@openzeppelin/test-helpers");

describe("InviSwapPool Service Test", function () {
  let inviSwapPoolContract: Contract;
  let inviTokenContract: Contract;
  let iSPTTokenContract: Contract;
  let priceManagerContract: Contract;

  this.beforeEach(async () => {
    ({ inviTokenContract, inviSwapPoolContract, iSPTTokenContract, priceManagerContract } = await deployAllWithSetting());
  });

  it("Test Swap functions", async () => {
    const [deployer, stakeManager, userA, userB, userC] = await ethers.getSigners();
    const owner = await inviSwapPoolContract.functions.owner();

    //* given
    let liquidityAmountKlay = 10000000000000;
    const slippage = 5 * units.slippageUnit;

    // mint token to userA and userC
    await inviTokenContract.connect(deployer).mintToken(userA.address, liquidityAmountKlay * 100);
    await inviTokenContract.connect(deployer).mintToken(userC.address, liquidityAmountKlay * 100);

    // check userA balances
    let inviBalance = await inviTokenContract.balanceOf(userA.address);
    let klayBalance = await ethers.provider.getBalance(userA.address);
    console.log("initial state UserA");
    console.log("invi: ", inviBalance.toString(), "klay: ", klayBalance.toString());

    // set prices
    await priceManagerContract.setInviPrice(1000000000000);
    await priceManagerContract.setKlayPrice(200000000000);

    //* when
    // add liquidity
    // await inviTokenContract.connect(deployer).mintToken(userB.address, liquidityAmount);
    const expectedInInvi = await inviSwapPoolContract.functions.getAddLiquidityInvi(liquidityAmountKlay);
    console.log("Klay input   : ", liquidityAmountKlay);
    console.log("expected Invi: ", expectedInInvi.toString());

    // user A add liquidty
    await inviTokenContract.connect(userA).approve(inviSwapPoolContract.address, expectedInInvi.toString());
    await inviSwapPoolContract.connect(userA).functions.addLiquidity(expectedInInvi.toString(), slippage, { value: liquidityAmountKlay });

    // user C add liquidity
    await inviTokenContract.connect(userC).approve(inviSwapPoolContract.address, expectedInInvi.toString());
    await inviSwapPoolContract.connect(userC).functions.addLiquidity(expectedInInvi.toString(), slippage, { value: liquidityAmountKlay });
  });
});
