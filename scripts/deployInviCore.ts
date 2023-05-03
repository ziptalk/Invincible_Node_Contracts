import hre from "hardhat";
import { ethers, upgrades } from "hardhat";
import address from "./address.json";

async function main() {
  // deploy contract
  const InviCoreContract = await ethers.getContractFactory("InviCore");
  const inviCoreContract = await upgrades.deployProxy(InviCoreContract, [address.stakelyContractAddress], {
    initializer: "initialize",
  });

  await inviCoreContract.deployed();
  console.log("deployed InviCore address: ", inviCoreContract.address);

  // set init condition
  const [deployer] = await ethers.getSigners();
  let nonce = await ethers.provider.getTransactionCount(deployer.address);

  const stakeManager = address.stakeManager;
  const stakeNFTContract = await ethers.getContractAt("StakeNFT", address.stakeNFTContractAddress);
  const inviTokenStakeContract = await ethers.getContractAt("InviTokenStake", address.inviTokenStakeContractAddress);
  const lpPoolContract = await ethers.getContractAt("LiquidityProviderPool", address.lpPoolContractAddress);

  const tx1 = await inviCoreContract.connect(deployer).setStakeNFTContract(stakeNFTContract.address, { nonce: nonce++ });
  await tx1.wait();
  const tx2 = await inviCoreContract.connect(deployer).setStakeManager(stakeManager, { nonce: nonce++ });
  await tx2.wait();
  const tx3 = await inviCoreContract.connect(deployer).setLpPoolContract(lpPoolContract.address, { nonce: nonce++ });
  await tx3.wait();
  const tx4 = await inviCoreContract.connect(deployer).setInviTokenStakeContract(inviTokenStakeContract.address, { nonce: nonce++ });
  await tx4.wait();

  console.log("inviCore init condition set");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
