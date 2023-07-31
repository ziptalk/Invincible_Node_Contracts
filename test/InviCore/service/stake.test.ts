import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
const { expectRevert } = require("@openzeppelin/test-helpers");
import hre from "hardhat";
import { units } from "../../units";
import { leverageStake, provideLiquidity } from "../../utils";
import { getTestAddress } from "../../getTestAddress";
import { deployAll } from "../../../scripts/deploy/deployAll";

describe("Invi core service test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;

  const network: string = hre.network.name;
  const testAddresses: any = getTestAddress(network);
  console.log(network);

  this.beforeAll(async function () {
    // for testnet test
    if (network === "hardhat") {
      ({ inviCoreContract, stakeNFTContract, lpPoolContract } = await deployAll());
    } else {
      inviCoreContract = await ethers.getContractAt("InviCore", testAddresses.inviCoreContractAddress);
      stakeNFTContract = await ethers.getContractAt("StakeNFT", testAddresses.stakeNFTContractAddress);
      lpPoolContract = await ethers.getContractAt("LiquidityProviderPool", testAddresses.lpPoolContractAddress);
    }
  });

  it("Test stake function", async () => {
    const [deployer, LP, userA, userB, userC] = await ethers.getSigners();

    let nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    let nonceLP = await ethers.provider.getTransactionCount(LP.address);
    let nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    let tx;

    //* given
    const lpAmount: BigNumber = ethers.utils.parseEther("1");
    const previousUserNftBalance = await stakeNFTContract.balanceOf(userA.address);
    const previousTotalStakedAmount = await lpPoolContract.totalStakedAmount();
    console.log("previous total staked amount: ", previousTotalStakedAmount.toString());
    const previousTotalLentAmount = await lpPoolContract.totalLentAmount();
    const previousStakeNFTTotalStakedAmount = await stakeNFTContract.totalStakedAmount();
    await provideLiquidity(lpPoolContract, LP, lpAmount, nonceLP); // lp stake
    console.log("provided liquidity");

    //* when
    const principal: BigNumber = ethers.utils.parseEther("0.01");
    const leverageRatio = 2 * units.leverageUnit;
    const minLockPeriod = await inviCoreContract.functions.getLockPeriod(leverageRatio);
    console.log("minLockPeriod: ", minLockPeriod);
    const lockPeriod = minLockPeriod * 2;
    const stakeInfo = await leverageStake(inviCoreContract, userA, principal, leverageRatio, lockPeriod, nonceUserA); // userA stake
    console.log("StakeInfo: ", stakeInfo.toString());

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
