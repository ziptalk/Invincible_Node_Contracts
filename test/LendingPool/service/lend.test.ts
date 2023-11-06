import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
const { expectRevert } = require("@openzeppelin/test-helpers");
import hre from "hardhat";
import { units } from "../../units";
import { leverageStake, provideLiquidity } from "../../utils/utils";
import { getTestAddress } from "../../utils/getTestAddress";

describe("LendingPool service test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let inviTokenContract: Contract;
  let lendingPoolContract: Contract;

  const network: string = hre.network.name;
  const testAddresses: any = getTestAddress(network);

  this.beforeAll(async function () {
    lendingPoolContract = await ethers.getContractAt("LendingPool", testAddresses.lendingPoolContractAddress);
    inviCoreContract = await ethers.getContractAt("InviCore", testAddresses.inviCoreContractAddress);
    stakeNFTContract = await ethers.getContractAt("StakeNFT", testAddresses.stakeNFTContractAddress);
    inviTokenContract = await ethers.getContractAt("InviToken", testAddresses.inviTokenContractAddress);
  });

  it("Test lend function", async () => {
    const [deployer, LP, userA, userB, userC] = await ethers.getSigners();

    console.log("deployer: ", deployer.address);
    console.log("LP: ", LP.address);
    console.log("userA: ", userA.address);

    let nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    let nonceLP = await ethers.provider.getTransactionCount(LP.address);
    let nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    console.log("nonce lp: ", nonceLP);

    //* given
    // get lendingPool invi balance
    const lendingPoolInviBalance = await inviTokenContract.connect(deployer).balanceOf(inviTokenContract.address);
    console.log("lendingPoolInviBalance: ", lendingPoolInviBalance.toString());

    // get NFT ownership
    const nftList = await stakeNFTContract.connect(userA).getNFTOwnership(userA.address);
    console.log("nftList: ", nftList);
    // create lend info
    let slippage = units.slippageUnit * 3;
    let _nftId = nftList[0];

    //* when
    try {
      const lendInfo = await lendingPoolContract.connect(userA).createLendInfo(_nftId, slippage);
      console.log("lendInfo: ", lendInfo.toString());
      const lend = await lendingPoolContract.connect(userA).lend(lendInfo);
      await lend.wait();
    } catch (error) {
      console.log("error: ", error);
    }

    //* then
  });
});
