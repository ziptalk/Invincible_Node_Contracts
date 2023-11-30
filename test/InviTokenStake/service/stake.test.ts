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
    const [deployer, LP, userA, userB, userC] = await ethers.getSigners();

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
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    // contract addresses

    //* given
    // stake amount
    const stakeAmount: BigNumber = ethers.utils.parseEther("0.001");
    const balance = await inviTokenContract.balanceOf(inviTokenContract.address);
    console.log("inviTokenBalance inviTokenContract: ", balance.toString());
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
    // previous total staked amount
    const previousTotalStakedAmount = await inviTokenStake.totalStakedAmount();

    //* when

    const stake = await inviTokenStake.connect(userA).stake(stakeAmount, { nonce: nonceUserA++ });
    await stake.wait();
    console.log("submitted stake");

    //* then
    // get staked amount userA
    const totalStakedAmount = await inviTokenStake.totalStakedAmount();
    console.log("totalStakedAmount: ", totalStakedAmount.toString());
    const stakedAmountUserA = await inviTokenStake.connect(userA).stakedAmount(userA.address);
    console.log("stakedAmountUserA: ", stakedAmountUserA.toString());

    // expect userA staked amount to increase
    expect(stakedAmountUserA).to.equal(previousStakedAmountUserA.add(stakeAmount));
    // expect total staked amount to increase
    expect(totalStakedAmount).to.equal(previousTotalStakedAmount.add(stakeAmount));
  });
});
