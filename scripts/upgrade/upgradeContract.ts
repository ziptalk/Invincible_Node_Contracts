import { ethers, upgrades } from "hardhat";
import { targets } from "../targets";

const targetContract = targets.upgradingContract;
let targetAddress: string = targets.upgradingContractAddress;

// deploy all contract
async function main() {
  // deploy contract
  const UpgradeContract = await ethers.getContractFactory(targetContract);
  const upgradeContract = await upgrades.upgradeProxy(targetAddress, UpgradeContract);

  await upgradeContract.deployed();
  console.log("upgraded " + targetContract + " address: ", upgradeContract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
