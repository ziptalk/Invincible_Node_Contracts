import hre from "hardhat";
import { ethers, upgrades } from "hardhat";

async function main() {
  const StakeNFT = await ethers.getContractFactory("StakeNFT");
  const stakeNFT = await upgrades.deployProxy(StakeNFT, [], {
    initializer: "initialize",
  });

  await stakeNFT.deployed();
  console.log("deployed staking nft address: ", stakeNFT.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
