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
    let sendKlay = 10000000000;
    let liquidityAmount = 10000000000000;
    const slippage = 10 * units.slippageUnit;

    // mint token to userA and userC
    await inviTokenContract.connect(deployer).mintToken(userA.address, liquidityAmount * 100);
    await inviTokenContract.connect(deployer).mintToken(userC.address, liquidityAmount * 100);

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
    const expectedInInvi = await inviSwapPoolContract.functions.getAddLiquidityInvi(liquidityAmount);
    console.log("expected Invi: ", expectedInInvi);

    // user A add liquidty
    await inviTokenContract.connect(userA).approve(inviSwapPoolContract.address, expectedInInvi.toString());
    await inviSwapPoolContract.connect(userA).functions.addLiquidity(expectedInInvi.toString(), slippage, { value: liquidityAmount });

    // user C add liquidity
    await inviTokenContract.connect(userC).approve(inviSwapPoolContract.address, expectedInInvi.toString());
    await inviSwapPoolContract.connect(userC).functions.addLiquidity(expectedInInvi.toString(), slippage, { value: liquidityAmount });

    // check pool state
    let totalLiquidityKlay = await inviSwapPoolContract.connect(userA).totalLiquidityKlay();
    let totalLiquidityInvi = await inviSwapPoolContract.connect(userA).totalLiquidityInvi();
    console.log("total liquidity klay: ", totalLiquidityKlay.toString());
    console.log("total liquidity invi: ", totalLiquidityInvi.toString());

    // check balances
    inviBalance = await inviTokenContract.balanceOf(userB.address);
    klayBalance = await ethers.provider.getBalance(userB.address);
    console.log("user B initial state");
    console.log("invi: ", inviBalance.toString(), "klay: ", klayBalance.toString());

    // swap Klay to invi
    await inviSwapPoolContract.connect(userB).functions.swapKlayToInvi(sendKlay / 4, { value: sendKlay });

    // check balances
    inviBalance = await inviTokenContract.balanceOf(userB.address);
    klayBalance = await ethers.provider.getBalance(userB.address);
    console.log("after swap klay to invi User B" + sendKlay + "(klay)");
    console.log("invi: ", inviBalance.toString(), "klay: ", klayBalance.toString());

    // swap invi to klay
    await inviTokenContract.connect(userB).approve(inviSwapPoolContract.address, 1000000000);
    const expectedKlay = await inviSwapPoolContract.connect(userB).functions.getInviToKlayOutAmount(1000000000);
    console.log(expectedKlay);
    await inviSwapPoolContract.connect(userB).functions.swapInviToKlay(1000000000, expectedKlay.toString() - 10000000);

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

    // remove liquidity
    const userAisptBalance = ethers.BigNumber.from(await iSPTTokenContract.balanceOf(userA.address));
    console.log("userAisptbalance: ", userAisptBalance.toString());
    // remove liquidity by subtracting random amount from userA's ispt balance
    const expectedAmountOut = await inviSwapPoolContract.functions.getExpectedAmountsOutRemoveLiquidity(userAisptBalance);
    await iSPTTokenContract.connect(userA).approve(inviSwapPoolContract.address, userAisptBalance);
    console.log("expected amount out: ", expectedAmountOut[0].toString(), expectedAmountOut[1].toString());
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
