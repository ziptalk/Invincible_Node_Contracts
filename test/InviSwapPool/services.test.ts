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

  this.beforeEach(async () => {
    ({ inviTokenContract, inviSwapPoolContract, iSPTTokenContract } = await deployAllWithSetting());
  });

  it("Test Swap functions", async () => {
    const [deployer, stakeManager, userA, userB, userC] = await ethers.getSigners();
    const owner = await inviSwapPoolContract.functions.owner();

    let sendKlay = 1000000;
    let liquidityAmount = 10000000000000;
    const slippage = 3 * units.slippageUnit;

    // add liquidity
    await inviTokenContract.connect(deployer).mintToken(userA.address, liquidityAmount);
    // await inviTokenContract.connect(deployer).mintToken(userB.address, liquidityAmount);
    await inviTokenContract.connect(userA).approve(inviSwapPoolContract.address, liquidityAmount);
    const expectedInInvi = await inviSwapPoolContract.functions.getAddLiquidityInvi(liquidityAmount);
    console.log("expected Invi: ", expectedInInvi);

    await inviSwapPoolContract.connect(userA).functions.addLiquidity(expectedInInvi.toString(), slippage, { value: liquidityAmount });

    // check balances
    let inviBalance = await inviTokenContract.balanceOf(userB.address);
    let klayBalance = await ethers.provider.getBalance(userB.address);
    console.log("invi: ", inviBalance.toString(), "klay: ", klayBalance.toString());

    // swap Klay to invi
    await inviSwapPoolContract.connect(userB).functions.swapKlayToInvi(sendKlay / 4, { value: sendKlay });

    // check balances
    inviBalance = await inviTokenContract.balanceOf(userB.address);
    klayBalance = await ethers.provider.getBalance(userB.address);
    console.log("invi: ", inviBalance.toString(), "klay: ", klayBalance.toString());

    // swap invi to klay
    await inviTokenContract.connect(userB).approve(inviSwapPoolContract.address, liquidityAmount);
    await inviSwapPoolContract.connect(userB).functions.swapInviToKlay(inviBalance, inviBalance / 10);

    // check balances
    inviBalance = await inviTokenContract.balanceOf(userB.address);
    klayBalance = await ethers.provider.getBalance(userB.address);
    console.log("invi: ", inviBalance.toString(), "klay: ", klayBalance.toString());

    // check lp rewards
    let lpRewardKlay = await inviSwapPoolContract.connect(userA).lpRewardKlay(userA.address);
    console.log("userA lp klay reward: ", lpRewardKlay.toString());
    let lpRewardInvi = await inviSwapPoolContract.connect(userA).lpRewardInvi(userA.address);
    console.log("userA lp invi reward: ", lpRewardInvi.toString());

    // check current liquidity
    let klayLiquidity = await inviSwapPoolContract.functions.totalLiquidityKlay();
    let inviLiquidity = await inviSwapPoolContract.functions.totalLiquidityInvi();
    console.log("klay liquidity: ", klayLiquidity.toString(), "invi liquidity: ", inviLiquidity.toString());

    // // remove liquidity
    // const userAisptBalance = ethers.BigNumber.from(await iSPTTokenContract.balanceOf(userA.address)).div(5);
    // await iSPTTokenContract.connect(userA).approve(inviSwapPoolContract.address, userAisptBalance);
    // await inviSwapPoolContract.connect(userA).removeLiquidity(userAisptBalance, 0, 0);

    // // check liquidity after remove liquidity
    // klayLiquidity = await inviSwapPoolContract.functions.totalLiquidityKlay();
    // inviLiquidity = await inviSwapPoolContract.functions.totalLiquidityInvi();
    // console.log("klay liquidity: ", klayLiquidity.toString(), "invi liquidity: ", inviLiquidity.toString());
  });
});
