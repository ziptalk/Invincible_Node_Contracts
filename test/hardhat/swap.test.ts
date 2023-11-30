import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
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
} from "../utils/utils";
import { getTestAddress } from "../utils/getTestAddress";
import { deployAll } from "../../scripts/deploy/deployAll";
import { swapSimulation } from "./swapSimulation";

describe("Swap test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let stTokenContract: Contract;
  let lendingPoolContract: Contract;
  let inviTokenContract: Contract;
  let inviTokenStakeContract: Contract;
  let inviSwapPoolContract: Contract;

  const network: string = hre.network.name;
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

  it("Test Swap function", async () => {
    if (network !== "hardhat") return; // only hardhat test

    const [deployer, LP, userA, userB, userC] = await ethers.getSigners();

    let nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    let nonceLP = await ethers.provider.getTransactionCount(LP.address);
    let nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    let nonceUserB = await ethers.provider.getTransactionCount(userB.address);
    let tx;
    let receipt;
    //* given - INVI Token
    // Regular Minting
    console.log("step 0");
    const regularMinting = await inviTokenContract.connect(deployer).regularMinting();
    await regularMinting.wait();

    // provide lp
    const lpAmount: BigNumber = ethers.utils.parseEther("1000");
    await provideLiquidity(lpPoolContract, LP, lpAmount); // lp stake
    await provideLiquidity(lpPoolContract, userB, lpAmount); // lp stake
    console.log("provided liquidity LP / userB");

    // get inviRewardInterval
    const inviRewardInterval = await lpPoolContract.inviRewardInterval();
    console.log("inviRewardInterval: ", inviRewardInterval.toString());

    // distribute inviToken reward
    for (let i = 0; i < 10; i++) {
      const distributeInviTokenReward = await lpPoolContract.connect(deployer).distributeInviTokenReward();
      receipt = await distributeInviTokenReward.wait();
      console.log("gasUsed: ", receipt.gasUsed.toString());
      // time pass
      await ethers.provider.send("evm_increaseTime", [inviRewardInterval.toNumber()]);
    }
    // claim inviToken
    const claimInviTokenLP = await lpPoolContract.connect(LP).claimInviReward();
    receipt = await claimInviTokenLP.wait();
    console.log("gasUsed: ", receipt.gasUsed.toString());
    const claimInviTokenUserB = await lpPoolContract.connect(userB).claimInviReward();
    receipt = await claimInviTokenUserB.wait();
    console.log("gasUsed: ", receipt.gasUsed.toString());

    // check inviToken balance
    // get lp, userB inviToken balance
    const lpInviTokenBalance = await inviTokenContract.balanceOf(LP.address);
    console.log("lpInviTokenBalance: ", ethers.utils.formatEther(lpInviTokenBalance.toString()));
    const userBInviTokenBalance = await inviTokenContract.balanceOf(userB.address);
    console.log("userBInviTokenBalance: ", ethers.utils.formatEther(userBInviTokenBalance.toString()));
    const totalInviRewardAmount = await lpPoolContract.totalInviRewardAmount();
    console.log("totalInviRewardAmount: ", ethers.utils.formatEther(totalInviRewardAmount.toString()));

    // Step 1. Add Liquidity
    console.log("======Step 1");
    const lpAmountPool: BigNumber = ethers.utils.parseEther("1000");
    // get native amount
    const nativeAmount = await inviSwapPoolContract.connect(LP).getAddLiquidityNative(lpAmountPool);
    console.log("required native amount: ", ethers.utils.formatEther(nativeAmount.toString()));
    const getCurrentBalance = await ethers.provider.getBalance(LP.address);
    console.log("getCurrentBalance     : ", ethers.utils.formatEther(getCurrentBalance.toString()));
    const addLiquidity = await inviSwapPoolContract
      .connect(LP)
      .addLiquidity(lpAmount, 1 * units.slippageUnit, { value: nativeAmount });
    receipt = await addLiquidity.wait();
    console.log("gasUsed: ", receipt.gasUsed.toString());

    await getSwapPoolStatus(inviSwapPoolContract, inviTokenContract, deployer);

    const testIteration = 5;
    for (let i = 0; i < testIteration; i++) {
      console.log("=================Iteration: ", i + 1, "=================");
      await swapSimulation(inviSwapPoolContract, inviTokenContract, deployer, LP, userA, userB);
    }

    // Get results
    console.log("==============Remove liquidity==============");
    const lpScoreLP = await inviSwapPoolContract.lpScore(LP.address);
    console.log("LpScoreLP      : ", ethers.utils.formatEther(lpScoreLP.toString()));
    let lpScoreUserB = await inviSwapPoolContract.lpScore(userB.address);
    lpScoreUserB = lpScoreUserB.mul(99999).div(100000);
    console.log("isptBalanceUserB   : ", ethers.utils.formatEther(lpScoreUserB.toString()));

    // remove liquidities
    const getExpectedAmountsOutRemoveLiquidityLP = await inviSwapPoolContract.getExpectedAmountsOutRemoveLiquidity(
      lpScoreLP
    );
    console.log(getExpectedAmountsOutRemoveLiquidityLP.toString());

    const removeLiquidityLP = await inviSwapPoolContract
      .connect(LP)
      .removeLiquidity(
        lpScoreLP,
        getExpectedAmountsOutRemoveLiquidityLP[0],
        getExpectedAmountsOutRemoveLiquidityLP[1],
        1 * units.slippageUnit
      );
    receipt = await removeLiquidityLP.wait();
    console.log("gasUsed: ", receipt.gasUsed.toString());

    const totalLiquidityNative = await inviSwapPoolContract.totalLiquidityNative();
    console.log("totalLiquidityNative: ", ethers.utils.formatEther(totalLiquidityNative.toString()));
    const totalLiquidityInvi = await inviSwapPoolContract.totalLiquidityInvi();
    console.log("totalLiquidityInvi  : ", ethers.utils.formatEther(totalLiquidityInvi.toString()));

    // remove liquidity userB
    const getExpectedAmountsOutRemoveLiquidityUserB = await inviSwapPoolContract.getExpectedAmountsOutRemoveLiquidity(
      lpScoreUserB
    );

    const removeLiquidityUserB = await inviSwapPoolContract
      .connect(userB)
      .removeLiquidity(
        lpScoreUserB,
        getExpectedAmountsOutRemoveLiquidityUserB[0],
        getExpectedAmountsOutRemoveLiquidityUserB[1],
        1 * units.slippageUnit
      );
    receipt = await removeLiquidityUserB.wait();
    console.log("Gas used:", receipt.gasUsed.toString());

    const totalLiquidityNativeAfterRemove = await inviSwapPoolContract.totalLiquidityNative();
    console.log(
      "totalLiquidityNativeAfterRemove: ",
      ethers.utils.formatEther(totalLiquidityNativeAfterRemove.toString())
    );
    const totalLiquidityInviAfterRemove = await inviSwapPoolContract.totalLiquidityInvi();
    console.log(
      "totalLiquidityInviAfterRemove  : ",
      ethers.utils.formatEther(totalLiquidityInviAfterRemove.toString())
    );
  });
});
