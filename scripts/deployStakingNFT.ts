import hre from "hardhat";

async function main() {
  const StakingNFT = await hre.ethers.getContractFactory("StakingNFT");
  const stakingNFT = await StakingNFT.deploy();

  console.log("deployed staking nft address: ", stakingNFT.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
