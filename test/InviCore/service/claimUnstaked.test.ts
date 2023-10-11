import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import hre from "hardhat";
import { getTestAddress } from "../../getTestAddress";
import { initializeContracts } from "../../utils/initializeContracts";

const network: string = hre.network.name; // BIFROST, KLAYTN, EVMOS
console.log("current Network: ", network);
const testAddresses: any = getTestAddress(network);

describe("Invi core service test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let inviTokenStakeContract: Contract;

  before(async function () {
    const contracts = await initializeContracts(network, [
      "InviCore",
      "StakeNFT",
      "LiquidityProviderPool",
      "InviTokenStake",
    ]);

    inviCoreContract = contracts["InviCore"];
    stakeNFTContract = contracts["StakeNFT"];
    lpPoolContract = contracts["LiquidityProviderPool"];
    inviTokenStakeContract = contracts["InviTokenStake"];
  });

  it("Test claimUnstaked function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    let tx;

    //* given

    // init value
    const inviCoreBalance = await ethers.provider.getBalance(inviCoreContract.address);
    console.log("inviCoreBalance:      ", inviCoreBalance.toString());
    const totalClaimableAmount: BigNumber = await inviCoreContract.functions.totalClaimableAmount();
    console.log("totalClaimableAmount: ", totalClaimableAmount.toString());
    const claimableAmount: BigNumber = await inviCoreContract.functions.claimableAmount(userA.address);
    console.log("claimableAmount:      ", claimableAmount.toString());

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
