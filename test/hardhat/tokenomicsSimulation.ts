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

describe("Tokenomics test", function () {
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

  it("Test What can a person do with 1000 ether", async () => {
    if (network !== "hardhat") return; // only hardhat test

    const [deployer, LP, userA, userB, userC] = await ethers.getSigners();

    let nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    let nonceLP = await ethers.provider.getTransactionCount(LP.address);
    let nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    let tx;
    let receipt;
  });
});
