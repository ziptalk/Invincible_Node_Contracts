import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
const { expectRevert } = require("@openzeppelin/test-helpers");
import hre from "hardhat";
import { units } from "../units";
import {
  checkUnstakeRequestLPP,
  checkUnstakeRequests,
  claimAndSplitCore,
  getSwapPoolStatus,
  leverageStake,
  provideLiquidity,
  splitUnstakedLPP,
} from "../utils";
import { getTestAddress } from "../getTestAddress";
import { deployAll } from "../../scripts/deploy/deployAll";

describe("Invi core service test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let stTokenContract: Contract;
  let lendingPoolContract: Contract;
  let inviTokenContract: Contract;
  let inviTokenStakeContract: Contract;
  let inviSwapPoolContract: Contract;

  const network: string = hre.network.name;
  const testAddresses: any = getTestAddress(network);
  console.log(network);

  this.beforeAll(async function () {
    // for testnet test
    if (network === "hardhat") {
      ({
        inviCoreContract,
        stakeNFTContract,
        lpPoolContract,
        stTokenContract,
        lendingPoolContract,
        inviTokenStakeContract,
        inviTokenContract,
        inviSwapPoolContract,
      } = await deployAll());
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
    let nonceUserB = await ethers.provider.getTransactionCount(userB.address);
    let tx;

    //* given - INVI Token
    // Regular Minting
    console.log("step 0");
    const regularMinting = await inviTokenContract.connect(deployer).regularMinting();
    await regularMinting.wait();
    // provide lp
    const lpAmount: BigNumber = ethers.utils.parseEther("1000");
    await provideLiquidity(lpPoolContract, LP, lpAmount, nonceLP); // lp stake
    console.log("provided liquidity");
    // get inviRewardInterval
    const inviRewardInterval = await lpPoolContract.inviRewardInterval();
    console.log("inviRewardInterval: ", inviRewardInterval.toString());
    // distribute inviToken reward
    for (let i = 0; i < 10; i++) {
      const distributeInviTokenReward = await lpPoolContract.connect(deployer).distributeInviTokenReward();
      await distributeInviTokenReward.wait();
      // time pass
      await ethers.provider.send("evm_increaseTime", [inviRewardInterval.toNumber()]);
    }
    // claim inviToken
    const claimInviToken = await lpPoolContract.connect(LP).claimInviReward();
    await claimInviToken.wait();
    // check inviToken balance
    const inviTokenBalance = await inviTokenContract.balanceOf(LP.address);
    console.log("inviTokenBalance:      ", ethers.utils.formatEther(inviTokenBalance.toString()));
    const totalInviRewardAmount = await lpPoolContract.totalInviRewardAmount();
    console.log("totalInviRewardAmount: ", ethers.utils.formatEther(totalInviRewardAmount.toString()));

    const testIteration = 5;
    const swapSimulation = async () => {
      // Step 1. Add Liquidity
      console.log("Step 1");
      const lpAmount: BigNumber = ethers.utils.parseEther("1000");
      // get native amount
      const nativeAmount = await inviSwapPoolContract.connect(LP).getAddLiquidityNative(lpAmount);
      const addLiquidity = await inviSwapPoolContract
        .connect(LP)
        .addLiquidity(lpAmount, 1 * units.slippageUnit, { value: nativeAmount });
      await addLiquidity.wait();

      await getSwapPoolStatus(inviSwapPoolContract, deployer);

      // Step 2. Swap Native to INVI (iterate 10 times)
      console.log("Step 2");
      for (let i = 0; i < 10; i++) {
        const getNativeToInviOutMaxInput = await inviSwapPoolContract.getNativeToInviOutMaxInput();
        const nativeAmountToSwap = getNativeToInviOutMaxInput.mul(90).div(100);
        console.log("getNativeToInviOutMaxInput: ", ethers.utils.formatEther(getNativeToInviOutMaxInput.toString()));
        const expectedAmountOut = await inviSwapPoolContract.getNativeToInviOutAmount(nativeAmountToSwap);
        const swapNativeToInvi = await inviSwapPoolContract
          .connect(userA)
          .swapNativeToInvi(expectedAmountOut.mul(99).div(100), { value: nativeAmountToSwap });
        await swapNativeToInvi.wait();
        await getSwapPoolStatus(inviSwapPoolContract, deployer);
      }

      // Step3. Claim INVI Rewards
      console.log("Step 3");
      // get reward amount
      const inviRewardAmount = await inviSwapPoolContract.lpRewardInvi(LP.address);
      console.log("inviRewardAmount: ", ethers.utils.formatEther(inviRewardAmount.toString()));
      // get Invi balance of userA
      const inviBalanceOfLP = await inviTokenContract.balanceOf(LP.address);
      const withdrawFees = await inviSwapPoolContract.connect(LP).withdrawFees();
      await withdrawFees.wait();
      const inviBalanceOfLPAfterWithdrawFees = await inviTokenContract.balanceOf(LP.address);
      console.log("inviBalanceOfUserA: ", ethers.utils.formatEther(inviBalanceOfLP.toString()));
      console.log(
        "inviBalanceOfUserAAfterWithdrawFees: ",
        ethers.utils.formatEther(inviBalanceOfLPAfterWithdrawFees.toString())
      );
      expect(inviBalanceOfLPAfterWithdrawFees.sub(inviBalanceOfLP)).to.be.equal(withdrawFees);
    };

    for (let i = 0; i < testIteration; i++) {
      await swapSimulation();
    }
  });
});
