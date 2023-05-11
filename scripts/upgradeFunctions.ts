import { ethers, upgrades } from "hardhat";
import addresses from "./address.json";

// upgrade inviCore contract
export const upgradeInviCoreContract = async () => {
  const InviCoreContract = await ethers.getContractFactory("InviCore");
  const inviCoreContract = await upgrades.upgradeProxy(addresses.inviCoreContractAddress, InviCoreContract);
  console.log("inviCoreContract upgrade successful");

  return inviCoreContract;
};

// upgrade stakeNFT contract
export const upgradeStakeNFTContract = async () => {
  const StakeNFTContract = await ethers.getContractFactory("StakeNFT");
  const stakeNFTContract = await upgrades.upgradeProxy(addresses.stakeNFTContractAddress, StakeNFTContract);
  console.log("stakeNFTContract upgrade successful");

  return stakeNFTContract;
};

// upgrade lpPool contract
export const upgradeLpPoolContract = async () => {
  const LpPoolContract = await ethers.getContractFactory("LiquidityProviderPool");
  const lpPoolContract = await upgrades.upgradeProxy(addresses.lpPoolContractAddress, LpPoolContract);
  console.log("lpPoolContract upgrade successful");

  return lpPoolContract;
};

// upgrade inviTokenStake contract
export const upgradeInviTokenStakeContract = async () => {
  const InviTokenStakeContract = await ethers.getContractFactory("InviTokenStake");
  const inviTokenStakeContract = await upgrades.upgradeProxy(addresses.inviTokenStakeContractAddress, InviTokenStakeContract);
  console.log("inviTokenStakeContract upgrade successful");

  return inviTokenStakeContract;
};

// upgrade lendingPool contract
export const upgradeLendingPoolContract = async () => {
  const LendingPoolContract = await ethers.getContractFactory("LendingPool");
  const lendingPoolContract = await upgrades.upgradeProxy(addresses.lendingPoolContractAddress, LendingPoolContract);
  await lendingPoolContract.deployed();
  console.log("lendingPoolContract upgrade successful");

  return lendingPoolContract;
};

// deploy all contract
export const upgradeContracts = async () => {
  const inviCoreContract = await upgradeInviCoreContract();
  const stakeNFTContract = await upgradeStakeNFTContract();
  const inviTokenStakeContract = await upgradeInviTokenStakeContract();
  const lpPoolContract = await upgradeLpPoolContract();
  const lendingPoolContract = await upgradeLendingPoolContract();

  return { inviCoreContract, stakeNFTContract, inviTokenStakeContract, lpPoolContract, lendingPoolContract };
};
