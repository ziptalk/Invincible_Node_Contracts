import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
import hre from "hardhat";
import { units } from "../../units";
import { getTestAddress } from "../../utils/getTestAddress";
import { initializeContracts } from "../../utils/initializeContracts";

const network: string = hre.network.name; // BIFROST, KLAYTN, EVMOS
console.log("current Network: ", network);
const testAddresses: any = getTestAddress(network);

describe("InviToken service test", function () {
  let inviTokenContract: Contract;
  let lpPoolContract: Contract;

  before(async function () {
    const contracts = await initializeContracts(network, ["InviToken", "LiquidityProviderPool"]);

    inviTokenContract = contracts["InviToken"];
    lpPoolContract = contracts["LiquidityProviderPool"];
  });

  it("Test regularMint function", async () => {
    const [deployer, LP, userA, userB, userC] = await ethers.getSigners();

    // contract addresses
    console.log("lpPoolContract.address: ", lpPoolContract.address);
    //* given
    const lastMinted = await inviTokenContract.functions.lastMinted();
    console.log("lastMinted       : ", lastMinted.toString());
    const owner = await inviTokenContract.functions.owner();
    console.log("owner            : ", owner);
    const mintInterval = await inviTokenContract.functions.mintInterval();
    console.log("mintInterval     : ", mintInterval.toString());
    const nextMinting = parseInt(lastMinted) + parseInt(mintInterval);
    console.log("nextMinting      : ", nextMinting.toString());
    const currentTimestamp = await ethers.provider.getBlock("latest").then((block) => block.timestamp);
    console.log("currentTimestamp : ", currentTimestamp.toString());
    const lpPoolContractInviBalance = await inviTokenContract.functions.balanceOf(lpPoolContract.address);
    console.log("lpPoolContractInviBalance: ", lpPoolContractInviBalance.toString());

    // //* when
    try {
      const regularMint = await inviTokenContract.connect(deployer).regularMinting();
      await regularMint.wait();
      console.log("regular mint success");
    } catch (e) {
      console.log("regular Mint failed", e);
    }

    //* then
    // get lpPool invi token balance
    const lpPoolInviBalance = await inviTokenContract.functions.balanceOf(lpPoolContract.address);
    console.log("lpPoolInviBalance: ", lpPoolInviBalance.toString());
  });
});
