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
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    nonceLP = await ethers.provider.getTransactionCount(LP.address);
    nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    nonceUserB = await ethers.provider.getTransactionCount(userB.address);
    nonceUserC = await ethers.provider.getTransactionCount(userC.address);
    tx;

    // for testnet test
    inviCoreContract = await ethers.getContractAt("InviCore", testAddresses.inviCoreContractAddress);
    lpPoolContract = await ethers.getContractAt("LiquidityProviderPool", testAddresses.lpPoolContractAddress);
  });

  it("Test sendUnstake function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

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
    const unstakeRequestAMount = await inviCoreContract.unstakeRequestsAmount();
    console.log("unstakeRequestAMount: ", unstakeRequestAMount.toString());

    // get all unstake requests
    const unstakeRequests: UnstakeRequest[] = [];
    for (let i = 0; i < beforeUnstakeRequestsLength; i++) {
      const unstakeRequest = await inviCoreContract.unstakeRequests(i);
      unstakeRequests.push(unstakeRequest.toString());
    }
    console.log("unstakeRequests: ", unstakeRequests);

    //* when
    await inviCoreContract.connect(userA).sendUnstakedAmount({ nonce: nonceUserA });

    //* then
    const afterUnstakeRequestsLength = await inviCoreContract.getUnstakeRequestsLength();
    console.log("afterUnstakeRequestsLength: ", afterUnstakeRequestsLength);
  });
});
