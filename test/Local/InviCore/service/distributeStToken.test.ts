import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
import {
  deployInviToken,
  deployILPToken,
  deployStakeNFT,
  deployLpPoolContract,
  deployInviCoreContract,
  deployInviTokenStakeContract,
  deployStKlay,
  deployAllWithSetting,
} from "../../../deploy";
import units from "../../../units.json";
import { leverageStake, provideLiquidity, verifyRequest } from "../../../utils";
import { currentNetwork } from "../../../currentNetwork";
import { testAddressBfc } from "../../../../scripts/testAddresses/address.bfc";

const { expectRevert } = require("@openzeppelin/test-helpers");

describe("Invi core service test", function () {
  let stKlayContract: Contract;
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let inviTokenStakeContract: Contract;

  this.beforeAll(async function () {
    // for testnet test

    ({ inviCoreContract, inviTokenStakeContract, stKlayContract, stakeNFTContract, lpPoolContract } = await deployAllWithSetting());
  });

  it("Test stToken reward distribute function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    let nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    let nonceLP = await ethers.provider.getTransactionCount(LP.address);
    let nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    let nonceUserB = await ethers.provider.getTransactionCount(userB.address);
    let nonceUserC = await ethers.provider.getTransactionCount(userC.address);
    let tx;

    //* given
    const lpAmount = 10000000000;
    await provideLiquidity(lpPoolContract, LP, lpAmount, nonceLP); // lp stake

    console.log("lp provided");

    // user -> stake coin
    const principalA = 1000000;
    const leverageRatioA = 3 * units.leverageUnit;
    const minLockPeriodA = await inviCoreContract.functions.getLockPeriod(leverageRatioA);
    const lockPeriodA = minLockPeriodA * 2;
    const stakeInfoA = await leverageStake(inviCoreContract, userA, principalA, leverageRatioA, lockPeriodA, nonceUserA); // userA stake
    const principalB = 3000000;
    const leverageRatioB = 2 * units.leverageUnit;
    const minLockPeriodB = await inviCoreContract.functions.getLockPeriod(leverageRatioB);
    const lockPeriodB = minLockPeriodB * 2;
    const stakeInfoB = await leverageStake(inviCoreContract, userB, principalB, leverageRatioB, lockPeriodB, nonceUserB); // userB stake
    const principalC = 5000000;
    const leverageRatioC = 2 * units.leverageUnit;
    const minLockPeriodC = await inviCoreContract.functions.getLockPeriod(leverageRatioC);
    const lockPeriodC = minLockPeriodC * 2;
    const stakeInfoC = await leverageStake(inviCoreContract, userC, principalC, leverageRatioC, lockPeriodC, nonceUserC); // userC stake

    // mint reward
    const pureReward = 10000000;
    // await stKlayContract.connect(deployer).mintToken(stakeManager.address, lpAmount + principalA + principalB + principalC + pureReward);

    //* when
    await inviCoreContract.connect(deployer).distributeStTokenReward(); // distribute reward

    //* then
    // verify nft reward is distributed correctly
    const totalUserStakedAmount = await stakeNFTContract.totalStakedAmount();
    const totalLPStakedAmount = await lpPoolContract.totalStakedAmount();
    const totalLentAmount = await lpPoolContract.totalLentAmount();
    const totalNftReward = Math.floor(
      (pureReward * totalUserStakedAmount) / (Number(totalUserStakedAmount) + Number(totalLPStakedAmount) - Number(totalLentAmount))
    );
    const userNFTA = await stakeNFTContract.NFTOwnership(userA.address, 0);
    const userNFTB = await stakeNFTContract.NFTOwnership(userB.address, 0);
    const userNFTC = await stakeNFTContract.NFTOwnership(userC.address, 0);
    expect(await stakeNFTContract.rewardAmount(userNFTA)).to.equal(Math.floor((stakeInfoA.stakedAmount * totalNftReward) / totalUserStakedAmount));
    expect(await stakeNFTContract.rewardAmount(userNFTB)).to.equal(Math.floor((stakeInfoB.stakedAmount * totalNftReward) / totalUserStakedAmount));
    expect(await stakeNFTContract.rewardAmount(userNFTC)).to.equal(Math.floor((stakeInfoC.stakedAmount * totalNftReward) / totalUserStakedAmount));

    // verify lp reward distribute
    const lpReward = Math.floor(((pureReward - totalNftReward) * (await inviCoreContract.lpPoolRewardPortion())) / units.rewardPortionTotalUnit);
    const lpUnstakeRequest = await inviCoreContract.unstakeRequests(0);
    verifyRequest(lpUnstakeRequest, lpPoolContract.address, lpReward, 0, 1);

    //verify inviStaker reward distribute
    const inviStakeReward = Math.floor(pureReward - totalNftReward - lpReward);
    const inviStakeUnstakeRequest = await inviCoreContract.unstakeRequests(1);
    verifyRequest(inviStakeUnstakeRequest, inviTokenStakeContract.address, inviStakeReward, 0, 2);
  });
});
