import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
import { getTestAddress } from "../../../getTestAddress";
import { units } from "../../../units";
import hre from "hardhat";

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
    const networkId = await inviCoreContract.networkId();
    console.log("networkId: ", networkId.toString());

    // get claimable
    const claimable = await lpPoolContract.claimable(userA.address);
    console.log("claimable: ", claimable.toString());

    //* when
    await inviCoreContract.connect(userA).sendUnstakedAmount({ nonce: nonceUserA });

    //* then
    const afterUnstakeRequestsLength = await inviCoreContract.getUnstakeRequestsLength();
    console.log("afterUnstakeRequestsLength: ", afterUnstakeRequestsLength);
  });
});
