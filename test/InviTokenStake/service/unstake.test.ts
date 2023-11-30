import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
import hre from "hardhat";
import { units } from "../../units";
import { getTestAddress } from "../../utils/getTestAddress";

interface UnstakeRequest {
  recipient: string;
  amount: BigNumber;
  fee: BigNumber;
  requestType: BigNumber;
}

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

  it("Test stake function", async () => {
    const [deployer, LP, userA, userB, userC] = await ethers.getSigners();

    // contract addresses

    //* given
    // stake amount
    const stakeAmount: BigNumber = ethers.utils.parseEther("0.001");
    const sendInvi = await inviTokenContract.connect(deployer).sendInvi(userA.address, stakeAmount);
    await sendInvi.wait();
    // get inviToken balance
    const inviTokenBalance = await inviTokenContract.balanceOf(userA.address);
    console.log("inviTokenBalance userA: ", inviTokenBalance.toString());
    // get inviTokenStake balance
    const inviTokenStakeBalance = await inviTokenContract.balanceOf(inviTokenStake.address);
    console.log("inviTokenStakeBalance: ", inviTokenStakeBalance.toString());
    // previous stake amount userA
    const previousStakedAmountUserA = await inviTokenStake.connect(userA).stakedAmount(userA.address);
    console.log("previousStakedAmountUserA: ", previousStakedAmountUserA.toString());
    // previous total staked amount
    const previousTotalStakedAmount = await inviTokenStake.totalStakedAmount();
    console.log("previousTotalStakedAmount: ", previousTotalStakedAmount.toString());

    const stake = await inviTokenStake.connect(userA).stake(stakeAmount, { nonce: nonceUserA++ });
    await stake.wait();
    console.log("submitted stake");

    // get claimable unstake amount
    const prevClaimableUnstakeAmount = await inviTokenStake.connect(userA).claimableUnstakeAmount(userA.address);
    console.log(" prevclaimableUnstakeAmount: ", prevClaimableUnstakeAmount.toString());
    // get unstake request amount userA
    const prevUnstakeRequestAmountUserA = await inviTokenStake.connect(userA).unstakeRequestAmount(userA.address);
    console.log(" prevunstakeRequestAmountUserA: ", prevUnstakeRequestAmountUserA.toString());
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
      // unstake amount (half)
      const unstakeAmount: BigNumber = stakeAmount.div(2);

      //   // cancel unstake if there is ongoing
      //   const cancelUnstake = await inviTokenStake.connect(userA).cancelUnstake({ nonce: nonceUserA++ });
      //   await cancelUnstake.wait();

      // request Unstake
      const requestUnstake = await inviTokenStake.connect(userA).requestUnstake(unstakeAmount, { nonce: nonceUserA++ });
      await requestUnstake.wait();

      //   // claim unstaked
      //   const claimUnstaked = await inviTokenStake.connect(userA).claimUnstaked({ nonce: nonceUserA++ });
      //   await claimUnstaked.wait();
    } catch (error) {
      console.log(error);
    }

    //* then
    // get claimable unstake amount
    const currentClaimableUnstakeAmount = await inviTokenStake.connect(userA).claimableUnstakeAmount(userA.address);
    console.log("current claimableUnstakeAmount: ", currentClaimableUnstakeAmount.toString());
    // get unstake request amount userA
    const currentUnstakeRequestAmountUserA = await inviTokenStake.connect(userA).unstakeRequestAmount(userA.address);
    console.log("current unstakeRequestAmountUserA: ", currentUnstakeRequestAmountUserA.toString());
    // get unstake request time userA
    const currentUnstakeRequestTimeUserA = await inviTokenStake.connect(userA).unstakeRequestTime(userA.address);
    console.log("current unstakeRequestTimeUserA: ", currentUnstakeRequestTimeUserA.toString());
    // get staked amount userA
    const totalStakedAmount = await inviTokenStake.totalStakedAmount();
    console.log("totalStakedAmount: ", totalStakedAmount.toString());
    const stakedAmountUserA = await inviTokenStake.connect(userA).stakedAmount(userA.address);
    console.log("stakedAmountUserA: ", stakedAmountUserA.toString());

    // // expect userA staked amount to increase
    // expect(stakedAmountUserA).to.equal(previousStakedAmountUserA.sub(stakeAmount));
    // // expect total staked amount to increase
    // expect(totalStakedAmount).to.equal(previousTotalStakedAmount.sub(stakeAmount));
  });
});
