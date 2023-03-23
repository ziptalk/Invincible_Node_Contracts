import hre from "hardhat";
import { ethers, upgrades } from "hardhat";
import { Contract, Wallet } from "ethers";
import address from "./address.json";

async function main() {
  // deploy stKlay contract
  const stKlayContract = await deployStKlay();
  console.log("StKlay contract deployed to:", stKlayContract.address);
  // deploy inviToken contract
  const inviTokenContract = await deployInviToken();
  console.log("InviToken contract deployed to:", inviTokenContract.address);
  // deploy ILPToken contract
  const iLPTokenContract = await deployILPToken();
  console.log("ILPToken contract deployed to:", iLPTokenContract.address);
  // deploy stakeNFT contract
  const stakeNFTContract = await deployStakeNFT();
  console.log("StakeNFT contract deployed to:", stakeNFTContract.address);
  // deploy inviTokenStake Contract
  const inviTokenStakeContract = await deployInviTokenStakeContract(address.stakeManager, inviTokenContract);
  console.log("InviTokenStake contract deployed to:", inviTokenStakeContract.address);
  // deploy liquidity pool contract
  const lpPoolContract = await deployLpPoolContract(address.stakeManager, iLPTokenContract, inviTokenContract);
  console.log("LiquidityProviderPool contract deployed to:", lpPoolContract.address);
  // deploy inviCore contract
  const inviCoreContract = await deployInviCoreContract(address.stakeManager, stakeNFTContract, lpPoolContract, inviTokenStakeContract, stKlayContract);
  console.log("InviCore contract deployed to:", inviCoreContract.address);
}

// deploy test stKlay contract
const deployStKlay = async () => {
  const StKlayContract = await ethers.getContractFactory("StKlay");
  const stKlayContract = await upgrades.deployProxy(StKlayContract, [], { initializer: "initialize" });
  await stKlayContract.deployed();

  return stKlayContract;
};

// deploy InviToken contract
const deployInviToken = async () => {
  const InviTokenContract = await ethers.getContractFactory("InviToken");
  const inviTokenContract = await upgrades.deployProxy(InviTokenContract, [], { initializer: "initialize" });
  await inviTokenContract.deployed();

  return inviTokenContract;
};

// deploy ILPToken contract
const deployILPToken = async () => {
  const ILPTokenContract = await ethers.getContractFactory("ILPToken");
  const iLPTokenContract = await upgrades.deployProxy(ILPTokenContract, [], { initializer: "initialize" });
  await iLPTokenContract.deployed();

  return iLPTokenContract;
};

// deploy stakeNFT contract
const deployStakeNFT = async () => {
  const StakeNFTContract = await ethers.getContractFactory("StakeNFT");
  const stakeNFTContract = await upgrades.deployProxy(StakeNFTContract, [], { initializer: "initialize" });
  await stakeNFTContract.deployed();

  return stakeNFTContract;
};

// deploy lpPool contract
const deployLpPoolContract = async (stakeManager: string, iLPTokenContract: Contract, inviTokenContract: Contract) => {
  const LpPoolContract = await ethers.getContractFactory("LiquidityProviderPool");
  const lpPoolContract = await upgrades.deployProxy(LpPoolContract, [stakeManager, iLPTokenContract.address, inviTokenContract.address], {
    initializer: "initialize",
  });
  await lpPoolContract.deployed();

  return lpPoolContract;
};

// deploy inviTokenStake contract
const deployInviTokenStakeContract = async (stakeManager: string, inviTokenContract: Contract) => {
  const InviTokenStakeContract = await ethers.getContractFactory("InviTokenStake");
  const inviTokenStakeContract = await upgrades.deployProxy(InviTokenStakeContract, [stakeManager, inviTokenContract.address], { initializer: "initialize" });
  await inviTokenStakeContract.deployed();

  return inviTokenStakeContract;
};

// deploy inviCore contract
const deployInviCoreContract = async (
  stakeManager: string,
  stakeNFTContract: Contract,
  lpPoolContract: Contract,
  inviTokenStakeContract: Contract,
  stKlayContract: Contract
) => {
  const InviCoreContract = await ethers.getContractFactory("InviCore");
  const inviCoreContract = await upgrades.deployProxy(
    InviCoreContract,
    [stakeManager, stakeNFTContract.address, lpPoolContract.address, inviTokenStakeContract.address, stKlayContract.address],
    {
      initializer: "initialize",
    }
  );
  await inviCoreContract.deployed();

  return inviCoreContract;
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
