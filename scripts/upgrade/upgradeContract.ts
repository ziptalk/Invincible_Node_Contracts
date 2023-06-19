import { ethers, upgrades } from "hardhat";
import { targets } from "../targets";

const targetContract = targets.upgradingContract;
let targetAddress: string = targets.upgradingContractAddress;

// deploy all contract
async function main() {
  // deploy contract
  const UpgradeContract = await ethers.getContractFactory(targetContract);
  console.log("upgrade contract: ", targetAddress);
  const upgradeContract = await upgrades.upgradeProxy(targetAddress, UpgradeContract);
  console.log("upgrading");
  await upgradeContract.deployed();
  console.log("upgraded " + targetContract + " address: ", upgradeContract.address);

  // Get the signer (wallet) used for deployment
  const signer = (await ethers.getSigners())[0];

  // Get the balance of the signer's wallet
  const balance = await signer.getBalance();

  console.log("Upgrader wallet balance:", ethers.utils.formatEther(balance));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
