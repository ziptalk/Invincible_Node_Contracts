import hre from "hardhat";
import { ethers, upgrades } from "hardhat";

async function main() {
  const PriceManager = await ethers.getContractFactory("PriceManager");
  const priceManager = await upgrades.deployProxy(PriceManager, [], {
    initializer: "initialize",
  });

  await priceManager.deployed();
  console.log("deployed swap manager address: ", priceManager.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
