import { ethers, upgrades } from "hardhat";
import { testAddressBfc } from "./addresses/testAddresses/address.bfc";
import { testAddressMainnetKlaytn } from "./addresses/testAddresses/address.klaytn";

//--------------------- Change this part ---------------------//
const targetContract = "KlaytnInviCore";
const targetAddress = testAddressMainnetKlaytn.inviCoreContractAddress;
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
