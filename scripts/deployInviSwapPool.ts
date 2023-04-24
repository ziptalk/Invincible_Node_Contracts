import hre from "hardhat";
import { ethers, upgrades } from "hardhat";
import address from "./address.json";

async function main() {
  const InviSwapPool = await ethers.getContractFactory("InviSwapPool");
  const inviSwapPool = await upgrades.deployProxy(InviSwapPool, [address.inviTokenContractAddress, address.iSPTTokenContractAddress], {
    initializer: "initialize",
  });

  await inviSwapPool.deployed();
  console.log("deployed Invi Swap Pool address: ", inviSwapPool.address);

  const inviSwapPoolAddress = inviSwapPool.address;

  const [deployer] = await ethers.getSigners();

  await inviSwapPool.connect(deployer).setSwapManager(address.swapManagerContractAddress);
  console.log("inviSwapPool init condition set");

  setTimeout(async () => {
    const isptContract = await ethers.getContractAt("ISPTToken", address.iSPTTokenContractAddress);
    await isptContract.connect(deployer).setInviSwapPool(inviSwapPoolAddress);
  }, 10000);

  setTimeout(async () => {
    console.log("iSPTToken init condition set(inviSwapPool address): ", await isptContract.functions.inviSwapPool());
  }, 10000);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
