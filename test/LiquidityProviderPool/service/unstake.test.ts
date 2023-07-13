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

  it("Test unstake function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    //* given
    const stakedAmount: BigNumber = await lpPoolContract.connect(LP).stakedAmount(LP.address);
    const unstakeAmount: BigNumber = stakedAmount.div(2);
    const previousTotalStakedAmount = await lpPoolContract.totalStakedAmount();

    //* when
    const unstake = await lpPoolContract.connect(LP).unstake(unstakeAmount);
    await unstake.wait();
    console.log("unstaked");

    //* then
    let unstakeRequestFront = await lpPoolContract.connect(LP).unstakeRequestsFront();
    console.log("unstakeRequestFront: ", unstakeRequestFront);
    let unstakeRequestRear = await lpPoolContract.connect(LP).unstakeRequestsRear();
    console.log("unstakeRequestRear : ", unstakeRequestRear);
    for (let i = unstakeRequestFront; i < unstakeRequestRear; i++) {
      let unstakeRequests = await lpPoolContract.connect(LP).unstakeRequests(i);
      console.log("unstakeRequests  : ", unstakeRequests.toString());
    }
    let totalStakedAmount = await lpPoolContract.connect(LP).totalStakedAmount();

    expect(totalStakedAmount).to.equal(BigNumber.from(previousTotalStakedAmount).sub(unstakeAmount));
  });

  it("Test resolve liquidity issue", async () => {
    const [deployer, LP, userA, userB, userC] = await ethers.getSigners();
    let nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    let nonceLP = await ethers.provider.getTransactionCount(LP.address);

    //* given
    // step 1: provide liquidity
    const lpAmount: BigNumber = ethers.utils.parseEther("0.1");
    await provideLiquidity(lpPoolContract, LP, lpAmount, nonceLP); // lp stake

    // step 2: stake LP
    const principal: BigNumber = ethers.utils.parseEther("0.00001");
    const leverageRatio = 3 * units.leverageUnit;
    const minLockPeriod = await inviCoreContract.functions.getLockPeriod(leverageRatio);
    const lockPeriod = minLockPeriod * 2;
    const stakeInfo = await leverageStake(inviCoreContract, userA, principal, leverageRatio, lockPeriod, nonceUserA); // userA stake
    console.log("stakeInfo: ", stakeInfo.toString());

    // get total lent amount
    const totalLentAmount = await lpPoolContract.totalLentAmount();
    const totalStakedAmount = await lpPoolContract.totalStakedAmount();
    console.log("totalLentAmount  : ", totalLentAmount.toString());
    console.log("totalStakedAmount: ", totalStakedAmount.toString());

    //* when
    // step 3: unstake LP
    const totalLpAmount = await lpPoolContract.connect(LP).stakedAmount(LP.address);
    console.log("total lp amount  : ", totalLpAmount.toString());
    const unstake = await lpPoolContract.connect(LP).unstake(totalLpAmount);
    await unstake.wait();
    console.log("unstaked");

    //* then
    // get latest stakeInfo
    const latestTokenId = await stakeNFTContract.functions._tokenIds();
    console.log("latestTokenId: ", latestTokenId - 1);
    // get stake Info of userA
    const stakeInfoAfterUnstake = await stakeNFTContract.functions.getStakeInfo(latestTokenId - 1);
    console.log("stakeInfoAfterUnstake: ", stakeInfoAfterUnstake.toString());
  });
});
