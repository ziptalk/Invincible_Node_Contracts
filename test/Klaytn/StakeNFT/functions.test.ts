import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
import { provideLiquidity, leverageStake } from "../../utils";
import { testAddressTestnetKlaytn, testAddressMainnetKlaytn } from "../../../scripts/addresses/testAddresses/address.klaytn";
import { targets } from "../../../scripts/targets";
import { units } from "../../units";

let targetAddress: any = targets.testNetworkType === "TESTNET" ? testAddressTestnetKlaytn : testAddressMainnetKlaytn;
describe("Invi core service test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;

  this.beforeAll(async function () {
    // for testnet test
    inviCoreContract = await ethers.getContractAt("KlaytnInviCore", targetAddress.inviCoreContractAddress);
    stakeNFTContract = await ethers.getContractAt("StakeNFT", targetAddress.stakeNFTContractAddress);
    lpPoolContract = await ethers.getContractAt("KlaytnLiquidityProviderPool", targetAddress.lpPoolContractAddress);
  });

  it("Test stakeNFT functions", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    let nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    let nonceLP = await ethers.provider.getTransactionCount(LP.address);
    let nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    let tx;

    //* given
    const principal: BigNumber = BigNumber.from("100000");
    const leverageRatio = 3 * units.leverageUnit;
    const minLockPeriod = await inviCoreContract.functions.getLockPeriod(leverageRatio);
    console.log("minLockPeriod: ", minLockPeriod);

    const lockPeriod = minLockPeriod * 2;
    const stakeInfo = await leverageStake(inviCoreContract, userA, principal, leverageRatio, lockPeriod, nonceUserA); // userA stake
    console.log("StakeInfo: ", stakeInfo);

    //* when
    const stakedAmount: number = stakeInfo.stakedAmount;
    const lentAmount: BigNumber = BigNumber.from(stakedAmount).sub(principal);

    let userNftBalance = await stakeNFTContract.connect(userA).balanceOf(userA.address);
    let stakeNFTTotalStakedAmount = await stakeNFTContract.connect(userA).totalStakedAmount();
    let rewardAmount = await stakeNFTContract.connect(userA).getRewardAmount(0);

    console.log("data: ", userNftBalance, stakeNFTTotalStakedAmount, rewardAmount);
  });
});
