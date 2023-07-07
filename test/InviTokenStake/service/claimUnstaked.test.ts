import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
import hre from "hardhat";
import { units } from "../../units";
import { getTestAddress } from "../../getTestAddress";

const network: string = hre.network.name; // BIFROST, KLAYTN, EVMOS
console.log("current Network: ", network);
const testAddresses: any = getTestAddress(network);

describe("InviTokenStake service test", function () {
  let inviTokenContract: Contract;
  let inviTokenStake: Contract;
  let lpPoolContract: Contract;
  let nonceDeployer;
  let nonceLP: number;
  let nonceUserA: number;
  let nonceUserB: number;
  let nonceUserC: number;
  let tx: any;

  this.beforeAll(async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    nonceLP = await ethers.provider.getTransactionCount(LP.address);
    nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    nonceUserB = await ethers.provider.getTransactionCount(userB.address);
    nonceUserC = await ethers.provider.getTransactionCount(userC.address);
    tx;

    // for testnet test
    inviTokenStake = await ethers.getContractAt("InviTokenStake", testAddresses.inviTokenStakeContractAddress);
    inviTokenContract = await ethers.getContractAt("InviToken", testAddresses.inviTokenContractAddress);
  });

  it("Test claim Unstaked function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    // contract addresses

    //* given
    // stake amount
    const stakeAmount: BigNumber = ethers.utils.parseEther("0.001");
    const sendInvi = await inviTokenContract.connect(deployer).sendInvi(userA.address, stakeAmount);
    await sendInvi.wait();
    // get inviToken balance
    const inviTokenBalance = await inviTokenContract.balanceOf(userA.address);
    console.log("inviTokenBalance userA: ", inviTokenBalance.toString());
    // get request unstake amount
    const unstakeRequestAmount = await inviTokenStake.connect(userA).unstakeRequestAmount(userA.address);
    console.log("unstakeRequestAmount: ", unstakeRequestAmount.toString());
    const claimableUnstakeAmount = await inviTokenStake.connect(userA).claimableUnstakeAmount(userA.address);
    console.log("claimableUnstakeAmount: ", claimableUnstakeAmount.toString());
    // get unstake request time userA
    const prevUnstakeRequestTimeUserA = await inviTokenStake.connect(userA).unstakeRequestTime(userA.address);
    console.log(" prevunstakeRequestTimeUserA: ", prevUnstakeRequestTimeUserA.toString());
    // get unstake period
    const unstakePeriod = await inviTokenStake.unstakePeriod();
    console.log("unstakePeriod: ", unstakePeriod.toString());
    // compare current timestamp and unstake end time
    const currentTimestamp = await ethers.provider.getBlock("latest").then((block) => block.timestamp);
    console.log("currentTimestamp: ", currentTimestamp.toString());
    const unstakeEndTime = prevUnstakeRequestTimeUserA.add(unstakePeriod);
    console.log("unstakeEndTime: ", unstakeEndTime.toString());
    //* when
    try {
      // claim unstaked
      const claimUnstaked = await inviTokenStake.connect(userA).claimUnstaked({ nonce: nonceUserA++ });
      await claimUnstaked.wait();
    } catch (error) {
      console.log(error);
    }

    //* then
    // get current inviToken balance
    const currentInviTokenBalance = await inviTokenContract.balanceOf(userA.address);

    // expect userA token balance to increase
    expect(currentInviTokenBalance).to.equal(unstakeRequestAmount.add(claimableUnstakeAmount).add(inviTokenBalance));
  });
});
