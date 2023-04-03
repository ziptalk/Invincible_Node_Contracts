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
  deployAllWithSetting,
} from "../../deploy";
import units from "../../units.json";
import { leverageStake, provideLiquidity } from "../../utils";

interface UnstakeRequest {
  recipient: string;
  amount: BigNumber;
  fee: BigNumber;
  requestType: BigNumber;
}

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


  it("Test sendUnstake function", async () => {
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
    // distribute reward
    await inviCoreContract.connect(deployer).distributeStKlayReward(); // distribute reward

    const requestLength = await inviCoreContract.getUnstakeRequestsLength();
    const requests : UnstakeRequest[] = [];
    const initBalances : BigNumber[] = [];
    for(let i = 0; i < requestLength; i++){
      requests.push(await inviCoreContract.unstakeRequests(i));
      initBalances.push(await ethers.provider.getBalance(requests[i].recipient));
    }

    //* when
    await inviCoreContract.connect(stakeManager).sendUnstakedAmount({value : 10000000});

    //* then
    expect(await inviCoreContract.getUnstakeRequestsLength()).to.equal(0);
  });

  it("Test sendUnstake function (insufficient allowance)", async () => {
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
    // distribute reward
    await inviCoreContract.connect(deployer).distributeStKlayReward(); // distribute reward

    const request1 = await inviCoreContract.unstakeRequests(0);

    //* when
    await inviCoreContract.connect(stakeManager).sendUnstakedAmount({value : request1.amount});

    //* then
    expect(await inviCoreContract.getUnstakeRequestsLength()).to.equal(1);
  });
});
