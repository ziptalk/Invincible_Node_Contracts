import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
const { expectRevert } = require("@openzeppelin/test-helpers");
import hre from "hardhat";
import { getTestAddress } from "../utils/getTestAddress";
import { leverageStake } from "../utils/utils";
import { units } from "../units";

describe("LpPool service test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;

  const network: string = hre.network.name;
  const testAddresses: any = getTestAddress(network);

  this.beforeAll(async function () {
    // for testnet test

    inviCoreContract = await ethers.getContractAt("InviCore", testAddresses.inviCoreContractAddress);
    stakeNFTContract = await ethers.getContractAt("StakeNFT", testAddresses.stakeNFTContractAddress);
  });

  it("Test functions", async () => {
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
    // stake
    const principal: BigNumber = ethers.utils.parseEther("0.00001");
    const leverageRatio = 3 * units.leverageUnit;
    const minLockPeriod = await inviCoreContract.functions.getLockPeriod(leverageRatio);
    console.log("minLockPeriod: ", minLockPeriod);
    const lockPeriod = minLockPeriod * 2;
    const stakeInfo = await leverageStake(inviCoreContract, userA, principal, leverageRatio, lockPeriod, nonceUserA); // userA stake
    console.log("StakeInfo: ", stakeInfo.toString());

    // get total staked amount
    const totalStakedAmount = await stakeNFTContract.connect(LP).totalStakedAmount();
    console.log("totalStakedAmount: ", totalStakedAmount.toString());

    // getAllStakeInfoOfUser
    const allStakeInfoOfUser = await stakeNFTContract.connect(userA).getAllStakeInfoOfUser(userA.address);
    console.log("allStakeInfoOfUser: ", allStakeInfoOfUser.toString());

    // get NFT Ownership
    const nftOwnership = await stakeNFTContract.connect(LP).getNFTOwnership(deployer.address);
    console.log("nftOwnership: ", nftOwnership.toString());

    // get reward amount
    const rewardAmount = await stakeNFTContract.connect(userA).getRewardAmount(nftOwnership[0].toString());
    console.log("rewardAmount: ", rewardAmount.toString());
    //* when

    //* then
  });
});
