import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
import { provideLiquidity, leverageStake } from "../../../utils";
import { units } from "../../../units";
import { testAddressTestnetKlaytn, testAddressMainnetKlaytn } from "../../../../scripts/addresses/testAddresses/address.klaytn";
const { expectRevert } = require("@openzeppelin/test-helpers");

let targetAddress = testAddressMainnetKlaytn;
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

  it("Test stake function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    let nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    let nonceLP = await ethers.provider.getTransactionCount(LP.address);
    let nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    let tx;

    //* given
    const lpAmount: number = 1000000000;
    // const previousUserNftBalance = await stakeNFTContract.balanceOf(userA.address);
    // const previousTotalStakedAmount = await lpPoolContract.totalStakedAmount();
    // const previousTotalLentAmount = await lpPoolContract.totalLentAmount();
    // const previousStakeNFTTotalStakedAmount = await stakeNFTContract.totalStakedAmount();
    await provideLiquidity(lpPoolContract, LP, lpAmount, nonceLP++); // lp stake

    // console.log("provided liquidity");

    //* when
    const principal: BigNumber = BigNumber.from("100000");
    const leverageRatio = 3 * units.leverageUnit;
    const minLockPeriod = await inviCoreContract.functions.getLockPeriod(leverageRatio);
    console.log("minLockPeriod: ", minLockPeriod);

    const lockPeriod = minLockPeriod * 2;
    const stakeInfo = await leverageStake(inviCoreContract, userA, principal, leverageRatio, lockPeriod, nonceUserA); // userA stake
    console.log("StakeInfo: ", stakeInfo);

    //* then
    const stakedAmount: number = stakeInfo.stakedAmount;
    const lentAmount: BigNumber = BigNumber.from(stakedAmount).sub(principal);

    let userNftBalance = await stakeNFTContract.connect(userA).balanceOf(userA.address);
    let totalStakedAmount = await lpPoolContract.connect(userA).totalStakedAmount();
    let totalLentAmount = await lpPoolContract.connect(userA).totalLentAmount();
    let stakeNFTTotalStakedAmount = await stakeNFTContract.connect(userA).totalStakedAmount();
    // expect(userNftBalance).to.equal(parseInt(previousUserNftBalance) + 1);
    // expect(totalStakedAmount).to.equal(BigNumber.from(previousTotalStakedAmount).add(lpAmount));
    // expect(totalLentAmount).to.equal(BigNumber.from(previousTotalLentAmount).add(lentAmount));
    // expect(stakeNFTTotalStakedAmount).to.equal(BigNumber.from(previousStakeNFTTotalStakedAmount).add(principal).add(lentAmount));
  });
});
