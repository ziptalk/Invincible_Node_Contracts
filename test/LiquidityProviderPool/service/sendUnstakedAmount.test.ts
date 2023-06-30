import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
const { expectRevert } = require("@openzeppelin/test-helpers");
import hre from "hardhat";
import { units } from "../../units";
import { leverageStake, provideLiquidity } from "../../utils";
import { getTestAddress } from "../../getTestAddress";

describe("LpPool service test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;

  const network: string = hre.network.name;
  const testAddresses: any = getTestAddress(network);

  this.beforeAll(async function () {
    // for testnet test

    inviCoreContract = await ethers.getContractAt("InviCore", testAddresses.inviCoreContractAddress);
    stakeNFTContract = await ethers.getContractAt("StakeNFT", testAddresses.stakeNFTContractAddress);
    lpPoolContract = await ethers.getContractAt("LiquidityProviderPool", testAddresses.lpPoolContractAddress);
  });

  it("Test unstake function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    console.log("deployer: ", deployer.address);
    console.log("stakeManager: ", stakeManager.address);
    console.log("LP: ", LP.address);
    console.log("userA: ", userA.address);

    let nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    let nonceLP = await ethers.provider.getTransactionCount(LP.address);
    let nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    let tx;
    console.log("nonce lp: ", nonceLP);

    //* given
    let unstakeRequestFront = await lpPoolContract.connect(LP).unstakeRequestsFront();
    console.log("unstakeRequestFront: ", unstakeRequestFront);
    let unstakeRequestRear = await lpPoolContract.connect(LP).unstakeRequestsRear();
    console.log("unstakeRequestRear: ", unstakeRequestRear);
    for (let i = unstakeRequestFront; i < unstakeRequestRear; i++) {
      let unstakeRequests = await lpPoolContract.connect(LP).unstakeRequests(i);
      console.log("unstakeRequests: ", unstakeRequests.toString());
    }

    // get total native reward amount
    let totalNativeRewardAmount = await lpPoolContract.connect(LP).totalNativeRewardAmount();
    console.log("totalNativeRewardAmount: ", totalNativeRewardAmount.toString());
    // get balance of this contract
    let lpPoolBalance = await ethers.provider.getBalance(lpPoolContract.address);
    console.log("LP Pool Balance: ", lpPoolBalance.toString());

    //* when
    const sendUnstakedAmount = await lpPoolContract.connect(LP).sendUnstakedAmount();
    await sendUnstakedAmount.wait();
    console.log("sent unstaked amount");

    //* then
    // let unstakeRequestFront = await lpPoolContract.connect(LP).unstakeRequestsFront();
    // console.log("unstakeRequestFront: ", unstakeRequestFront);
    // let unstakeRequestRear = await lpPoolContract.connect(LP).unstakeRequestsRear();
    // console.log("unstakeRequestRear: ", unstakeRequestRear);
    // for (let i = unstakeRequestFront; i < unstakeRequestRear; i++) {
    //   let unstakeRequests = await lpPoolContract.connect(LP).unstakeRequests(i);
    //   console.log("unstakeRequests: ", unstakeRequests.toString());
    // }
  });
});
