import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, network, upgrades } from "hardhat";
import { deployAllWithSetting } from "../../../deploy";
import units from "../../../units.json";

interface UnstakeRequest {
  recipient: string;
  amount: BigNumber;
  fee: BigNumber;
  requestType: BigNumber;
}

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
    ({ stKlayContract, inviCoreContract, lpPoolContract } = await deployAllWithSetting());
  });

  it("Test sendUnstake function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    //* given
    const beforeUnstakeRequestsLength = await inviCoreContract.getUnstakeRequestsLength();
    console.log("beforeUnstakeRequestsLength: ", beforeUnstakeRequestsLength);

    // get claimable
    const claimable = await lpPoolContract.claimable(userA.address);

    //* when
    await inviCoreContract.connect(userA).sendUnstakedAmount({ nonce: nonceUserA });

    //* then
    const afterUnstakeRequestsLength = await inviCoreContract.getUnstakeRequestsLength();
    console.log("afterUnstakeRequestsLength: ", afterUnstakeRequestsLength);
  });
});
