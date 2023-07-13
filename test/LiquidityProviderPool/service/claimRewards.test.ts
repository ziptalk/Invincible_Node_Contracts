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

  it("Test claim rewards function", async () => {
    const [deployer, LP, userA, userB, userC] = await ethers.getSigners();

    console.log("deployer: ", deployer.address);
    console.log("LP: ", LP.address);
    console.log("userA: ", userA.address);

    let nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    let nonceLP = await ethers.provider.getTransactionCount(LP.address);
    let nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    let tx;
    console.log("nonce lp: ", nonceLP);

    //* given
    // get claimable amount
    const claimableNativeAmount = await lpPoolContract.connect(LP).nativeRewardAmount(LP.address);
    console.log("claimableNativeAmount: ", claimableNativeAmount.toString());
    const claimableInviAmount = await lpPoolContract.connect(LP).inviRewardAmount(LP.address);
    console.log("claimableInviAmount: ", claimableInviAmount.toString());
    // get total rewards
    const totalNativeRewards = await lpPoolContract.connect(LP).totalNativeRewardAmount();
    console.log("totalNativeRewards: ", totalNativeRewards.toString());
    const totalInviRewards = await lpPoolContract.connect(LP).totalInviRewardAmount();
    console.log("totalInviRewards: ", totalInviRewards.toString());

    //* when
    try {
      if (claimableNativeAmount.toString() !== "0") {
        const claimNativeRewards = await lpPoolContract.connect(LP).claimNativeReward();
        await claimNativeRewards.wait();
        console.log("claim native rewards");
      }

      if (claimableInviAmount.toString() !== "0") {
        const claimInviRewards = await lpPoolContract.connect(LP).claimInviReward();
        await claimInviRewards.wait();
        console.log("claim Invi rewards");
      }
    } catch (error) {
      console.log("error: ", error);
    }

    //* then
    const claimableNativeAmountAfter = await lpPoolContract.connect(LP).nativeRewardAmount(LP.address);
    console.log("claimableNativeAmountAfter: ", claimableNativeAmountAfter.toString());
    const claimableInviAmountAfter = await lpPoolContract.connect(LP).inviRewardAmount(LP.address);
    console.log("claimableInviAmountAfter: ", claimableInviAmountAfter.toString());
    expect(claimableNativeAmountAfter).to.equal(BigNumber.from("0"));
    expect(claimableInviAmountAfter).to.equal(BigNumber.from("0"));
  });
});
