import { ethers, upgrades } from "hardhat";
import { testAddressBfc } from "./addresses/testAddresses/address.bfc";

//--------------------- Change this part ---------------------//
const targetContract = "StakeNFT";
const targetAddress = testAddressBfc.stakeNFTContractAddress;
//=============================================================//

// deploy all contract
async function main() {
  // deploy contract
  const UpgradeContract = await ethers.getContractFactory(targetContract);
  const upgradeContract = await upgrades.upgradeProxy(targetAddress, UpgradeContract);

  await upgradeContract.deployed();
  console.log("deployed" + targetContract + "address: ", upgradeContract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
