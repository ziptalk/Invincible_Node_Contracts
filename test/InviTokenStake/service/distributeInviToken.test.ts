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
  let inviTokenStakeContract: Contract;

  const network: string = hre.network.name;
  const testAddresses: any = getTestAddress(network);

  this.beforeAll(async function () {
    // for testnet test

    inviTokenContract = await ethers.getContractAt("InviToken", testAddresses.inviTokenContractAddress);
    inviTokenStakeContract = await ethers.getContractAt("InviTokenStake", testAddresses.inviTokenStakeContractAddress);
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
    const stakeAmount: BigNumber = ethers.utils.parseEther("0.01");
    const previousTotalStakedAmount = await inviTokenStakeContract.totalStakedAmount();
    const stake = await inviTokenStakeContract.connect(LP).stake(stakeAmount, { nonce: nonceLP++ });
    await stake.wait();

    //* when
    try {
      const distributeInviToken = await inviTokenStakeContract.connect(LP).distributeInviTokenReward();
      await distributeInviToken.wait();
    } catch (error) {
      console.log(error);
    }
    try {
      const claimInviToken = await inviTokenStakeContract.connect(LP).claimInviReward();
      await claimInviToken.wait();
    } catch (error) {
      console.log(error);
    }
    //* then
    let inviTokenBalanceLP = await inviTokenContract.balanceOf(LP.address);
    console.log("inviTokenBalanceLP", inviTokenBalanceLP.toString());
    let inviTokenBalanceLPPool = await inviTokenContract.balanceOf(inviTokenStakeContract.address);
    console.log("inviTokenBalanceLPPool", inviTokenBalanceLPPool.toString());
    let lastInviRewardedTime = await inviTokenStakeContract.lastInviRewardedTime();
    console.log("lastInviRewardedTime", lastInviRewardedTime.toString());
  });
});
