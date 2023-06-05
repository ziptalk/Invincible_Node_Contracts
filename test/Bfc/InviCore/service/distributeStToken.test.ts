import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
import units from "../../../units.json";
import { leverageStake, provideLiquidity, verifyRequest } from "../../../utils";
import { testAddressBfc } from "../../../../scripts/addresses/testAddresses/address.bfc";

const { expectRevert } = require("@openzeppelin/test-helpers");

describe("Invi core service test", function () {
  let stKlayContract: Contract;
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let inviTokenStakeContract: Contract;

  this.beforeAll(async function () {
    // for testnet test
    inviCoreContract = await ethers.getContractAt("BfcInviCore", testAddressBfc.inviCoreContractAddress);
    inviTokenStakeContract = await ethers.getContractAt("InviToken", testAddressBfc.inviTokenStakeContractAddress);
    stakeNFTContract = await ethers.getContractAt("StakeNFT", testAddressBfc.stakeNFTContractAddress);
    lpPoolContract = await ethers.getContractAt("BfcLiquidityProviderPool", testAddressBfc.lpPoolContractAddress);
  });

  it("Test stToken reward distribute function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    let nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    let nonceLP = await ethers.provider.getTransactionCount(LP.address);
    let nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    let nonceUserB = await ethers.provider.getTransactionCount(userB.address);
    let nonceUserC = await ethers.provider.getTransactionCount(userC.address);
    let tx;

    console.log("nonce deployer: ", nonceDeployer);
    //* given
    // get current unstake requests
    const beforeUnstakeRequestLength = await inviCoreContract.getUnstakeRequestsLength();
    console.log("before unstake requests: ", beforeUnstakeRequestLength);
    for (let i = 0; i < beforeUnstakeRequestLength; i++) {
      const request = await inviCoreContract.connect(userA).unstakeRequests(i);
      console.log("request: ", request.recipient, request.amount, request.fee, request.requestType);
    }

    //* when
    const distributeResult = await inviCoreContract.connect(deployer).distributeStTokenReward({ nonce: nonceDeployer }); // distribute reward
    console.log("distribute result: ", distributeResult);

    //* then
    // get unstake requests
    const afterUnstakeRequests = await inviCoreContract.getUnstakeRequestsLength();
    console.log("after unstake requests: ", afterUnstakeRequests);
  });
});
