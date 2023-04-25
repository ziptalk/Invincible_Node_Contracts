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

    let sendKlay = 10000000000;
    let liquidityAmount = 10000000000000;
    const slippage = 3 * units.slippageUnit;

    // mint token to userA
    await inviTokenContract.connect(deployer).mintToken(userA.address, liquidityAmount);

    // check userA balances
    let inviBalance = await inviTokenContract.balanceOf(userA.address);
    let klayBalance = await ethers.provider.getBalance(userA.address);
    console.log("initial state UserA");
    console.log("invi: ", inviBalance.toString(), "klay: ", klayBalance.toString());

    // add liquidity
    // await inviTokenContract.connect(deployer).mintToken(userB.address, liquidityAmount);
    await inviTokenContract.connect(userA).approve(inviSwapPoolContract.address, liquidityAmount);
    const expectedInInvi = await inviSwapPoolContract.functions.getAddLiquidityInvi(liquidityAmount);
    console.log("expected Invi: ", expectedInInvi);

    await inviSwapPoolContract.connect(userA).functions.addLiquidity(expectedInInvi.toString(), slippage, { value: liquidityAmount });

    // check pool state
    let totalLiquidityKlay = await inviSwapPoolContract.connect(userA).totalLiquidityKlay();
    let totalLiquidityInvi = await inviSwapPoolContract.connect(userA).totalLiquidityInvi();
    console.log("total liquidity klay: ", totalLiquidityKlay.toString());
    console.log("total liquidity invi: ", totalLiquidityInvi.toString());

    // check balances
    inviBalance = await inviTokenContract.balanceOf(userB.address);
    klayBalance = await ethers.provider.getBalance(userB.address);
    console.log("initial state");
    console.log("invi: ", inviBalance.toString(), "klay: ", klayBalance.toString());

    // swap Klay to invi
    await inviSwapPoolContract.connect(userB).functions.swapKlayToInvi(sendKlay / 4, { value: sendKlay });

    // check balances
    inviBalance = await inviTokenContract.balanceOf(userB.address);
    klayBalance = await ethers.provider.getBalance(userB.address);
    console.log("after swap klay to invi " + sendKlay + "(klay)");
    console.log("invi: ", inviBalance.toString(), "klay: ", klayBalance.toString());

    // swap invi to klay
    await inviTokenContract.connect(userB).approve(inviSwapPoolContract.address, liquidityAmount);
    await inviSwapPoolContract.connect(userB).functions.swapInviToKlay(inviBalance, inviBalance - sendKlay / 2);

    // check balances
    inviBalance = await inviTokenContract.balanceOf(userB.address);
    klayBalance = await ethers.provider.getBalance(userB.address);
    console.log("after swap invi to klay " + inviBalance + "(invi)");
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

    // swap Klay to invi
    await inviSwapPoolContract.connect(userB).functions.swapKlayToInvi(sendKlay / 2, { value: sendKlay });

    // remove liquidity
    const userAisptBalance = ethers.BigNumber.from((await iSPTTokenContract.balanceOf(userA.address)) / 2);
    const expectedAmountOut = await inviSwapPoolContract.functions.getExpectedAmountsOutRemoveLiquidity(userAisptBalance);
    await iSPTTokenContract.connect(userA).approve(inviSwapPoolContract.address, userAisptBalance);
    await inviSwapPoolContract.connect(userA).removeLiquidity(userAisptBalance, expectedAmountOut[0], expectedAmountOut[1], slippage);

    // check liquidity after remove liquidity
    klayLiquidity = await inviSwapPoolContract.functions.totalLiquidityKlay();
    inviLiquidity = await inviSwapPoolContract.functions.totalLiquidityInvi();
    console.log("klay liquidity: ", klayLiquidity.toString(), "invi liquidity: ", inviLiquidity.toString());

    // check userState after remove liquidity
    inviBalance = await inviTokenContract.balanceOf(userA.address);
    klayBalance = await ethers.provider.getBalance(userA.address);
    console.log("after remove liquidity userA");
    console.log("invi: ", inviBalance.toString(), "klay: ", klayBalance.toString());

    // get fees status
    const inviFees = await inviSwapPoolContract.functions.totalRewardInvi();
    const klayFees = await inviSwapPoolContract.functions.totalRewardKlay();
    console.log("invi fees: ", inviFees.toString(), "klay fees: ", klayFees.toString());
    let userAInviReward = await inviSwapPoolContract.connect(userA).lpRewardInvi(userA.address);
    console.log("userA fees: ", userAInviReward.toString());
    let userAKlayReward = await inviSwapPoolContract.connect(userA).lpRewardKlay(userA.address);
    console.log("userA fees: ", userAKlayReward.toString());

    // get contract status
    const inviBalanceInContract = await inviTokenContract.balanceOf(inviSwapPoolContract.address);
    const klayBalanceInContract = await ethers.provider.getBalance(inviSwapPoolContract.address);
    console.log("invi balance in contract: ", inviBalanceInContract.toString());
    console.log("klay balance in contract: ", klayBalanceInContract.toString());

    // withdraw fees
    await inviSwapPoolContract.connect(userA).withdrawFees();
    inviBalance = await inviTokenContract.balanceOf(userA.address);
    klayBalance = await ethers.provider.getBalance(userA.address);
    console.log("after withdraw fees userA");
    console.log("invi: ", inviBalance.toString(), "klay: ", klayBalance.toString());

    // get pool status
    const inviBalanceInPool = await inviTokenContract.balanceOf(inviSwapPoolContract.address);
    const klayBalanceInPool = await ethers.provider.getBalance(inviSwapPoolContract.address);
    console.log("invi balance in pool: ", inviBalanceInPool.toString());
    console.log("klay balance in pool: ", klayBalanceInPool.toString());
  });
});
