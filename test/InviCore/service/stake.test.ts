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
} from "../../deploy";
import units from "../../units.json";
import { provideLiquidity, leverageStake } from "../../utils";
import { testAddressBfc } from "../../../scripts/testAddresses/address.bfc";
import { currentNetwork } from "../../currentNetwork";
const { expectRevert } = require("@openzeppelin/test-helpers");

let network = currentNetwork; // BIFROST, KLAYTN, EVMOS

describe("Invi core service test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;

  this.beforeAll(async function () {
    // for testnet test
    if (network === "BIFROST") {
      inviCoreContract = await ethers.getContractAt("BfcInviCore", testAddressBfc.inviCoreContractAddress);
      stakeNFTContract = await ethers.getContractAt("StakeNFT", testAddressBfc.stakeNFTContractAddress);
      lpPoolContract = await ethers.getContractAt("BfcLiquidityProviderPool", testAddressBfc.lpPoolContractAddress);
    } else {
      ({ inviCoreContract, stakeNFTContract, lpPoolContract } = await deployAllWithSetting());
    }
  });

  it("Test stake function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    //* given
    const lpAmount = 100000000000;
    const previousUserNftBalance = await stakeNFTContract.balanceOf(userA.address);
    const previousTotalStakedAmount = await lpPoolContract.totalStakedAmount();
    const previousTotalLentAmount = await lpPoolContract.totalLentAmount();
    const previousStakeNFTTotalStakedAmount = await stakeNFTContract.totalStakedAmount();
    await provideLiquidity(lpPoolContract, LP, lpAmount); // lp stake

    //* when
    const principal = 1000000;
    const leverageRatio = 3 * units.leverageUnit;
    const minLockPeriod = await inviCoreContract.functions.getLockPeriod(leverageRatio);
    const lockPeriod = minLockPeriod * 2;
    const stakeInfo = await leverageStake(inviCoreContract, userA, principal, leverageRatio, lockPeriod); // userA stake
    console.log("StakeInfo: ", stakeInfo);

    //* then
    const stakedAmount = stakeInfo.stakedAmount;
    const lentAmount = stakedAmount - principal;
    // expect(await stakeNFTContract.balanceOf(userA.address)).to.equal(parseInt(previousUserNftBalance));
    // expect(await lpPoolContract.totalStakedAmount()).to.equal(previousTotalStakedAmount + lpAmount);
    // expect(await lpPoolContract.totalLentAmount()).to.equal(previousTotalLentAmount + lentAmount);
    // expect(await stakeNFTContract.totalStakedAmount()).to.equal(previousStakeNFTTotalStakedAmount + principal + lentAmount);
    console.log("staked amount: ", stakedAmount);
    console.log("lent amount: ", lentAmount);
    console.log("total staked amount: ", await lpPoolContract.totalStakedAmount());
    console.log("total lent amount: ", await lpPoolContract.totalLentAmount());
    console.log("total staked amount in stakeNFT: ", await stakeNFTContract.totalStakedAmount());
  });
});
