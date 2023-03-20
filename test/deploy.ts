import { Contract, Wallet } from "ethers";
import { ethers, upgrades } from "hardhat";

// deploy InviToken contract
export const deployInviToken = async () => {
  const InviTokenContract = await ethers.getContractFactory("InviToken");
  const inviTokenContract = await upgrades.deployProxy(InviTokenContract, [], { initializer: "initialize" });
  await inviTokenContract.deployed();

  return inviTokenContract;
};

// deploy ILPToken contract
export const deployILPToken = async () => {
  const ILPTokenContract = await ethers.getContractFactory("ILPToken");
  const iLPTokenContract = await upgrades.deployProxy(ILPTokenContract, [], { initializer: "initialize" });
  await iLPTokenContract.deployed();

  return iLPTokenContract;
};

// deploy stakeNFT contract
export const deployStakeNFT = async () => {
  const StakeNFTContract = await ethers.getContractFactory("StakeNFT");
  const stakeNFTContract = await upgrades.deployProxy(StakeNFTContract, [], { initializer: "initialize" });
  await stakeNFTContract.deployed();

  return stakeNFTContract;
};

// deploy lpPool contract
export const deployLpPoolContract = async (stakeManager: string, iLPTokenContract: Contract, inviTokenContract: Contract) => {
  const LpPoolContract = await ethers.getContractFactory("LiquidityProviderPool");
  const lpPoolContract = await upgrades.deployProxy(LpPoolContract, [stakeManager, iLPTokenContract.address, inviTokenContract.address], {
    initializer: "initialize",
  });
  await lpPoolContract.deployed();

  return lpPoolContract;
};

// deploy inviTokenStake contract
export const deployInviTokenStakeContract = async (stakeManager: string, inviTokenContract: Contract) => {
  const InviTokenStakeContract = await ethers.getContractFactory("InviTokenStake");
  const inviTokenStakeContract = await upgrades.deployProxy(InviTokenStakeContract, [stakeManager, inviTokenContract.address], { initializer: "initialize" });
  await inviTokenStakeContract.deployed();

  return inviTokenStakeContract;
};

// deploy inviCore contract
export const deployInviCoreContract = async (stakeManager: string, stakeNFTContract: Contract, lpPoolContract: Contract, inviTokenStakeContract: Contract) => {
  const InviCoreContract = await ethers.getContractFactory("InviCore");
  const inviCoreContract = await upgrades.deployProxy(
    InviCoreContract,
    [stakeManager, stakeNFTContract.address, lpPoolContract.address, inviTokenStakeContract.address],
    {
      initializer: "initialize",
    }
  );
  await inviCoreContract.deployed();

  return inviCoreContract;
};
