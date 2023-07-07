import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
const { expectRevert } = require("@openzeppelin/test-helpers");
import hre from "hardhat";
import { units } from "../../units";
import { leverageStake, provideLiquidity } from "../../utils";
import { getTestAddress } from "../../getTestAddress";

describe("LpPool service test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;

  const network: string = hre.network.name;
  const testAddresses: any = getTestAddress(network);

  this.beforeAll(async function () {
    // for testnet test

    inviCoreContract = await ethers.getContractAt("InviCore", testAddresses.inviCoreContractAddress);
    stakeNFTContract = await ethers.getContractAt("StakeNFT", testAddresses.stakeNFTContractAddress);
    lpPoolContract = await ethers.getContractAt("LiquidityProviderPool", testAddresses.lpPoolContractAddress);
  });

  it("Test claim unstaked  function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    console.log("deployer: ", deployer.address);
    console.log("stakeManager: ", stakeManager.address);
    console.log("LP: ", LP.address);
    console.log("userA: ", userA.address);

    let nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    let nonceLP = await ethers.provider.getTransactionCount(LP.address);
    let nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    let tx;
    console.log("nonce lp: ", nonceLP);

    //* given
    let unstakeRequestFront = await lpPoolContract.connect(LP).unstakeRequestsFront();
    console.log("unstakeRequestFront: ", unstakeRequestFront);
    let unstakeRequestRear = await lpPoolContract.connect(LP).unstakeRequestsRear();
    console.log("unstakeRequestRear: ", unstakeRequestRear);
    for (let i = unstakeRequestFront; i < unstakeRequestRear; i++) {
      let unstakeRequests = await lpPoolContract.connect(LP).unstakeRequests(i);
      console.log("unstakeRequests: ", unstakeRequests.toString());
    }
    // get lp pool balance
    const lpPoolBalance = await ethers.provider.getBalance(lpPoolContract.address);
    console.log("lpPoolBalance: ", lpPoolBalance.toString());

    // get claimable amount
    const claimableAmount = await lpPoolContract.connect(LP).claimableUnstakeAmount(LP.address);
    console.log("claimableAmount: ", claimableAmount.toString());

    //* when
    const claimUnstaked = await lpPoolContract.connect(LP).claimUnstaked();
    await claimUnstaked.wait();
    console.log("claim unstaked amount");

    //* then
    const claimableAmountAfter = await lpPoolContract.connect(LP).claimableUnstakeAmount(LP.address);
    console.log("claimableAmountAfter: ", claimableAmountAfter.toString());
    expect(claimableAmountAfter).to.equal(BigNumber.from("0"));
  });
});
