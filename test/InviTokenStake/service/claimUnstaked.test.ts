import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import hre from "hardhat";
import { initializeContracts } from "../../utils/initializeContracts";

const network: string = hre.network.name; // BIFROST, KLAYTN, EVMOS
console.log("current Network: ", network);

describe("InviTokenStake service test", function () {
  let inviTokenContract: Contract;
  let inviTokenStakeContract: Contract;

  before(async function () {
    const contracts = await initializeContracts(network, ["InviTokenStake", "InviToken"]);

    inviTokenContract = contracts["InviCore"];
    inviTokenStakeContract = contracts["StakeNFT"];
  });

  it("Test claim Unstaked function", async () => {
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
    // get request unstake amount
    const unstakeRequestAmount = await inviTokenStakeContract.connect(userA).unstakeRequestAmount(userA.address);
    console.log("unstakeRequestAmount: ", unstakeRequestAmount.toString());
    const claimableUnstakeAmount = await inviTokenStakeContract.connect(userA).claimableUnstakeAmount(userA.address);
    console.log("claimableUnstakeAmount: ", claimableUnstakeAmount.toString());
    // get unstake request time userA
    const prevUnstakeRequestTimeUserA = await inviTokenStakeContract.connect(userA).unstakeRequestTime(userA.address);
    console.log(" prevunstakeRequestTimeUserA: ", prevUnstakeRequestTimeUserA.toString());
    // get unstake period
    const unstakePeriod = await inviTokenStakeContract.unstakePeriod();
    console.log("unstakePeriod: ", unstakePeriod.toString());
    // compare current timestamp and unstake end time
    const currentTimestamp = await ethers.provider.getBlock("latest").then((block) => block.timestamp);
    console.log("currentTimestamp: ", currentTimestamp.toString());
    const unstakeEndTime = prevUnstakeRequestTimeUserA.add(unstakePeriod);
    console.log("unstakeEndTime: ", unstakeEndTime.toString());
    //* when
    try {
      // claim unstaked
      const claimUnstaked = await inviTokenStakeContract.connect(userA).claimUnstaked();
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
