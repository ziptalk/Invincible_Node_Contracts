import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
import { deployAllWithSetting } from "../../../deploy";
import units from "../../../units.json";
import { provideLiquidity, leverageStake, verifyRequest } from "../../../utils";

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

  it("Test repayNFT function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    let nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    let nonceLP = await ethers.provider.getTransactionCount(LP.address);
    let nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    let tx;

    //* given
    const lpAmount = 100000000000;
    await provideLiquidity(lpPoolContract, LP, lpAmount, nonceLP); // lp stake

    // userA stake
    const principal = 500000;
    const leverageRatio = 3 * units.leverageUnit;
    const minLockPeriod = await inviCoreContract.functions.getLockPeriod(leverageRatio);
    const lockPeriod = minLockPeriod * 2;
    const stakeInfo = await leverageStake(inviCoreContract, userA, principal, leverageRatio, lockPeriod, nonceUserA);

    // get nftId
    let nftId = await stakeNFTContract.NFTOwnership(userA.address, 2);
    const nftStakeInfo = await stakeNFTContract.getStakeInfo(nftId);
    console.log("nft id: ", nftId);
    console.log("stake info: ", nftStakeInfo);

    // // mint reward
    const pureReward = 10000000;
    await stKlayContract.connect(deployer).mintToken(stakeManager.address, lpAmount + principal + pureReward);

    // distribute reward
    const distribute = await inviCoreContract.connect(deployer).distributeStTokenReward({ nonce: nonceDeployer++ });
    console.log("distribute: ", distribute);

    // init value
    const initTotalUserStakedAmount = await stakeNFTContract.totalStakedAmount();
    const initTotalLPStakedAmount = await lpPoolContract.totalStakedAmount();
    const initTotalLentAmount = await lpPoolContract.totalLentAmount();
    console.log(initTotalUserStakedAmount, initTotalLPStakedAmount, initTotalLentAmount);

    //* when

    await ethers.provider.send("evm_increaseTime", [nftStakeInfo.lockPeriod.toNumber()]); // time move to repay nft
    await ethers.provider.send("evm_mine", []);

    const repay = await inviCoreContract.connect(userA).repayNFT(nftId, { nonce: ++nonceUserA });
    await repay.wait();
    console.log("repay", repay);

    //* then
    const lentAmount = stakeInfo.stakedAmount - stakeInfo.principal;
    const totalUserStakedAmount = await stakeNFTContract.totalStakedAmount();
    const totalLPStakedAmount = await lpPoolContract.totalStakedAmount();
    const totalLentAmount = await lpPoolContract.totalLentAmount();
    const unstakeRequestLength = await inviCoreContract.functions.getUnstakeRequestsLength();

    console.log("lentAmount: ", lentAmount);
    console.log("totalUserStakedAmount: ", totalUserStakedAmount);
    console.log("totalLPStakedAmount: ", totalLPStakedAmount);
    console.log("totalLentAmount: ", totalLentAmount);
    console.log("unstakeRequestLength: ", unstakeRequestLength);

    expect(totalUserStakedAmount).to.equal(initTotalUserStakedAmount - principal - lentAmount); // verify totalUserStakedAmount
    expect(totalLPStakedAmount).to.equal(Number(initTotalLPStakedAmount) + Number(lentAmount)); // verify totalLentAmount
    expect(totalLentAmount).to.equal(Number(initTotalLentAmount) - Number(lentAmount)); // verify totalLentAmount
    expect(await stakeNFTContract.isExisted(nftId)).to.equal(false); // verify nft is not existed
    // expect(unstakeRequestLength.toString()).to.equal("5"); // verify unstake request length

    // verify nft reward distribute
    const userRequest = await inviCoreContract.unstakeRequests(2);
    const nftReward = await stakeNFTContract.rewardAmount(nftId);

    const userReward =
      Math.floor((Number(nftReward) * (100 * units.protocolFeeUnit - stakeInfo.protocolFee)) / (units.protocolFeeUnit * 100)) + Number(stakeInfo.principal);
    verifyRequest(userRequest, userA.address, userReward, 0, 0);
    console.log("userReward: ", userReward);

    //verify lp reward distribute
    const lpReward = ((nftReward - (userReward - stakeInfo.principal)) * (await inviCoreContract.lpPoolRewardPortion())) / units.rewardPortionTotalUnit;
    console.log("lpReward: ", lpReward);

    const lpRequest = await inviCoreContract.unstakeRequests(3);
    console.log("lpRequest: ", lpRequest);

    verifyRequest(lpRequest, lpPoolContract.address, lpReward, 0, 1);

    //verify inviStaker reward distribute
    const inviStakeReward = nftReward - (userReward - stakeInfo.principal) - lpReward;
    const inviStakeRequest = await inviCoreContract.unstakeRequests(4);
    verifyRequest(inviStakeRequest, inviTokenStakeContract.address, inviStakeReward, 0, 2);
  });
});
