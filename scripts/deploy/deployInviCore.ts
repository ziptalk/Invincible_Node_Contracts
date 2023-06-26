import hre from "hardhat";
import { ethers, upgrades } from "hardhat";
import { targets } from "../targets";
import { bfcLiveAddress } from "../addresses/liveAddresses/address.bfc";
import { evmosLiveAddress } from "../addresses/liveAddresses/address.evmos";
import { klaytnLiveAddress } from "../addresses/liveAddresses/address.klaytn";

// deploy inviCore contract
export const deployInviCoreContract = async (stTokenContract: String, liquidStakingAddress: String, network: String) => {
  let InviCoreContract;
  let inviCoreContract;
  if (network === "BIFROST") {
    InviCoreContract = await ethers.getContractFactory("BfcInviCore");
    inviCoreContract = await upgrades.deployProxy(InviCoreContract, [stTokenContract, liquidStakingAddress], { initializer: "initialize" });
    await inviCoreContract.deployed();
  } else if (network === "KLAYTN") {
    InviCoreContract = await ethers.getContractFactory("KlaytnInviCore");
    inviCoreContract = await upgrades.deployProxy(InviCoreContract, [stTokenContract, liquidStakingAddress], { initializer: "initialize" });
    await inviCoreContract.deployed();
  } else if (network === "EVMOS") {
    InviCoreContract = await ethers.getContractFactory("EvmosInviCore");
    inviCoreContract = await upgrades.deployProxy(InviCoreContract, [stTokenContract, liquidStakingAddress], { initializer: "initialize" });
    await inviCoreContract.deployed();
  } else {
    InviCoreContract = await ethers.getContractFactory("InviCore");
    inviCoreContract = await upgrades.deployProxy(InviCoreContract, [stTokenContract], { initializer: "initialize" });
    await inviCoreContract.deployed();
  }

  return inviCoreContract;
};

let stTokenContractAddress: string;
let liquidStakingAddress: string;
async function main() {
  const network: string = targets.network;

  if (network === "BIFROST") {
    if (targets.networkType === "TESTNET") {
      stTokenContractAddress = bfcLiveAddress.testnet.stBFCContractAddress;
      liquidStakingAddress = bfcLiveAddress.testnet.bfcLiquidStakingContractAddress;
    } else {
      stTokenContractAddress = bfcLiveAddress.mainnet.stBFCContractAddress;
      liquidStakingAddress = bfcLiveAddress.mainnet.bfcLiquidStakingContractAddress;
    }
  } else if (network === "EVMOS") {
    if (targets.networkType === "TESTNET") {
      stTokenContractAddress = evmosLiveAddress.testnet.stEvmosContractAddress;
      liquidStakingAddress = evmosLiveAddress.testnet.evmosLiquidStakingContractAddress;
    } else {
      stTokenContractAddress = evmosLiveAddress.mainnet.stEvmosContractAddress;
      liquidStakingAddress = evmosLiveAddress.mainnet.evmosLiquidStakingContractAddress;
    }
  } else if (network === "KLAYTN") {
    if (targets.networkType === "TESTNET") {
      stTokenContractAddress = klaytnLiveAddress.testnet.stakelyContractAddress;
      liquidStakingAddress = klaytnLiveAddress.testnet.stakelyContractAddress;
    } else {
      stTokenContractAddress = klaytnLiveAddress.mainnet.stakelyContractAddress;
      liquidStakingAddress = klaytnLiveAddress.mainnet.stakelyContractAddress;
    }
  } else {
    // report error
    console.log("invalid network type error");
  }
  console.log("stTokenContractAddress: ", stTokenContractAddress);
  console.log("liquidStakingAddress: ", liquidStakingAddress);
  const inviCoreContract = await deployInviCoreContract(stTokenContractAddress, liquidStakingAddress, network);
  console.log("deployed inviCore contract: ", inviCoreContract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
