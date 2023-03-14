import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { deployInviToken, deployILPToken, deployLpPoolContract } from "../deploy";

describe("Liquidity Provider Pool Test", function () {
  let lpPoolContract: Contract;
  let iLPTokenContract: Contract;
  let inviTokenContract: Contract;

  this.beforeEach(async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    // deploy ILPToken contract
    iLPTokenContract = await deployILPToken();
    // deploy inviToken contract
    inviTokenContract = await deployInviToken();
    // deploy liquidity pool contract
    lpPoolContract = await deployLpPoolContract(iLPTokenContract, inviTokenContract);
    // change ILPToken owner
    await iLPTokenContract.connect(deployer).transferOwnership(lpPoolContract.address);
    // change inviToken owner
    await inviTokenContract.connect(deployer).transferOwnership(lpPoolContract.address);
  });

  const stakeAmountEther: string = "1";
  it("Test Stake", async function () {
    console.log("-------------------Test Stake-------------------");
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();
    await lpPoolContract.connect(userA).stake({ value: ethers.utils.parseEther(stakeAmountEther) });

    // expect totalStakedAmount == userAStakedAmount == amount
    const expecteduserAReward = ethers.utils.parseEther(stakeAmountEther);
    const totalStakedAmount = await lpPoolContract.functions.totalStakedAmount();
    const userAStakedAmount = await lpPoolContract.functions.stakedAmount(userA.address);
    expect(totalStakedAmount.toString()).to.equal(expecteduserAReward.toString());
    expect(userAStakedAmount.toString()).to.equal(expecteduserAReward.toString());
  });

  it("Test distribute Reward", async function () {
    console.log("----------------Test Update Reward----------------");
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();
    const stakeAmount: Number = 1000000;
    const rewardAmountEther: string = "3";

    // stake from multiple addresses
    // user 1
    await lpPoolContract.connect(userA).stake({ value: ethers.utils.parseEther(stakeAmountEther) });
    // user 2
    await lpPoolContract.connect(userB).stake({ value: ethers.utils.parseEther(stakeAmountEther) });
    // user 3
    await lpPoolContract.connect(userC).stake({ value: ethers.utils.parseEther(stakeAmountEther) });

    const totalStakedAmount = await lpPoolContract.functions.totalStakedAmount();
    const userAStakedAmount = await lpPoolContract.functions.stakedAmount(userA.address);
    console.log(totalStakedAmount.toString());

    // distribute Reward to stakers
    await lpPoolContract
      .connect(stakeManager)
      .distributeReward({ value: ethers.utils.parseEther(rewardAmountEther) })
      .catch((error: any) => {
        console.error(error);
      });

    // user inviToken balance should not be 0
    const userAInviBalance = await inviTokenContract.functions.balanceOf(userA.address);
    expect(userAInviBalance).to.not.equal(0);
  });
});
