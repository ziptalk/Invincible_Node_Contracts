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
import { leverageStake, provideLiquidity, verifyRequest } from "../../utils";

const { expectRevert } = require("@openzeppelin/test-helpers");

describe("Invi core service test", function () {
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

  it("Test stklay reward distribute function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    //* given
    const lpAmount = 10000000000;
    provideLiquidity(lpPoolContract, LP, lpAmount); // lp stake

    // user -> stake coin
    const principalA = 1000000;
    const leverageRatioA = 3 * units.leverageUnit;
    const stakeInfoA = await leverageStake(inviCoreContract, userA, principalA, leverageRatioA);// userA stake
    const principalB = 3000000;
    const leverageRatioB = 2 * units.leverageUnit;
    const stakeInfoB = await leverageStake(inviCoreContract, userB, principalB, leverageRatioB);// userB stake
    const principalC = 5000000;
    const leverageRatioC = 2 * units.leverageUnit;
    const stakeInfoC = await leverageStake(inviCoreContract, userC, principalC, leverageRatioC);// userC stake
    
    // mint reward
    const pureReward = 10000000; 
    await stKlayContract.connect(deployer).mintToken(stakeManager.address, lpAmount + principalA + principalB + principalC + pureReward);

    
    //* when
    await inviCoreContract.connect(deployer).distributeStKlayReward(); // distribute reward

    //* then
    // verify nft reward is distributed correctly
    const totalUserStakedAmount = await stakeNFTContract.totalStakedAmount();
    const totalLPStakedAmount = await lpPoolContract.totalStakedAmount();
    const totalLentAmount = await lpPoolContract.totalLentAmount();
    const totalNftReward = Math.floor(pureReward * totalUserStakedAmount / (Number(totalUserStakedAmount) + Number(totalLPStakedAmount) - Number(totalLentAmount)));
    const userNFTA = await stakeNFTContract.NFTOwnership(userA.address, 0);
    const userNFTB = await stakeNFTContract.NFTOwnership(userB.address, 0);
    const userNFTC = await stakeNFTContract.NFTOwnership(userC.address, 0);
    expect(await stakeNFTContract.rewardAmount(userNFTA)).to.equal(Math.floor(stakeInfoA.stakedAmount * totalNftReward / totalUserStakedAmount));
    expect(await stakeNFTContract.rewardAmount(userNFTB)).to.equal(Math.floor(stakeInfoB.stakedAmount * totalNftReward / totalUserStakedAmount));
    expect(await stakeNFTContract.rewardAmount(userNFTC)).to.equal(Math.floor(stakeInfoC.stakedAmount * totalNftReward / totalUserStakedAmount));

    // verify lp reward distribute
    const lpReward = Math.floor((pureReward - totalNftReward) * await inviCoreContract.lpPoolRewardPortion() / units.rewardPortionTotalUnit);
    const lpUnstakeRequest = await inviCoreContract.unstakeRequests(0);
    verifyRequest(lpUnstakeRequest, lpPoolContract.address, lpReward, 0, 1);

    //verify inviStaker reward distribute
    const inviStakeReward = Math.floor(pureReward - totalNftReward - lpReward);
    const inviStakeUnstakeRequest = await inviCoreContract.unstakeRequests(1);
    verifyRequest(inviStakeUnstakeRequest, inviTokenStakeContract.address, inviStakeReward, 0, 2);
  });
  
});
