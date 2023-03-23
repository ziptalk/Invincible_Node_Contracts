import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, network, upgrades } from "hardhat";
import {
  deployInviToken,
  deployILPToken,
  deployStakeNFT,
  deployLpPoolContract,
  deployInviCoreContract,
  deployInviTokenStakeContract,
  deployStKlay,
  deployAllWithSetting
} from "../../deploy";
import units from "../../units.json";
import { provideLiquidity,leverageStake, verifyRequest } from "../../utils";

const { expectRevert } = require("@openzeppelin/test-helpers");

describe("Invi Core functions Test", function () {
  let stKlayContract: Contract;
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let iLPTokenContract: Contract;
  let inviTokenContract: Contract;
  let inviTokenStakeContract: Contract;

  this.beforeEach(async () => {
    [stKlayContract, inviCoreContract, iLPTokenContract, stakeNFTContract, inviTokenContract, lpPoolContract, inviTokenStakeContract] = await deployAllWithSetting();
  });

  it("Test repayNFT function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    //* given
    const lpAmount = 100000000000;
    await provideLiquidity(lpPoolContract, LP, lpAmount); // lp stake

    // userA stake
    const principal = 500000;
    const leverageRatio = 3 * units.leverageUnit;
    const stakeInfo = await leverageStake(inviCoreContract, userA, principal, leverageRatio); 

    // get nftId
    let nftId = await stakeNFTContract.NFTOwnership(userA.address, 0); 
    const nftStakeInfo = await stakeNFTContract.getStakeInfo(nftId);

    // mint reward
    const pureReward = 10000000; 
    await stKlayContract.connect(deployer).mintToken(stakeManager.address, lpAmount + principal + pureReward);

    // distribute reward
    await inviCoreContract.connect(deployer).distributeStKlayReward();

    // init value
    const initTotalUserStakedAmount = await stakeNFTContract.totalStakedAmount(); 
    const initTotalLPStakedAmount = await lpPoolContract.totalStakedAmount();
    const initTotalLentAmount = await lpPoolContract.totalLentAmount();


    //* when
    await ethers.provider.send("evm_increaseTime", [nftStakeInfo.lockPeriod.toNumber()]); // time move to repay nft
    await ethers.provider.send("evm_mine", []);
    await inviCoreContract.connect(userA).repayNFT(nftId);


    //* then
    const lentAmount = stakeInfo.stakedAmount - stakeInfo.principal;
    const totalUserStakedAmount = await stakeNFTContract.totalStakedAmount();
    const totalLPStakedAmount = await lpPoolContract.totalStakedAmount();
    const totalLentAmount = await lpPoolContract.totalLentAmount();
    const unstakeRequestLength = await inviCoreContract.functions.getUnstakeRequestsLength();

    expect(totalUserStakedAmount).to.equal(initTotalUserStakedAmount - principal - lentAmount); // verify totalUserStakedAmount
    expect(totalLPStakedAmount).to.equal(Number(initTotalLPStakedAmount) + Number(lentAmount)); // verify totalLentAmount
    expect(totalLentAmount).to.equal(Number(initTotalLentAmount) - Number(lentAmount)); // verify totalLentAmount
    expect(await stakeNFTContract.isExisted(nftId)).to.equal(false); // verify nft is not existed
    expect(unstakeRequestLength.toString()).to.equal("5"); // verify unstake request length

    // verify nft reward distribute 
    const userRequest = await inviCoreContract.unstakeRequests(2);
    const nftReward = await stakeNFTContract.rewardAmount(nftId);
    const userReward = Math.floor(Number(nftReward) * (100 * units.protocolFeeUnit - stakeInfo.protocolFee) / (units.protocolFeeUnit * 100)) + Number(stakeInfo.principal);
    verifyRequest(userRequest, userA.address, userReward, 0, 0);

    //verify lp reward distribute
    const lpReward = (nftReward - (userReward - stakeInfo.principal)) * await inviCoreContract.lpPoolRewardPortion() / units.rewardPortionTotalUnit;
    const lpRequest = await inviCoreContract.unstakeRequests(3);
    verifyRequest(lpRequest, lpPoolContract.address, lpReward, 0, 1)

    //verify inviStaker reward distribute
    const inviStakeReward = nftReward - (userReward - stakeInfo.principal) - lpReward;
    const inviStakeRequest = await inviCoreContract.unstakeRequests(4);
    verifyRequest(inviStakeRequest, inviTokenStakeContract.address, inviStakeReward, 0, 2)
  });
});
