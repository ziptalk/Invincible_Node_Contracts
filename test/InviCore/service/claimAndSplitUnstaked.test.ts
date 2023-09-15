import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
import hre from "hardhat";
import { units } from "../../units";
import { getTestAddress } from "../../getTestAddress";

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
  let stKlayContract: Contract;
  let inviCoreContract: Contract;
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

    // for testnet test
    inviCoreContract = await ethers.getContractAt("InviCore", testAddresses.inviCoreContractAddress);
    lpPoolContract = await ethers.getContractAt("LiquidityProviderPool", testAddresses.lpPoolContractAddress);
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

    // // get all unstake requests
    // const unstakeRequests: UnstakeRequest[] = [];
    // for (let i = unstakeRequestFront; i < unstakeRequestRear; i++) {
    //   const unstakeRequest = await inviCoreContract.unstakeRequests(i);
    //   unstakeRequests.push(unstakeRequest.toString());
    // }
    // console.log("unstakeRequests: ", unstakeRequests);

    //* when

    for (let i = 0; i < 200; i++) {
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
