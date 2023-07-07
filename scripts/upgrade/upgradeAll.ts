import { getUpgradeAddress } from "../getUpgradeAddress";
import { upgradeContracts, upgradeLendingPoolContract } from "./upgradeFunctions";
import hre, { ethers } from "hardhat";

const network: string = hre.network.name;

const targetContracts = ["InviCore", "LiquidityProviderPool", "StakeNFT", "InviTokenStake", "InviToken"];

const main = async () => {
  console.log("upgrading start ...");
  const upgradeAddresses = getUpgradeAddress(network, "test");

  for (let i = 0; i < targetContracts.length; i++) {
    const UpgradeContract = await ethers.getContractFactory(targetContracts[i]);
    // console.log("upgrade contract: ", upgradeAddresses.);
  }

  console.log("upgrading end ...");
};

try {
  main();
} catch (e) {
  console.error(e);
  process.exitCode = 1;
}
