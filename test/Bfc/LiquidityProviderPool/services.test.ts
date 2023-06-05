import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { deployInviToken, deployILPToken, deployLpPoolContract, deployAllWithSetting } from "../../deploy";
import { provideLiquidity } from "../../utils";
import { testAddressBfc } from "../../../scripts/addresses/testAddresses/address.bfc";
import { currentNetwork } from "../../currentNetwork";

let network = currentNetwork; // BIFROST, KLAYTN, EVMOS, LOCAL

describe("Liquidity Provider Pool Test", function () {
  let inviCoreContract: Contract;
  let lpPoolContract: Contract;
  let inviTokenContract: Contract;

  let nonceDeployer: number;
  let nonceLP: number;
  let nonceUserA: number;
  let nonceUserB: number;
  let nonceUserC: number;
  let tx;

  this.beforeAll(async function () {
    // for testnet test
    inviCoreContract = await ethers.getContractAt("BfcInviCore", testAddressBfc.inviCoreContractAddress);
    inviTokenContract = await ethers.getContractAt("InviToken", testAddressBfc.inviTokenContractAddress);
    lpPoolContract = await ethers.getContractAt("BfcLiquidityProviderPool", testAddressBfc.lpPoolContractAddress);
  });

  it("Test LP Stake", async function () {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    //* given
    const userAStakedAmount = 100000;
    const userBStakedAmount = 200000;
    const userCStakedAmount = 300000;

    //* when
    await provideLiquidity(lpPoolContract, userA, userAStakedAmount, nonceUserA); // lp stake
    await provideLiquidity(lpPoolContract, userB, userBStakedAmount, nonceUserB); // lp stake
    await provideLiquidity(lpPoolContract, userC, userCStakedAmount, nonceUserC); // lp stake

    //* then
    expect(await lpPoolContract.stakedAmount(userA.address)).to.equal(userAStakedAmount);
    expect(await lpPoolContract.stakedAmount(userB.address)).to.equal(userBStakedAmount);
    expect(await lpPoolContract.stakedAmount(userC.address)).to.equal(userCStakedAmount);
  });

  it("Test distribute Native Reward", async function () {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    //* given
    const initUserABalance = await userA.getBalance();
    const initUserBBalance = await userB.getBalance();
    const initUserCBalance = await userC.getBalance();
    console.log("initUserABalance", initUserABalance.toString());
    console.log("initUserBBalance", initUserBBalance.toString());
    console.log("initUserCBalance", initUserCBalance.toString());

    //* when
    await inviCoreContract.connect(deployer).sendUnstakedAmount({ nonce: nonceDeployer++ }); // send coin to lpPoolContract

    //* then
    const afterUserABalance = await userA.getBalance();
    const afterUserBBalance = await userB.getBalance();
    const afterUserCBalance = await userC.getBalance();
    console.log("afterUserABalance", afterUserABalance.toString());
    console.log("afterUserBBalance", afterUserBBalance.toString());
    console.log("afterUserCBalance", afterUserCBalance.toString());
  });

  it("Test distribute InviToken Reward", async function () {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    //* given
    const totalStakedAmount = 1000000;
    const userAStakedAmount = Math.floor(totalStakedAmount * 0.2);
    const userBStakedAmount = Math.floor(totalStakedAmount * 0.3);
    const userCStakedAmount = Math.floor(totalStakedAmount * 0.5);

    await provideLiquidity(lpPoolContract, userA, userAStakedAmount, nonceUserA); // lp stake
    await provideLiquidity(lpPoolContract, userB, userBStakedAmount, nonceUserB); // lp stake
    await provideLiquidity(lpPoolContract, userC, userCStakedAmount, nonceUserC); // lp stake

    // regular minting
    await inviTokenContract.functions.regularMinting();

    //* when
    await lpPoolContract.connect(deployer).distributeInviTokenReward(); // distribute invi token reward

    //* then
    console.log(await inviTokenContract.balanceOf(userA.getAddress()));
    console.log(await inviTokenContract.balanceOf(userB.getAddress()));
    console.log(await inviTokenContract.balanceOf(userC.getAddress()));
  });
});
