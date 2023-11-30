import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import hre from "hardhat";
import { units } from "../../units";
import { leverageStake, provideLiquidity } from "../../utils/utils";
import { initializeContracts } from "../../utils/initializeContracts";

describe("Invi core service", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;

  const network: string = hre.network.name;

  before(async function () {
    const contracts = await initializeContracts(network, ["InviCore", "StakeNFT", "LiquidityProviderPool"]);

    inviCoreContract = contracts["InviCore"];
    stakeNFTContract = contracts["StakeNFT"];
    lpPoolContract = contracts["LiquidityProviderPool"];
  });

  describe("Stake functionality", function () {
    it("should correctly update balances and totals after staking", async () => {
      const [deployer, LP, userA, userB, userC] = await ethers.getSigners();

      // Setup
      const lpAmount: BigNumber = ethers.utils.parseEther("1");
      await provideLiquidity(lpPoolContract, LP, lpAmount);

      const previousUserNftBalance = await stakeNFTContract.balanceOf(userA.address);
      const previousTotalStakedAmount = await lpPoolContract.totalStakedAmount();
      const previousTotalLentAmount = await lpPoolContract.totalLentAmount();
      const previousStakeNFTTotalStakedAmount = await stakeNFTContract.totalStakedAmount();

      // Action
      const principal: BigNumber = ethers.utils.parseEther("0.01");
      const leverageRatio = 2 * units.leverageUnit;
      const minLockPeriod = await inviCoreContract.functions.getLockPeriod(leverageRatio);
      const lockPeriod = minLockPeriod * 2;
      await leverageStake(inviCoreContract, userA, principal, leverageRatio, lockPeriod);

      // Assertions
      const stakedAmount: BigNumber = principal.mul(leverageRatio);
      const lentAmount: BigNumber = stakedAmount.sub(principal);
      const userNftBalance = await stakeNFTContract.connect(userA).balanceOf(userA.address);
      const totalStakedAmount = await lpPoolContract.connect(userA).totalStakedAmount();
      const totalLentAmount = await lpPoolContract.connect(userA).totalLentAmount();
      const stakeNFTTotalStakedAmount = await stakeNFTContract.connect(userA).totalStakedAmount();

      expect(userNftBalance).to.equal(previousUserNftBalance.add(1));
      expect(totalStakedAmount).to.equal(previousTotalStakedAmount.add(lpAmount));
      expect(totalLentAmount).to.equal(previousTotalLentAmount.add(lentAmount));
      expect(stakeNFTTotalStakedAmount).to.equal(previousStakeNFTTotalStakedAmount.add(principal).add(lentAmount));
    });
  });
});
