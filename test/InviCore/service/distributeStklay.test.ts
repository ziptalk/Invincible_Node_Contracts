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

  it("Test stklay reward distribute function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    // lp stake coin
    const lpAmount = 10000000000;
    await lpPoolContract.connect(LP).stake({ value: lpAmount });

    // user -> stake coin
    const slippage = 3 * units.slippageUnit;
    const stakeInfoA = await inviCoreContract.connect(userA).getStakeInfo(10000, 3 * units.leverageUnit);
    const stakeInfoB = await inviCoreContract.connect(userB).getStakeInfo(30000, 5 * units.leverageUnit);
    const stakeInfoC = await inviCoreContract.connect(userC).getStakeInfo(100000, 2 * units.leverageUnit);
    await inviCoreContract.connect(userA).stake(stakeInfoA, slippage, { value: 10000 });
    await inviCoreContract.connect(userB).stake(stakeInfoB, slippage, { value: 30000 });
    await inviCoreContract.connect(userC).stake(stakeInfoC, slippage, { value: 100000 });

    const totalUserStakedAmount = 10000 * 3 + 30000 * 5 + 100000 * 2;
    const totalLPStakedAmount = 10000000000 - (10000 * 2 + 30000 * 4 + 100000 * 1);
    expect(totalUserStakedAmount).to.equals(await stakeNFTContract.totalStakedAmount());
    expect(totalLPStakedAmount).to.equals((await lpPoolContract.totalStakedAmount()) - (await lpPoolContract.totalLentAmount()));
    
    // generate minting
    const pureReward = 300000;
    await stKlayContract.connect(deployer).mintToken(stakeManager.address, totalUserStakedAmount + totalLPStakedAmount + pureReward);

    // distribute reward
    await inviCoreContract.connect(deployer).distributeStKlayReward();

    // verify nft reward distribute 
    const nftReward = Math.floor(pureReward * (10000 * 3 + 30000 * 5 + 100000 * 2) / (10000000000 - (10000 * 2 + 30000 * 4 + 100000 * 1)));
    const userNFTA = await stakeNFTContract.NFTOwnership(userA.address, 0);
    const userNFTB = await stakeNFTContract.NFTOwnership(userB.address, 0);
    const userNFTC = await stakeNFTContract.NFTOwnership(userC.address, 0);
    expect(await stakeNFTContract.rewardAmount(userNFTA)).to.equal(Math.floor(10000 * 3 * nftReward / totalUserStakedAmount));
    expect(await stakeNFTContract.rewardAmount(userNFTB)).to.equal(Math.floor(30000 * 5 * nftReward / totalUserStakedAmount));
    expect(await stakeNFTContract.rewardAmount(userNFTC)).to.equal(Math.floor(100000 * 2 * nftReward / totalUserStakedAmount));

    // verify lp reward distribute
    const lpReward = Math.floor((pureReward - nftReward) * await inviCoreContract.lpPoolRewardPortion() / units.rewardPortionTotalUnit);
    const lpUnstakeRequest = await inviCoreContract.unstakeRequests(0);
    expect(lpPoolContract.address).to.equal(lpUnstakeRequest.recipient);
    expect(lpReward).to.equal(lpUnstakeRequest.amount);
    expect(0).to.equal(lpUnstakeRequest.fee);
    expect(1).to.equal(lpUnstakeRequest.requestType);

    //verify inviStaker reward distribute
    const inviStakeReward = Math.floor(pureReward - nftReward - lpReward);
    const inviStakeUnstakeRequest = await inviCoreContract.unstakeRequests(1);
    expect(inviTokenStakeContract.address).to.equal(inviStakeUnstakeRequest.recipient);
    expect(inviStakeReward).to.equal(inviStakeUnstakeRequest.amount);
    expect(0).to.equal(inviStakeUnstakeRequest.fee);
    expect(2).to.equal(inviStakeUnstakeRequest.requestType);
  });
  
});
