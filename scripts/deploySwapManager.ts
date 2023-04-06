import hre from "hardhat";
import { ethers, upgrades } from "hardhat";

async function main() {
  const SwapManager = await ethers.getContractFactory("SwapManager");
  const swapManager = await upgrades.deployProxy(SwapManager, [], {
    initializer: "initialize",
  });

  await swapManager.deployed();
  console.log("deployed staking nft address: ", swapManager.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
