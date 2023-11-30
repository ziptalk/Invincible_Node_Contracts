import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
const { expectRevert } = require("@openzeppelin/test-helpers");
import hre from "hardhat";
import { units } from "../../units";
import { leverageStake, provideLiquidity } from "../../utils/utils";
import { getTestAddress } from "../../utils/getTestAddress";

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
    const [deployer, LP, userA, userB, userC] = await ethers.getSigners();

    console.log("deployer: ", deployer.address);
    console.log("LP: ", LP.address);
    console.log("userA: ", userA.address);

    //* given
    const currentTotalClaimableInviAmount = await inviTokenStakeContract.totalClaimableInviAmount();
    console.log("currentTotalClaimableInviAmount", currentTotalClaimableInviAmount.toString());
    const currentTotalInviToken = await inviTokenContract.balanceOf(inviTokenStakeContract.address);
    console.log("currentTotalInviToken", currentTotalInviToken.toString());

    //* when
    try {
      const distributeInviToken = await inviTokenStakeContract.connect(userA).distributeInviTokenReward();
      await distributeInviToken.wait();
    } catch (error) {
      console.log(error);
    }
    try {
      const claimInviToken = await inviTokenStakeContract.connect(userA).claimInviReward();
      await claimInviToken.wait();
    } catch (error) {
      console.log(error);
    }
    //* then
    let inviTokenBalanceLP = await inviTokenContract.balanceOf(userA.address);
    console.log("inviTokenBalanceLP", inviTokenBalanceLP.toString());
    let inviTokenBalanceLPPool = await inviTokenContract.balanceOf(inviTokenStakeContract.address);
    console.log("inviTokenBalanceLPPool", inviTokenBalanceLPPool.toString());
    let lastInviRewardedTime = await inviTokenStakeContract.lastInviRewardedTime();
    console.log("lastInviRewardedTime", lastInviRewardedTime.toString());
  });
});
