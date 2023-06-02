import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, network, upgrades } from "hardhat";
import { deployAllWithSetting } from "../../../deploy";
import units from "../../../units.json";
import { leverageStake, provideLiquidity } from "../../../utils";

interface UnstakeRequest {
  recipient: string;
  amount: BigNumber;
  fee: BigNumber;
  requestType: BigNumber;
}

describe("Invi core service test", function () {
  let stKlayContract: Contract;
  let inviCoreContract: Contract;
  let lpPoolContract: Contract;
  let nonceDeployer;
  let nonceLP: number;
  let nonceUserA: number;
  let nonceUserB: number;
  let nonceUserC: number;
  let tx: any;

  this.beforeAll(async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    nonceLP = await ethers.provider.getTransactionCount(LP.address);
    nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    nonceUserB = await ethers.provider.getTransactionCount(userB.address);
    nonceUserC = await ethers.provider.getTransactionCount(userC.address);
    tx;
    ({ stKlayContract, inviCoreContract, lpPoolContract } = await deployAllWithSetting());
  });

  it("Test sendUnstake function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    //* given
    const lpAmount = 10000000000;
    provideLiquidity(lpPoolContract, LP, lpAmount, nonceLP); // lp stake

    // user -> stake coin
    const principalA = 1000000;
    const leverageRatioA = 3 * units.leverageUnit;
    const minLockPeriodA = await inviCoreContract.functions.getLockPeriod(leverageRatioA);
    const lockPeriodA = minLockPeriodA * 2;
    const stakeInfoA = await leverageStake(inviCoreContract, userA, principalA, leverageRatioA, lockPeriodA, nonceUserA); // userA stake

    const principalB = 3000000;
    const leverageRatioB = 2 * units.leverageUnit;
    const minLockPeriodB = await inviCoreContract.functions.getLockPeriod(leverageRatioB);
    const lockPeriodB = minLockPeriodB * 2;
    const stakeInfoB = await leverageStake(inviCoreContract, userB, principalB, leverageRatioB, lockPeriodB, nonceUserB); // userB stake

    const principalC = 5000000;
    const leverageRatioC = 2 * units.leverageUnit;
    const minLockPeriodC = await inviCoreContract.functions.getLockPeriod(leverageRatioC);
    const lockPeriodC = minLockPeriodC * 2;
    const stakeInfoC = await leverageStake(inviCoreContract, userC, principalC, leverageRatioC, lockPeriodC, nonceUserC);

    // mint reward
    const pureReward = 10000000;
    await stKlayContract.connect(deployer).mintToken(stakeManager.address, lpAmount + principalA + principalB + principalC + pureReward);
    // distribute reward
    await inviCoreContract.connect(deployer).distributeStTokenReward(); // distribute reward

    const requestLength = await inviCoreContract.getUnstakeRequestsLength();
    const requests: UnstakeRequest[] = [];
    const initBalances: BigNumber[] = [];
    for (let i = 0; i < requestLength; i++) {
      requests.push(await inviCoreContract.unstakeRequests(i));
      initBalances.push(await ethers.provider.getBalance(requests[i].recipient));
    }

    //* when
    await inviCoreContract.connect(stakeManager).sendUnstakedAmount({ value: 10000000 });

    //* then
    expect(await inviCoreContract.getUnstakeRequestsLength()).to.equal(0);
  });

  it("Test sendUnstake function (insufficient allowance)", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();
    //* given
    const lpAmount = 10000000000;
    provideLiquidity(lpPoolContract, LP, lpAmount, nonceLP); // lp stake

    // user -> stake coin
    const principalA = 1000000;
    const leverageRatioA = 3 * units.leverageUnit;
    const minLockPeriodA = await inviCoreContract.functions.getLockPeriod(leverageRatioA);
    const lockPeriodA = minLockPeriodA * 2;
    const stakeInfoA = await leverageStake(inviCoreContract, userA, principalA, leverageRatioA, lockPeriodA, nonceUserA); // userA stake

    const principalB = 3000000;
    const leverageRatioB = 2 * units.leverageUnit;
    const minLockPeriodB = await inviCoreContract.functions.getLockPeriod(leverageRatioB);
    const lockPeriodB = minLockPeriodB * 2;
    const stakeInfoB = await leverageStake(inviCoreContract, userB, principalB, leverageRatioB, lockPeriodB, nonceUserB); // userB stake

    const principalC = 5000000;
    const leverageRatioC = 2 * units.leverageUnit;
    const minLockPeriodC = await inviCoreContract.functions.getLockPeriod(leverageRatioC);
    const lockPeriodC = minLockPeriodC * 2;
    const stakeInfoC = await leverageStake(inviCoreContract, userC, principalC, leverageRatioC, lockPeriodC, nonceUserC);

    // mint reward
    const pureReward = 10000000;
    await stKlayContract.connect(deployer).mintToken(stakeManager.address, lpAmount + principalA + principalB + principalC + pureReward);
    // distribute reward
    await inviCoreContract.connect(deployer).distributeStTokenReward(); // distribute reward
    const request1 = await inviCoreContract.unstakeRequests(0);

    //* when
    await inviCoreContract.connect(stakeManager).sendUnstakedAmount({ value: request1.amount });

    //* then
    expect(await inviCoreContract.getUnstakeRequestsLength()).to.equal(1);
  });
});
