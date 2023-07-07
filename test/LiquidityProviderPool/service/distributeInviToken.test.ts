import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
const { expectRevert } = require("@openzeppelin/test-helpers");
import hre from "hardhat";
import { units } from "../../units";
import { leverageStake, provideLiquidity } from "../../utils";
import { getTestAddress } from "../../getTestAddress";

describe("LpPool service test", function () {
  let inviTokenContract: Contract;
  let lpPoolContract: Contract;

  const network: string = hre.network.name;
  const testAddresses: any = getTestAddress(network);

  this.beforeAll(async function () {
    // for testnet test

    inviTokenContract = await ethers.getContractAt("InviToken", testAddresses.inviTokenContractAddress);
    lpPoolContract = await ethers.getContractAt("LiquidityProviderPool", testAddresses.lpPoolContractAddress);
  });

  it("Test distributeInviToken function", async () => {
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
    const lpAmount: BigNumber = ethers.utils.parseEther("0.01");
    const previousTotalStakedAmount = await lpPoolContract.totalStakedAmount();
    const totalClaimableInviAmount = await lpPoolContract.totalClaimableInviAmount();
    console.log("previousTotalStakedAmount", previousTotalStakedAmount.toString());
    console.log("totalClaimableInviAmount", totalClaimableInviAmount.toString());

    //* when
    try {
      const distributeInviToken = await lpPoolContract.connect(LP).distributeInviTokenReward();
      await distributeInviToken.wait();
    } catch (error) {
      console.log("distribute invi token error");
      console.log(error);
    }
    try {
      const claimInviToken = await lpPoolContract.connect(LP).claimInviReward();
      await claimInviToken.wait();
    } catch (error) {
      console.log("claim invi reward error");
      console.log(error);
    }
    //* then
    let inviTokenBalanceLP = await inviTokenContract.balanceOf(LP.address);
    console.log("inviTokenBalanceLP", inviTokenBalanceLP.toString());
    let inviTokenBalanceLPPool = await inviTokenContract.balanceOf(lpPoolContract.address);
    console.log("inviTokenBalanceLPPool", inviTokenBalanceLPPool.toString());
    let lastInviRewardedTime = await lpPoolContract.lastInviRewardedTime();
    console.log("lastInviRewardedTime", lastInviRewardedTime.toString());
  });
});
