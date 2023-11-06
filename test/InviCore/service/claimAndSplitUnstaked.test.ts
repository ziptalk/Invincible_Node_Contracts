import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
import hre from "hardhat";
import { units } from "../../units";
import { getTestAddress } from "../../utils/getTestAddress";
import { initializeContracts } from "../../utils/initializeContracts";

interface UnstakeRequest {
  recipient: string;
  amount: BigNumber;
  fee: BigNumber;
  requestType: BigNumber;
}

const network: string = hre.network.name; // BIFROST, KLAYTN, EVMOS
console.log("current Network: ", network);
const testAddresses: any = getTestAddress(network);

describe("Invi core service test", function () {
  let inviCoreContract: Contract;
  let lpPoolContract: Contract;
  let tx: any;

  before(async function () {
    const contracts = await initializeContracts(network, ["InviCore", "LiquidityProviderPool"]);

    inviCoreContract = contracts["InviCore"];
    lpPoolContract = contracts["LiquidityProviderPool"];
  });

  it("Test claim and split unstaked function", async () => {
    const [deployer, LP, userA, userB, userC] = await ethers.getSigners();

    // contract addresses
    console.log("invicore address: ", inviCoreContract.address);
    console.log("lpPool address: ", lpPoolContract.address);

    //* given
    const beforeUnstakeRequestsLength = await inviCoreContract.getUnstakeRequestsLength();
    console.log("beforeUnstakeRequestsLength: ", beforeUnstakeRequestsLength);
    const unstakeRequestFront = await inviCoreContract.unstakeRequestsFront();
    console.log("unstakeRequestFront: ", unstakeRequestFront);
    const unstakeRequestRear = await inviCoreContract.unstakeRequestsRear();
    console.log("unstakeRequestRear: ", unstakeRequestRear);

    //get contract balance
    const inviCoreContractBalance = await ethers.provider.getBalance(inviCoreContract.address);
    console.log("inviCoreContractBalance: ", inviCoreContractBalance.toString());
    const unstakeRequestAmount = await inviCoreContract.unstakeRequestAmount();
    console.log("unstakeRequestAmount   : ", unstakeRequestAmount.toString());
    const totalClaimableAmount = await inviCoreContract.totalClaimableAmount();
    console.log("totalClaimableAmount   : ", totalClaimableAmount.toString());

    // get all unstake requests
    const unstakeRequests: UnstakeRequest[] = [];
    for (let i = unstakeRequestFront; i < unstakeRequestRear; i++) {
      const unstakeRequest = await inviCoreContract.unstakeRequests(i);
      unstakeRequests.push(unstakeRequest.toString());
    }
    console.log("unstakeRequests: ", unstakeRequests);

    //* when
    const ITERATION_COUNT = 200;
    for (let i = 0; i < ITERATION_COUNT; i++) {
      try {
        tx = await inviCoreContract.connect(deployer).claimAndSplitUnstakedAmount();
        await tx.wait();
        console.log("claimed");
      } catch (error) {
        console.log("claim and split unstaked error: ", error);
      }
    }

    //* then
    const afterUnstakeRequestsLength = await inviCoreContract.getUnstakeRequestsLength();
    console.log("afterUnstakeRequestsLength: ", afterUnstakeRequestsLength);
  });
});
