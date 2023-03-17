import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
import { deployInviToken, deployILPToken, deployStakeNFT, deployLpPoolContract, deployInviCoreContract, deployInviTokenStakeContract } from "../deploy";
import units from "../units.json";

describe("Invi Core functions Test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let iLPTokenContract: Contract;
  let inviTokenContract: Contract;
  let inviTokenStakeContract: Contract;

  this.beforeEach(async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

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
    inviCoreContract = await deployInviCoreContract(stakeManager.address, stakeNFTContract, lpPoolContract, inviTokenStakeContract);

    // change stakeNFT owner to invi core contract
    await stakeNFTContract.connect(deployer).transferOwnership(inviCoreContract.address);

    // change ILPToken owner to lp pool contract
    await iLPTokenContract.connect(deployer).transferOwnership(lpPoolContract.address);

    // // change inviToken owner to lp pool contract
    // await inviTokenContract.connect(deployer).transferOwnership(deployer.address);

    // set inviCore contract address of lp pool contract
    await lpPoolContract.connect(deployer).setInviCoreAddress(inviCoreContract.address);
  });

  it("Test stake function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    // lp stake coin
    const lpAmount = 10000000000;
    await lpPoolContract.connect(userA).stake({ value: lpAmount });
    expect(await lpPoolContract.totalStakedAmount()).equals(lpAmount);
    console.log(await lpPoolContract.getMaxLentAmount());

    // create stake info
    const principal = 10000;
    const leverageRatio = 2 * units.leverageUnit;
    const stakeInfo = await inviCoreContract.connect(userB).getStakeInfo(principal, leverageRatio);
    const initSTMBalance = await stakeManager.getBalance();
    const slippage = 1 * units.slippageUnit;

    // user -> stake coin
    await inviCoreContract.connect(userB).stake(stakeInfo, slippage, { value: principal });

    // verify stakeNFT contract
    let result = await stakeNFTContract.functions.NFTOwnership(userB.address, 0);
    expect(result.toString()).to.equal("0");

    // verify lpPool contract
    expect(await lpPoolContract.totalStakedAmount()).to.equal(lpAmount);

    // verify inviCore contract
    expect(await inviCoreContract.totalUserStakedAmount()).to.equal((principal * leverageRatio) / units.leverageUnit);
  });

  it("Test split reward function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    const lpAmount = 100000;

    // lp stake
    await lpPoolContract.connect(LP).stake({ value: lpAmount });
    expect(await lpPoolContract.totalStakedAmount()).equals(lpAmount);
    const initialLPBalance: BigNumber = await LP.getBalance();
    const initialUserABalance: BigNumber = await userA.getBalance();
    const initialUserBBalance: BigNumber = await userB.getBalance();

    // invi stake
    const inviStakeAmountA = 10000;
    const inviStakeAmountB = 30000;
    await inviTokenContract.functions.mintToken(userA.address, inviStakeAmountA);
    await inviTokenContract.connect(userA).approve(inviTokenStakeContract.address, inviStakeAmountA);
    await inviTokenStakeContract.connect(userA).stake(inviStakeAmountA);
    await inviTokenContract.functions.mintToken(userB.address, inviStakeAmountB);
    await inviTokenContract.connect(userB).approve(inviTokenStakeContract.address, inviStakeAmountB);
    await inviTokenStakeContract.connect(userB).stake(inviStakeAmountB);

    // transfer ownership (test purpose)
    await inviTokenContract.connect(deployer).transferOwnership(lpPoolContract.address);

    // split reward
    const rewards: number = 100000000;
    await inviCoreContract.connect(stakeManager).splitRewards({ value: rewards });
    const expectedLPReward: number = rewards * 0.7;
    const expectedUserAReward: number = rewards * 0.3 * 0.25;
    const expectedUserBReward: number = rewards * 0.3 * 0.75;
    const currentLPBalance: BigNumber = await LP.getBalance();
    const currentUserABalance: BigNumber = await userA.getBalance();
    const currentUserBBalance: BigNumber = await userB.getBalance();
    // console.log(currentLPBalance, initialLPBalance);
    // console.log(currentUserABalance, initialUserABalance);
    expect(currentLPBalance.sub(initialLPBalance).toString()).to.equals(expectedLPReward.toString());
    expect(currentUserABalance.sub(initialUserABalance).toString()).to.equals(expectedUserAReward.toString());
    expect(currentUserBBalance.sub(initialUserBBalance).toString()).to.equals(expectedUserBReward.toString());
  });
});
