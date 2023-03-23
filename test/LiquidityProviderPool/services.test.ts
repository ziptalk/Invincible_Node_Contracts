import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { deployInviToken, deployILPToken, deployLpPoolContract, deployAllWithSetting} from "../deploy";
import { provideLiquidity } from "../utils";

describe("Liquidity Provider Pool Test", function () {
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

  it("Test LP Stake", async function () {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    //* given
    const userAStakedAmount = 100000;
    const userBStakedAmount = 200000;
    const userCStakedAmount = 300000;

    //* when
    await provideLiquidity(lpPoolContract, userA, userAStakedAmount); // lp stake
    await provideLiquidity(lpPoolContract, userB, userBStakedAmount); // lp stake
    await provideLiquidity(lpPoolContract, userC, userCStakedAmount); // lp stake

    //* then
    expect(await lpPoolContract.totalStakedAmount()).to.equal(userAStakedAmount + userBStakedAmount + userCStakedAmount);
    expect(await lpPoolContract.stakedAmount(userA.address)).to.equal(userAStakedAmount);
    expect(await lpPoolContract.stakedAmount(userB.address)).to.equal(userBStakedAmount);
    expect(await lpPoolContract.stakedAmount(userC.address)).to.equal(userCStakedAmount);
  });

  it("Test distribute Reward", async function () {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    //* given
    const totalStakedAmount = 1000000;
    const userAStakedAmount = Math.floor(totalStakedAmount * 0.2);
    const userBStakedAmount = Math.floor(totalStakedAmount * 0.3);
    const userCStakedAmount = Math.floor(totalStakedAmount * 0.5);

    await provideLiquidity(lpPoolContract, userA, userAStakedAmount); // lp stake
    await provideLiquidity(lpPoolContract, userB, userBStakedAmount); // lp stake
    await provideLiquidity(lpPoolContract, userC, userCStakedAmount); // lp stake

    const initUserABalance = await userA.getBalance();
    const initUserBBalance = await userB.getBalance();
    const initUserCBalance = await userC.getBalance();


    //* when
    const rewardAmount = 100000;
    const tx = await deployer.sendTransaction({ to: inviCoreContract.address, value: rewardAmount,  gasLimit: 300000}); // send coin with tx fee to contract
    
    await inviCoreContract.connect(deployer).createUnstakeRequest(lpPoolContract.address, rewardAmount, 0, 1); // create unstake request
    await inviCoreContract.connect(stakeManager).sendUnstakedAmount(); // send coin to lpPoolContract

    //* then
    expect(await inviCoreContract.getUnstakeRequestsLength()).to.equal(0);
    expect(await lpPoolContract.nativeRewardAmount(userA.getAddress())).to.equal(rewardAmount * 0.2);
    expect(await lpPoolContract.nativeRewardAmount(userB.getAddress())).to.equal(rewardAmount * 0.3);
    expect(await lpPoolContract.nativeRewardAmount(userC.getAddress())).to.equal(rewardAmount * 0.5);
    expect(await userA.getBalance()).to.equal(initUserABalance.add(rewardAmount * 0.2));
    expect(await userB.getBalance()).to.equal(initUserBBalance.add(rewardAmount * 0.3));
    expect(await userC.getBalance()).to.equal(initUserCBalance.add(rewardAmount * 0.5));
  });
})
