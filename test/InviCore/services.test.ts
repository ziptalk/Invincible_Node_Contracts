import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
import { deployInviToken, deployILPToken, deployStakeNFT, deployLpPoolContract, deployInviCoreContract } from "../deploy";

describe("Invi Core functions Test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let iLPTokenContract: Contract;
  let inviTokenContract: Contract;

  this.beforeEach(async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    // deploy inviToken contract
    inviTokenContract = await deployInviToken();
    // deploy ILPToken contract
    iLPTokenContract = await deployILPToken();
    // deploy stakeNFT contract
    stakeNFTContract = await deployStakeNFT();
    // deploy liquidity pool contract
    lpPoolContract = await deployLpPoolContract(stakeManager.address, iLPTokenContract, inviTokenContract);
    // deploy inviCore contract
    inviCoreContract = await deployInviCoreContract(stakeManager.address, stakeNFTContract, lpPoolContract);

    // change stakeNFT owner
    await stakeNFTContract.connect(deployer).transferOwnership(inviCoreContract.address);

    // change ILPToken owner
    await iLPTokenContract.connect(deployer).transferOwnership(lpPoolContract.address);

    // set inviCore contract address
    await lpPoolContract.connect(deployer).setInviCoreAddress(inviCoreContract.address);
  });

  // it("Test stake function", async () => {
  //   const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

  //   // lp stake coin
  //   await lpPoolContract.connect(userA).stake({ value: 10000 });
  //   expect(await lpPoolContract.totalStakedAmount()).equals(10000);

  //   // create stake info
  //   const principal = 100;
  //   const leverageRatio = 2;
  //   const lentAmount = principal * (leverageRatio - 1);
  //   const stakeInfo = await inviCoreContract.connect(userB).getStakeInfo(principal, leverageRatio);
  //   const initSTMBalance = await stakeManager.getBalance();
  //   // user -> stake coin
  //   await inviCoreContract.connect(userB).stake(stakeInfo, { value: 100 });

  //   // verify stakeNFT contract
  //   let result = await stakeNFTContract.functions.NFTOwnership(userB.address, 0);
  //   expect(result.toString()).to.equal("0");

  //   // verify lpPool contract
  //   expect(await lpPoolContract.totalStakedAmount()).to.equal(10000);
  //   expect(await lpPoolContract.totalLentAmount()).to.equal(lentAmount);

  //   // verify inviCore contract
  //   expect(await inviCoreContract.totalUserStakedAmount()).to.equal(principal + lentAmount);

  //   // verify STM wallet
  //   const STMBalance = await stakeManager.getBalance();
  //   expect(STMBalance.sub(initSTMBalance)).to.equal(principal);
  // });

  it("Test new stake function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();
    const initSTMBalance = await stakeManager.getBalance();

    // lp stake coin
    const lpAmount = 100000;
    await lpPoolContract.connect(LP).stake({ value: lpAmount });
    expect(await lpPoolContract.totalStakedAmount()).equals(lpAmount);

    // user stake coin with leverage 3
    const principal = 1000;
    // unit = 100000
    const leverage = 300000;
    await inviCoreContract.connect(userA).newStake(leverage, { value: principal });

    // verify stakeNFT contract
    let result = await stakeNFTContract.functions.NFTOwnership(userA.address, 0);
    expect(result.toString()).to.equal("0");

    // verify lpPool contract
    expect(await lpPoolContract.totalStakedAmount()).to.equal(lpAmount);
    expect(await lpPoolContract.totalLentAmount()).to.equal(principal * (leverage - 1));

    // verify inviCore contract
    expect(await inviCoreContract.totalUserStakedAmount()).to.equal(principal * leverage);

    // verify STM wallet
    const STMBalance = await stakeManager.getBalance();
    expect(STMBalance.sub(initSTMBalance)).to.equal(principal + lpAmount);
  });
});
