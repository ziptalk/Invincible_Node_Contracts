import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import { provideLiquidity, leverageStake } from "../../utils";
import { units } from "../../units";
import hre from "hardhat";
import { getTestAddress } from "../../getTestAddress";
const { expectRevert } = require("@openzeppelin/test-helpers");

const network: string = hre.network.name; // BIFROST, KLAYTN, EVMOS
console.log("current Network: ", network);
const testAddresses: any = getTestAddress(network);

describe("Invi core service test", function () {
  let stKlayContract: Contract;
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let inviTokenStakeContract: Contract;

  this.beforeAll(async function () {
    // for testnet test
    inviCoreContract = await ethers.getContractAt("InviCore", testAddresses.inviCoreContractAddress);
    inviTokenStakeContract = await ethers.getContractAt("InviToken", testAddresses.inviTokenStakeContractAddress);
    stakeNFTContract = await ethers.getContractAt("StakeNFT", testAddresses.stakeNFTContractAddress);
    lpPoolContract = await ethers.getContractAt("LiquidityProviderPool", testAddresses.lpPoolContractAddress);
  });

  it("Test claimUnstaked function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    let nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    let nonceLP = await ethers.provider.getTransactionCount(LP.address);
    let nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    let tx;

    //* given

    // init value
    const totalClaimableAmount: BigNumber = await inviCoreContract.functions.totalClaimableAmount();
    console.log("totalClaimableAmount: ", totalClaimableAmount.toString());
    const claimableAmount: BigNumber = await inviCoreContract.functions.claimableAmount(userA.address);
    console.log("claimableAmount: ", claimableAmount.toString());

    //* when
    if (claimableAmount > BigNumber.from("0")) {
      tx = await inviCoreContract.connect(userA).claimUnstaked();
      await tx.wait();
    } else {
      console.log("claimableAmount is 0");
    }

    //* then
    const totalClaimableAmountAfter = await inviCoreContract.functions.totalClaimableAmount();
    console.log("totalClaimableAmountAfter: ", totalClaimableAmountAfter.toString());
    const claimableAmountAfter = await inviCoreContract.functions.claimableAmount(userA.address);
    console.log("claimableAmountAfter: ", claimableAmountAfter.toString());
    expect(claimableAmountAfter.toString()).to.equal("0"); // verify claimableAmount
    // TODO: 에러 해결
    //expect(totalClaimableAmountAfter).to.equal(totalClaimableAmount.sub(claimableAmount.toString())); // verify totalClaimableAmount
  });
});
