import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { deployInviToken, deployILPToken, deployLpPoolContract, deployAllWithSetting } from "../../deploy";
import { provideLiquidity } from "../../utils";
import { testAddressBfc } from "../../../scripts/testAddresses/address.bfc";
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
    if (network === "BIFROST") {
      inviCoreContract = await ethers.getContractAt("BfcInviCore", testAddressBfc.inviCoreContractAddress);
      inviTokenContract = await ethers.getContractAt("InviToken", testAddressBfc.inviTokenContractAddress);
      lpPoolContract = await ethers.getContractAt("BfcLiquidityProviderPool", testAddressBfc.lpPoolContractAddress);
    } else {
      ({ inviCoreContract, inviTokenContract, lpPoolContract } = await deployAllWithSetting());
    }
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
    expect(await lpPoolContract.totalStakedAmount()).to.equal(userAStakedAmount + userBStakedAmount + userCStakedAmount);
    expect(await lpPoolContract.stakedAmount(userA.address)).to.equal(userAStakedAmount);
    expect(await lpPoolContract.stakedAmount(userB.address)).to.equal(userBStakedAmount);
    expect(await lpPoolContract.stakedAmount(userC.address)).to.equal(userCStakedAmount);
  });

  it("Test distribute Reward", async function () {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    //* given
    const totalStakedAmount = 1000000;
    const userAStakedAmount = Math.floor(totalStakedAmount * 0.2);
    const userBStakedAmount = Math.floor(totalStakedAmount * 0.3);
    const userCStakedAmount = Math.floor(totalStakedAmount * 0.5);

    await provideLiquidity(lpPoolContract, userA, userAStakedAmount, nonceUserA); // lp stake
    await provideLiquidity(lpPoolContract, userB, userBStakedAmount, nonceUserB); // lp stake
    await provideLiquidity(lpPoolContract, userC, userCStakedAmount, nonceUserC); // lp stake

    const initUserABalance = await userA.getBalance();
    const initUserBBalance = await userB.getBalance();
    const initUserCBalance = await userC.getBalance();

    //* when
    const rewardAmount = 100000;
    const tx = await deployer.sendTransaction({ to: inviCoreContract.address, value: rewardAmount, gasLimit: 300000 }); // send coin with tx fee to contract
    await inviCoreContract.connect(deployer).createUnstakeRequest(lpPoolContract.address, rewardAmount, 0, 1); // create unstake request
    await inviCoreContract.connect(stakeManager).sendUnstakedAmount(); // send coin to lpPoolContract

    //* then
    expect(await inviCoreContract.getUnstakeRequestsLength()).to.equal(0);
    expect(await lpPoolContract.nativeRewardAmount(userA.getAddress())).to.equal(rewardAmount * 0.2);
    expect(await lpPoolContract.nativeRewardAmount(userB.getAddress())).to.equal(rewardAmount * 0.3);
    expect(await lpPoolContract.nativeRewardAmount(userC.getAddress())).to.equal(rewardAmount * 0.5);
    expect(await userA.getBalance()).to.equal(initUserABalance.add(rewardAmount * 0.2));
    expect(await userB.getBalance()).to.equal(initUserBBalance.add(rewardAmount * 0.3));
    expect(await userC.getBalance()).to.equal(initUserCBalance.add(rewardAmount * 0.5));
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
