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
} from "../../deploy";
import units from "../../units.json";

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
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    // deploy stKlay contract
    stKlayContract = await deployStKlay();
    // deploy inviToken contract
    inviTokenContract = await deployInviToken();
    // deploy ILPToken contract
    iLPTokenContract = await deployILPToken();
    // deploy stakeNFT contract
    stakeNFTContract = await deployStakeNFT();
    // deploy inviTokenStake Contract
    inviTokenStakeContract = await deployInviTokenStakeContract(stakeManager.address, inviTokenContract);
    // deploy liquidity pool contract
    lpPoolContract = await deployLpPoolContract(stakeManager.address, iLPTokenContract, inviTokenContract);
    // deploy inviCore contract
    inviCoreContract = await deployInviCoreContract(stakeManager.address, stakeNFTContract, lpPoolContract, inviTokenStakeContract, stKlayContract);

    // change ILPToken owner
    await iLPTokenContract.connect(deployer).transferOwnership(lpPoolContract.address);
    // change inviToken owner
    await inviTokenContract.connect(deployer).transferOwnership(lpPoolContract.address);

    // set InviCore contract
    stakeNFTContract.connect(deployer).setInviCoreAddress(inviCoreContract.address);
    lpPoolContract.connect(deployer).setInviCoreAddress(inviCoreContract.address);
    inviTokenStakeContract.connect(deployer).setInviCoreAddress(inviCoreContract.address);
  });

  it("Test repayNFT function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    // lp stake coin
    const lpAmount = 100000000000;
    await lpPoolContract.connect(LP).stake({ value: lpAmount });

    // create stake info
    const principal = 5000000;
    const leverageRatio = 3 * units.leverageUnit;
    const stakeInfo = await inviCoreContract.connect(userA).getStakeInfo(principal, leverageRatio);
    const slippage = 3 * units.slippageUnit;
    const lentAmount = Math.floor(principal * leverageRatio / units.leverageUnit) - principal;

    // user -> stake coin
    await inviCoreContract.connect(userA).stake(stakeInfo, slippage, { value: principal });
    // init value
    const initTotalUserStakedAmount = await stakeNFTContract.totalStakedAmount();
    const initTotalLPStakedAmount = await lpPoolContract.totalStakedAmount();
    const initTotalLentAmount = await lpPoolContract.totalLentAmount();

    // generate minting
    const pureReward = 10000000;
    await stKlayContract.connect(deployer).mintToken(stakeManager.address, lpAmount + principal + pureReward);
    
    // distribute reward
    await inviCoreContract.connect(deployer).distributeStKlayReward();
    
    // time move to repay nft
    let nftId = await stakeNFTContract.NFTOwnership(userA.address, 0);
    const nftStakeInfo = await stakeNFTContract.getStakeInfo(nftId);

    await ethers.provider.send("evm_increaseTime", [nftStakeInfo.lockPeriod.toNumber()]);
    await ethers.provider.send("evm_mine", []);

    // repay nft
    await inviCoreContract.connect(userA).repayNFT(nftId);

    // verify totalUserStakedAmount
    const totalUserStakedAmount = await stakeNFTContract.totalStakedAmount();
    expect(totalUserStakedAmount).to.equal(initTotalUserStakedAmount - principal - lentAmount);

    // verify totalLentAmount & totalLPStakedAmount
    const totalLPStakedAmount = await lpPoolContract.totalStakedAmount();
    expect(totalLPStakedAmount).to.equal(Number(initTotalLPStakedAmount) + Number(lentAmount));
    const totalLentAmount = await lpPoolContract.totalLentAmount();
    expect(totalLentAmount).to.equal(Number(initTotalLentAmount) - Number(lentAmount));
    
    // verify stakeInfo, nft is burned
    expect(await stakeNFTContract.isExisted(nftId)).to.equal(false);

    // verify unstake request length
    const unstakeRequestLength = await inviCoreContract.functions.getUnstakeRequestsLength();
    expect(unstakeRequestLength.toString()).to.equal("5");

    // verify nft reward distribute 
    const userRequest = await inviCoreContract.unstakeRequests(2);
    const nftReward = await stakeNFTContract.rewardAmount(nftId);
    const userReward = Math.floor(Number(nftReward) * (100 * units.protocolFeeUnit - stakeInfo.protocolFee) / (units.protocolFeeUnit * 100)) + Number(stakeInfo.principal);
    expect(userRequest.recipient).to.equal(userA.address);
    expect(userRequest.amount).to.equal(userReward);
    expect(userRequest.fee).to.equal(stakeInfo.protocolFee);
    expect(userRequest.requestType).to.equal(0);

    //verify lp reward distribute
    const lpReward = (nftReward - (userReward - stakeInfo.principal)) * await inviCoreContract.lpPoolRewardPortion() / units.rewardPortionTotalUnit;
    const lpRequest = await inviCoreContract.unstakeRequests(3);
    expect(lpRequest.recipient).to.equal(lpPoolContract.address);
    expect(lpRequest.amount).to.equal(lpReward);
    expect(lpRequest.fee).to.equal(0);
    expect(lpRequest.requestType).to.equal(1);

    //verify inviStaker reward distribute
    const inviStakeReward = nftReward - (userReward - stakeInfo.principal) - lpReward;
    const inviStakeRequest = await inviCoreContract.unstakeRequests(4);
    expect(inviStakeRequest.recipient).to.equal(inviTokenStakeContract.address);
    expect(inviStakeRequest.amount).to.equal(inviStakeReward);
    expect(inviStakeRequest.fee).to.equal(0);
    expect(inviStakeRequest.requestType).to.equal(2);
  });
});
