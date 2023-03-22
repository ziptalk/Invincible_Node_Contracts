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

  it("Test stake function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    // lp stake coin
    const lpAmount = 10000000000;
    await lpPoolContract.connect(LP).stake({ value: lpAmount });

    // create stake info
    const principal = 10000;
    const leverageRatio = 2 * units.leverageUnit;
    const stakeInfo = await inviCoreContract.connect(userA).getStakeInfo(principal, leverageRatio);
    const slippage = 3 * units.slippageUnit;
    const stakedAmount = stakeInfo.stakedAmount;
    const lentAmount = stakedAmount - principal;

    // user -> stake coin
    await inviCoreContract.connect(userA).stake(stakeInfo, slippage, { value: principal });

    // verify stakeNFT contract
    let result = await stakeNFTContract.functions.NFTOwnership(userA.address, 0);
    expect(result.toString()).to.equal("0");

    // verify lpPool contract
    expect(await lpPoolContract.totalStakedAmount()).to.equal(lpAmount);
    expect(await lpPoolContract.totalLentAmount()).to.equal(lentAmount);

    // verify inviCore contract
    expect(await stakeNFTContract.totalStakedAmount()).to.equal(principal + lentAmount);
  });
});
