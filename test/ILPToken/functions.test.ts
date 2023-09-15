import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
import hre from "hardhat";
import { getTestAddress } from "../getTestAddress";
import { units } from "../units";
import { provideLiquidity } from "../utils";
import { deployAll } from "../../scripts/deploy/deployAll";

const network: string = hre.network.name; // BIFROST, KLAYTN, EVMOS
console.log("current Network: ", network);
const testAddresses: any = getTestAddress(network);

describe("ILPToken functions test", function () {
  let lpPoolContract: Contract;
  let iLPTokenContract: Contract;

  let nonceDeployer: number;
  let nonceLP: number;
  let nonceUserA: number;
  let nonceUserB: number;
  let nonceUserC: number;
  let tx: any;

  this.beforeAll(async () => {
    const [deployer, LP, userA, userB, userC] = await ethers.getSigners();

    nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    nonceLP = await ethers.provider.getTransactionCount(LP.address);
    nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    nonceUserB = await ethers.provider.getTransactionCount(userB.address);
    nonceUserC = await ethers.provider.getTransactionCount(userC.address);
    tx;

    if (network === "hardhat") {
      ({ iLPTokenContract, lpPoolContract } = await deployAll());
    } else {
      // for testnet test
      iLPTokenContract = await ethers.getContractAt("ILPToken", testAddresses.iLPTokenContractAddress);
      lpPoolContract = await ethers.getContractAt("LiquidityProviderPool", testAddresses.lpPoolContractAddress);
    }
  });

  it("Test transfer, transferFrom function", async () => {
    const [deployer, LP, userA, userB, userC] = await ethers.getSigners();

    //* given
    const initBalance = await iLPTokenContract.functions.balanceOf(LP.address);
    if (initBalance.toString() === "0") {
      // provide lp if none
      const lpAmount = ethers.utils.parseEther("0.1");
      await provideLiquidity(lpPoolContract, LP, lpAmount, nonceLP);
      console.log("provided liquidity");
    }
    const lpILPBalance = await iLPTokenContract.functions.balanceOf(LP.address);
    console.log("ilp lp balance: ", lpILPBalance.toString());
    const lpStakedAmount: BigNumber = await lpPoolContract.functions.stakedAmount(LP.address);
    console.log("lp staked amount: ", lpStakedAmount.toString());
    const userAILPBalance: BigNumber = await iLPTokenContract.functions.balanceOf(userA.address);
    console.log("ilp userA balance: ", userAILPBalance.toString());
    const userAStakedAmount: BigNumber = await lpPoolContract.functions.stakedAmount(userA.address);
    console.log("userA staked amount: ", userAStakedAmount.toString());

    //* when
    const transferAmount: BigNumber = ethers.utils.parseEther("0.01");
    try {
      tx = await iLPTokenContract.connect(LP).transfer(userA.address, transferAmount);
      await tx.wait();
    } catch (e) {
      console.log("transfer failed at " + nonceLP, e);
    }

    try {
      // approve userA to transferFrom LP
      tx = await iLPTokenContract.connect(LP).approve(userA.address, transferAmount);
      await tx.wait();
      // transferFrom LP to userB
      tx = await iLPTokenContract.connect(userA).safeTransferFrom(LP.address, userA.address, transferAmount);
      await tx.wait();
    } catch (e) {
      console.log("transferFrom failed at " + nonceUserA, e);
    }

    //* then
    // check balance
    const lpILPBalanceAfter = await iLPTokenContract.functions.balanceOf(LP.address);
    console.log("ilp lp balance after: ", lpILPBalanceAfter.toString());
    const lpStakedAmountAfter = await lpPoolContract.functions.stakedAmount(LP.address);
    console.log("lp staked amount after: ", lpStakedAmountAfter.toString());
    const userAILPBalanceAfter = await iLPTokenContract.functions.balanceOf(userA.address);
    console.log("ilp userA balance after: ", userAILPBalanceAfter.toString());
    const userAStakedAmountAfter = await lpPoolContract.functions.stakedAmount(userA.address);
    console.log("userA staked amount after: ", userAStakedAmountAfter.toString());
    // expect(lpILPBalanceAfter).to.equal(BigNumber.from(lpILPBalance).sub(transferAmount.mul(2)).toString());
    // expect(lpStakedAmountAfter).to.equal(BigNumber.from(lpStakedAmount).sub(transferAmount.mul(2)).toString());
    // expect(userAILPBalanceAfter).to.equal(BigNumber.from(userAILPBalance).add(transferAmount.mul(2)).toString());
    // expect(userAStakedAmountAfter).to.equal(BigNumber.from(userAStakedAmount).add(transferAmount.mul(2)).toString());
  });
});
