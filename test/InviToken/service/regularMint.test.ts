import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
import hre from "hardhat";
import { units } from "../../units";
import { getTestAddress } from "../../getTestAddress";

const network: string = hre.network.name; // BIFROST, KLAYTN, EVMOS
console.log("current Network: ", network);
const testAddresses: any = getTestAddress(network);

describe("InviToken service test", function () {
  let inviTokenContract: Contract;
  let lpPoolContract: Contract;

  let nonceDeployer: number;
  let nonceLP: number;
  let nonceUserA: number;
  let nonceUserB: number;
  let nonceUserC: number;
  let tx: any;

  this.beforeAll(async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    nonceLP = await ethers.provider.getTransactionCount(LP.address);
    nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    nonceUserB = await ethers.provider.getTransactionCount(userB.address);
    nonceUserC = await ethers.provider.getTransactionCount(userC.address);
    tx;

    // for testnet test
    inviTokenContract = await ethers.getContractAt("InviToken", testAddresses.inviTokenContractAddress);
    lpPoolContract = await ethers.getContractAt("LiquidityProviderPool", testAddresses.lpPoolContractAddress);
  });

  it("Test regularMint function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    // contract addresses
    console.log("lpPoolContract.address: ", lpPoolContract.address);
    //* given
    const lastMinted = await inviTokenContract.functions.lastMinted();
    console.log("lastMinted: ", lastMinted.toString());
    const owner = await inviTokenContract.functions.owner();
    console.log("owner: ", owner);
    const mintInterval = await inviTokenContract.functions.mintInterval();
    console.log("mintInterval: ", mintInterval.toString());
    const nextMinting = parseInt(lastMinted) + parseInt(mintInterval);
    console.log("nextMinting: ", nextMinting.toString());
    const currentTimestamp = await ethers.provider.getBlock("latest").then((block) => block.timestamp);
    console.log("currentTimestamp: ", currentTimestamp.toString());

    // //* when
    try {
      const regularMint = await inviTokenContract.connect(deployer).regularMinting({ nonce: nonceDeployer });
      await regularMint.wait();
      console.log("regular mint success");
    } catch (e) {
      console.log(e);
    }

    //* then
    // get lpPool invi token balance
    const lpPoolInviBalance = await inviTokenContract.functions.balanceOf(lpPoolContract.address);
    console.log("lpPoolInviBalance: ", lpPoolInviBalance.toString());
  });
});
