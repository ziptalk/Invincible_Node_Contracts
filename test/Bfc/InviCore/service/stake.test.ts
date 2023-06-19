import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
import {
  deployInviToken,
  deployILPToken,
  deployStakeNFT,
  deployLpPoolContract,
  deployInviCoreContract,
  deployInviTokenStakeContract,
  deployStKlay,
  deployAllWithSetting,
} from "../../../deploy";
import { provideLiquidity, leverageStake } from "../../../utils";
import { currentNetwork } from "../../../currentNetwork";
import { units } from "../../../units";
import { testAddressTestnetBfc } from "../../../../scripts/addresses/testAddresses/address.bfc";
import { testAddressMainnetBfc } from "../../../../scripts/addresses/testAddresses/address.bfc";
import { targets } from "../../../../scripts/targets";
const { expectRevert } = require("@openzeppelin/test-helpers");

const testAddressBfc: any = targets.testNetworkType === "TESTNET" ? testAddressTestnetBfc : testAddressMainnetBfc;

describe("Invi core service test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;

  this.beforeAll(async function () {
    // for testnet test

    inviCoreContract = await ethers.getContractAt("BfcInviCore", testAddressBfc.inviCoreContractAddress);
    stakeNFTContract = await ethers.getContractAt("StakeNFT", testAddressBfc.stakeNFTContractAddress);
    lpPoolContract = await ethers.getContractAt("BfcLiquidityProviderPool", testAddressBfc.lpPoolContractAddress);
  });

  it("Test stake function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    console.log("deployer: ", deployer.address);
    console.log("stakeManager: ", stakeManager.address);
    console.log("LP: ", LP.address);
    console.log("userA: ", userA.address);

    let nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    let nonceLP = await ethers.provider.getTransactionCount(LP.address);
    let nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    let tx;

    console.log("nonce lp: ", nonceLP);

    //* given
    const lpAmount: number = 100000000000;
    const previousUserNftBalance = await stakeNFTContract.balanceOf(userA.address);
    const previousTotalStakedAmount = await lpPoolContract.totalStakedAmount();
    const previousTotalLentAmount = await lpPoolContract.totalLentAmount();
    const previousStakeNFTTotalStakedAmount = await stakeNFTContract.totalStakedAmount();
    await provideLiquidity(lpPoolContract, LP, lpAmount, nonceLP); // lp stake

    console.log("provided liquidity");

    //* when
    const principal: BigNumber = ethers.utils.parseEther("0.001");
    const leverageRatio = 3 * units.leverageUnit;
    const minLockPeriod = await inviCoreContract.functions.getLockPeriod(leverageRatio);
    console.log("minLockPeriod: ", minLockPeriod);
    const lockPeriod = minLockPeriod * 2;
    const stakeInfo = await leverageStake(inviCoreContract, userA, principal, leverageRatio, lockPeriod, nonceUserA); // userA stake
    console.log("StakeInfo: ", stakeInfo);

    //* then
    const stakedAmount: BigNumber = stakeInfo.stakedAmount;
    const lentAmount: BigNumber = stakedAmount.sub(principal);

    let userNftBalance = await stakeNFTContract.connect(userA).balanceOf(userA.address);
    let totalStakedAmount = await lpPoolContract.connect(userA).totalStakedAmount();
    let totalLentAmount = await lpPoolContract.connect(userA).totalLentAmount();
    let stakeNFTTotalStakedAmount = await stakeNFTContract.connect(userA).totalStakedAmount();
    expect(userNftBalance).to.equal(parseInt(previousUserNftBalance) + 1);
    expect(totalStakedAmount).to.equal(BigNumber.from(previousTotalStakedAmount).add(lpAmount));
    expect(totalLentAmount).to.equal(BigNumber.from(previousTotalLentAmount).add(lentAmount));
    expect(stakeNFTTotalStakedAmount).to.equal(BigNumber.from(previousStakeNFTTotalStakedAmount).add(principal).add(lentAmount));
  });
});
