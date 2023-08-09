import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
import hre from "hardhat";
import { units } from "../units";
import {
  checkOverallStatus,
  checkUnstakeRequestLPP,
  checkUnstakeRequests,
  claimAndSplitCore,
  leverageStake,
  provideLiquidity,
  repayNFT,
  splitUnstakedLPP,
  stTokenRewardDistribution,
} from "../utils";
import { getTestAddress } from "../getTestAddress";
import { deployAll } from "../../scripts/deploy/deployAll";
import { checkTx } from "../checkTx";

describe("Invi core service test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let stTokenContract: Contract;
  let iLPTokenContract: Contract;

  const network: string = hre.network.name;
  const testAddresses: any = getTestAddress(network);
  console.log(network);

  this.beforeAll(async function () {
    // for testnet test
    if (network === "hardhat") {
      ({ inviCoreContract, stakeNFTContract, lpPoolContract, stTokenContract, iLPTokenContract } = await deployAll());
    } else {
      console.log("only hardhat test");
    }
  });

  it("Test reward function", async () => {
    if (network !== "hardhat") return; // only hardhat test

    const [deployer, LP, userA, userB, userC] = await ethers.getSigners();

    let nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    let nonceLP = await ethers.provider.getTransactionCount(LP.address);
    let nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    let tx;
    let receipt;

    //console.log(stTokenContract);
    const steps = async () => {
      // Step 1. provide liquidity
      console.log("===Step 1 - provide liquidity");
      const lpAmount: BigNumber = ethers.utils.parseEther("1000");
      await provideLiquidity(lpPoolContract, LP, lpAmount, nonceLP); // lp stake
      console.log("provided liquidity");

      // another lp
      const lpAmount2: BigNumber = ethers.utils.parseEther("100");
      await provideLiquidity(lpPoolContract, userC, lpAmount2, nonceLP); // userC stake

      // Step 2. stake
      console.log("===Step 2 - stake");
      const principal: BigNumber = ethers.utils.parseEther("1");
      const leverageRatio = 2 * units.leverageUnit;
      const minLockPeriod = await inviCoreContract.functions.getLockPeriod(leverageRatio);
      console.log("minLockPeriod: ", minLockPeriod);
      const lockPeriod = minLockPeriod * 2;
      await leverageStake(inviCoreContract, userA, principal, leverageRatio, lockPeriod, nonceUserA); // userA stake

      // add userB
      const principalB: BigNumber = ethers.utils.parseEther("2");
      const leverageRatioB = 3 * units.leverageUnit;
      await leverageStake(inviCoreContract, userB, principalB, leverageRatioB, lockPeriod, nonceUserA); // userB stake

      // Step 3. Reward distribution from stToken
      console.log("===Step 3 - distribute reward");
      const rewardAmount = ethers.utils.parseEther("10");
      // spread rewards to inviCore Contract
      const spreadRewards = await stTokenContract
        .connect(deployer)
        .spreadRewards(inviCoreContract.address, { value: rewardAmount });
      receipt = await spreadRewards.wait();
      console.log("gasUsed: ", receipt.gasUsed.toString());

      // Step 4. distribute rewards from inviCore Contract
      console.log("===Step 4 - distribute reward");
      const distributeRewards = await inviCoreContract.connect(deployer).distributeStTokenReward();
      receipt = await distributeRewards.wait();
      console.log("gasUsed: ", receipt.gasUsed.toString());

      // Step 5. Check rewards
      console.log("===Step 5 - check rewards");
      // get total NFT rewards
      const totalNftRewards = await inviCoreContract.connect(userA).totalNFTRewards();
      console.log("totalNftRewards            : ", ethers.utils.formatEther(totalNftRewards.toString()));

      await checkUnstakeRequests(inviCoreContract, userA);

      // Step 6. claim and split unstaked amount
      console.log("===Step 6 - claim and split unstaked amount");
      await claimAndSplitCore(inviCoreContract, lpPoolContract, deployer);

      // step 7. claim native reward in lp pool
      console.log("===Step 7 - claim native reward");
      // check total native reward amount
      const totalNativeRewardAmount = await lpPoolContract.connect(userA).totalNativeRewardAmount();
      console.log("totalNativeRewardAmount    : ", ethers.utils.formatEther(totalNativeRewardAmount.toString()));

      // check native reward amount of lp
      const nativeRewardAmount = await lpPoolContract.connect(LP).nativeRewardAmount(LP.address);
      console.log("nativeRewardAmount         : ", ethers.utils.formatEther(nativeRewardAmount.toString()));

      // claim native reward
      const claimNativeReward = await lpPoolContract.connect(LP).claimNativeReward();
      receipt = await claimNativeReward.wait();
      console.log("gasUsed: ", receipt.gasUsed.toString());

      expect(await lpPoolContract.connect(LP).nativeRewardAmount(LP.address)).to.equal(0);

      // Step 8. unstake nft
      console.log("===Step 8 - unstake nft");
      // ==== get unstake end period of nft
      await repayNFT(inviCoreContract, stakeNFTContract, userA);

      // check unstake requests
      await checkUnstakeRequests(inviCoreContract, userA);

      // claim and split unstaked
      await claimAndSplitCore(inviCoreContract, lpPoolContract, deployer);

      // get claimable amount of userA
      const claimableAmount = await inviCoreContract.connect(userA).claimableAmount(userA.address);
      console.log("claimableAmount: ", ethers.utils.formatEther(claimableAmount.toString()));

      // claim unstaked for staker
      const claimUnstaked = await inviCoreContract.connect(userA).claimUnstaked();
      receipt = await claimUnstaked.wait();
      console.log("gasUsed: ", receipt.gasUsed.toString());

      expect(await inviCoreContract.connect(userA).claimableAmount(userA.address)).to.equal(0);

      // ====== Check Status ====== //
      await checkOverallStatus(inviCoreContract, lpPoolContract, stakeNFTContract, stTokenContract, deployer);

      // Step 9. Split Unstaked Amount in lp Pool
      console.log("===Step 9 - split unstaked amount");
      // request amount
      const requestAmount = ethers.utils.parseEther("100");
      // request unstake
      const requestUnstake = await lpPoolContract.connect(LP).unstake(requestAmount);
      receipt = await requestUnstake.wait();
      console.log("gasUsed: ", receipt.gasUsed.toString());

      // get unstake request in lp pool
      await checkUnstakeRequestLPP(lpPoolContract, deployer);

      // claim and split unstaked
      await claimAndSplitCore(inviCoreContract, lpPoolContract, deployer);

      // split unstaked amount
      await splitUnstakedLPP(lpPoolContract, deployer);

      // Step 10. claim unstaked amount in lp pool
      console.log("===Step 10 - claim unstaked amount");
      // get unstaked Amount
      const unstakedAmount = await lpPoolContract.connect(LP).unstakedAmount();
      console.log("unstakedAmount: ", ethers.utils.formatEther(unstakedAmount.toString()));
      // get claimable amount of LP
      const claimableAmountLP = await lpPoolContract.connect(LP).claimableUnstakeAmount(LP.address);
      console.log("claimableAmountLP: ", ethers.utils.formatEther(claimableAmountLP.toString()));
      // claim unstaked amount
      const claimUnstakedLPP = await lpPoolContract.connect(LP).claimUnstaked();
      receipt = await claimUnstakedLPP.wait();
      console.log("gasUsed: ", receipt.gasUsed.toString());

      expect(await lpPoolContract.connect(LP).claimableUnstakeAmount(LP.address)).to.equal(0);

      // step 11. Stake Again for 10 times
      console.log("===Step 11 - stake again");
      // user A
      for (let i = 0; i < 5; i++) {
        const principal: BigNumber = ethers.utils.parseEther("3");
        const leverageRatio = 3 * units.leverageUnit;
        const minLockPeriod = await inviCoreContract.functions.getLockPeriod(leverageRatio);
        const lockPeriod = minLockPeriod * 1;
        await leverageStake(inviCoreContract, userA, principal, leverageRatio, lockPeriod, nonceUserA); // userA stake
      }
      console.log("userA stake complete");
      // user B
      for (let i = 0; i < 5; i++) {
        const principal: BigNumber = ethers.utils.parseEther("5");
        const leverageRatio = 2 * units.leverageUnit;
        const minLockPeriod = await inviCoreContract.functions.getLockPeriod(leverageRatio);
        const lockPeriod = minLockPeriod * 2;
        await leverageStake(inviCoreContract, userB, principal, leverageRatio, lockPeriod, nonceUserA); // userA stake
      }
      console.log("userB stake complete");

      // Step 12. Give Rewards to inviCore
      console.log("===Step 12 - give rewards to inviCore");
      const rewardAmount2 = ethers.utils.parseEther("10");
      // spread rewards to inviCore Contract
      const spreadRewards2 = await stTokenContract
        .connect(deployer)
        .spreadRewards(inviCoreContract.address, { value: rewardAmount2 });
      receipt = await spreadRewards2.wait();
      console.log("gasUsed: ", receipt.gasUsed.toString());

      const distributeRewards2 = await inviCoreContract.connect(deployer).distributeStTokenReward();
      receipt = await distributeRewards2.wait();
      console.log("gasUsed: ", receipt.gasUsed.toString());

      await claimAndSplitCore(inviCoreContract, lpPoolContract, deployer);

      await checkOverallStatus(inviCoreContract, lpPoolContract, stakeNFTContract, stTokenContract, deployer);
      await checkUnstakeRequests(inviCoreContract, userA);

      // get NFTOwnership
      const NFTOwnership2 = await stakeNFTContract.connect(userA).getNFTOwnership(userA.address);
      console.log("NFTOwnership: ", NFTOwnership2.toString());

      // get stake Info
      const stakeInfoNft2 = await stakeNFTContract.connect(userA).stakeInfos(NFTOwnership2[0]);

      // Step 11. Unstake almost all amount
      console.log("===Step 12  - unstake almost all amount");
      // get ilp balance of LP
      let ilpBalance = await iLPTokenContract.connect(LP).balanceOf(LP.address);
      console.log("ilpBalance: ", ethers.utils.formatEther(ilpBalance.toString()));

      // unstake
      const unstakeMost = await lpPoolContract.connect(LP).unstake(ilpBalance.mul(98).div(100));
      receipt = await unstakeMost.wait();
      console.log("gasUsed: ", receipt.gasUsed.toString());

      // check overall status
      await checkOverallStatus(inviCoreContract, lpPoolContract, stakeNFTContract, stTokenContract, deployer);

      // Step 13. distribute StTokenReward (should fail)
      console.log("===Step 13 - distribute StTokenReward (should fail)");
      try {
        const tx = await inviCoreContract.connect(deployer).distributeStTokenReward();
        receipt = await tx.wait();
        console.log("gasUsed: ", receipt.gasUsed.toString());
      } catch (e) {
        console.log("distributeStTokenReward failed due to distribution period");
      }

      // pass time until reward distribution period
      // get reward distribution period
      const rewardDistributionPeriod = await inviCoreContract.connect(deployer).stTokenDistributePeriod();
      console.log("rewardDistributionPeriod: ", rewardDistributionPeriod.toString());
      // pass time until reward distribution period
      await ethers.provider.send("evm_increaseTime", [rewardDistributionPeriod.toNumber()]);

      try {
        const tx = await inviCoreContract.connect(deployer).distributeStTokenReward();
        receipt = await tx.wait();
        console.log("gasUsed: ", receipt.gasUsed.toString());
      } catch (e) {
        console.log("distributeStTokenReward failed due to no reward");
      }

      // unstake rest of lp
      // get ilp balance of LP
      ilpBalance = await iLPTokenContract.connect(LP).balanceOf(LP.address);
      console.log("ilpBalance: ", ethers.utils.formatEther(ilpBalance.toString()));
      const unstakeAll = await lpPoolContract.connect(LP).unstake(ilpBalance);
      receipt = await unstakeAll.wait();
      console.log("gasUsed: ", receipt.gasUsed.toString());

      // pass time until reward distribution period
      await ethers.provider.send("evm_increaseTime", [rewardDistributionPeriod.toNumber()]);
      try {
        const tx = await inviCoreContract.connect(deployer).distributeStTokenReward();
        receipt = await tx.wait();
        console.log("gasUsed: ", receipt.gasUsed.toString());
      } catch (e) {
        console.log("distributeStTokenReward failed properly");
      }

      await checkOverallStatus(inviCoreContract, lpPoolContract, stakeNFTContract, stTokenContract, deployer);

      // Step 14. get stake info changes after unstake
      console.log("===Step 14 - get stake info changes after unstake");
      // get stake Info
      const stakeInfoNft3 = await stakeNFTContract.connect(userA).stakeInfos(NFTOwnership2[0]);
      console.log(
        "lock Period Change: ",
        stakeInfoNft2.lockPeriod.toString(),
        " -> ",
        stakeInfoNft3.lockPeriod.toString()
      );
      console.log(
        "Protocol Fee Change: ",
        stakeInfoNft2.protocolFee.toString(),
        " -> ",
        stakeInfoNft3.protocolFee.toString()
      );
      console.log(
        "leverage ratio change: ",
        stakeInfoNft2.leverageRatio.toString(),
        " -> ",
        stakeInfoNft3.leverageRatio.toString()
      );

      //expect(stakeInfoNft3.leverageRatio.toString()).to.equal(units.leverageUnit.toString());

      await checkOverallStatus(inviCoreContract, lpPoolContract, stakeNFTContract, stTokenContract, deployer);

      // Step 15. claim and split unstaked repeat
      console.log("===Step 15 - claim and split unstaked repeat");
      for (let i = 0; i < 5; i++) {
        // distribute reward
        let rewardAmount = ethers.utils.parseEther("10");
        // spread rewards to inviCore Contract
        await stTokenRewardDistribution(inviCoreContract, stTokenContract, rewardAmount, deployer);
        await repayNFT(inviCoreContract, stakeNFTContract, userB);
        await claimAndSplitCore(inviCoreContract, lpPoolContract, deployer);
        // await splitUnstakedLPP(lpPoolContract, deployer);
        // claim unstaked
        const tx = await inviCoreContract.connect(userB).claimUnstaked();
        receipt = await tx.wait();
        await checkTx(receipt);
      }

      await checkOverallStatus(inviCoreContract, lpPoolContract, stakeNFTContract, stTokenContract, deployer);
    };

    for (let i = 0; i < 5; i++) {
      await steps();
    }
  });
});
