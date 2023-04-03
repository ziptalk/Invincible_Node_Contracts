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
  deployAllWithSetting
} from "../../deploy";
import units from "../../units.json";
import { provideLiquidity, leverageStake } from "../../utils";

const { expectRevert } = require("@openzeppelin/test-helpers");

describe("Invi core service test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  

  this.beforeEach(async () => {
    ({inviCoreContract, stakeNFTContract, lpPoolContract} = await deployAllWithSetting());
  });

  it("Test stake function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    //* given
    const lpAmount = 10000000000;
    await provideLiquidity(lpPoolContract, LP, lpAmount); // lp stake

    //* when
    const principal = 1000000;
    const leverageRatio = 3 * units.leverageUnit;
    const stakeInfo = await leverageStake(inviCoreContract, userA, principal, leverageRatio);// userA stake

    //* then
    const stakedAmount = stakeInfo.stakedAmount;
    const lentAmount = stakedAmount - principal;
    expect(await stakeNFTContract.balanceOf(userA.address)).to.equal(1);
    expect(await lpPoolContract.totalStakedAmount()).to.equal(lpAmount);
    expect(await lpPoolContract.totalLentAmount()).to.equal(lentAmount);
    expect(await stakeNFTContract.totalStakedAmount()).to.equal(principal + lentAmount);
  });
});
