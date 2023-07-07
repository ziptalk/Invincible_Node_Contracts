import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
const { expectRevert } = require("@openzeppelin/test-helpers");
import hre from "hardhat";
import { units } from "../../units";
import { leverageStake, provideLiquidity } from "../../utils";
import { getTestAddress } from "../../getTestAddress";

describe("LpPool service test", function () {
  let inviTokenContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let lendingPoolContract: Contract;

  const network: string = hre.network.name;
  const testAddresses: any = getTestAddress(network);

  this.beforeAll(async function () {
    lendingPoolContract = await ethers.getContractAt("LendingPool", testAddresses.lendingPoolContractAddress);
    inviTokenContract = await ethers.getContractAt("InviToken", testAddresses.inviTokenContractAddress);
    stakeNFTContract = await ethers.getContractAt("StakeNFT", testAddresses.stakeNFTContractAddress);
    lpPoolContract = await ethers.getContractAt("LiquidityProviderPool", testAddresses.lpPoolContractAddress);
  });

  it("Test lend function", async () => {
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
    // get inviToken Balance of userA
    const prevInviTokenBalanceOfUserA = await inviTokenContract.connect(userA).balanceOf(userA.address);
    console.log("prevInviTokenBalanceOfUserA: ", prevInviTokenBalanceOfUserA.toString());
    // get NFT ownership
    const nftList = await stakeNFTContract.connect(userA).getNFTOwnership(userA.address);
    console.log("nftList: ", nftList);
    // create lend info
    let slippage = units.slippageUnit * 3;
    let _nftId = nftList[0];
    const lendInfo = await lendingPoolContract.connect(userA).createLendInfo(_nftId, slippage);
    console.log("lendInfo: ", lendInfo.toString());
    // lend
    try {
      const lend = await lendingPoolContract.connect(userA).lend(lendInfo);
      await lend.wait();
    } catch (error) {
      console.log("error: ", error);
    }

    //* when
    // repay
    try {
      const repay = await lendingPoolContract.connect(userA).repay(_nftId);
      await repay.wait();
    } catch (error) {
      console.log("error: ", error);
    }

    //* then
    // get inviToken Balance of userA
    const afterInviTokenBalanceOfUserA = await inviTokenContract.connect(userA).balanceOf(userA.address);
    console.log("afterInviTokenBalanceOfUserA: ", afterInviTokenBalanceOfUserA.toString());
    expect(afterInviTokenBalanceOfUserA).to.be.equal(prevInviTokenBalanceOfUserA);
  });
});
