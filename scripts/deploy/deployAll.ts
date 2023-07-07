import hre from "hardhat";
import { ethers, upgrades } from "hardhat";
import { Contract, Wallet } from "ethers";
import { setInit } from "./setInit";
import { walletAddresses } from "../addresses/walletAddresses";
import { deployAllContract } from "./deployFunctions";
import { targets } from "../targets";

let inviTokenContract: Contract;
let iLPTokenContract: Contract;
let iSPTTokenContract: Contract;

let stakeNFTContract: Contract;
let inviTokenStakeContract: Contract;
let lpPoolContract: Contract;
let lendingPoolContract: Contract;
let inviSwapPoolContract: Contract;
let inviCoreContract: Contract;
let priceManagerContract: Contract;

//-----------------------------------------------------------------------------------------------//
//====================================== Change this part ========================================//
const network: string = hre.network.name;

//-----------------------------------------------------------------------------------------------//
//-----------------------------------------------------------------------------------------------//

const deploy = async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // deploy contracts
  ({
    inviTokenContract,
    iLPTokenContract,
    iSPTTokenContract,
    stakeNFTContract,
    inviTokenStakeContract,
    lpPoolContract,
    lendingPoolContract,
    inviSwapPoolContract,
    inviCoreContract,
    priceManagerContract,
  } = await deployAllContract(network));

  console.log("Contracts deployed");
  console.log("Setting initial states...");

  let addresses = {
    inviTokenContractAddress: inviTokenContract.address,
    iLPTokenContractAddress: iLPTokenContract.address,
    iSPTTokenContractAddress: iSPTTokenContract.address,
    stakeNFTContractAddress: stakeNFTContract.address,
    inviTokenStakeContractAddress: inviTokenStakeContract.address,
    lpPoolContractAddress: lpPoolContract.address,
    lendingPoolContractAddress: lendingPoolContract.address,
    inviSwapPoolContractAddress: inviSwapPoolContract.address,
    inviCoreContractAddress: inviCoreContract.address,
    priceManagerContractAddress: priceManagerContract.address,
  };

  console.log(addresses);

  // return contract addresses
  return {
    inviTokenContractAddress: inviTokenContract.address,
    iLPTokenContractAddress: iLPTokenContract.address,
    iSPTTokenContractAddress: iSPTTokenContract.address,
    stakeNFTContractAddress: stakeNFTContract.address,
    inviTokenStakeContractAddress: inviTokenStakeContract.address,
    lpPoolContractAddress: lpPoolContract.address,
    lendingPoolContractAddress: lendingPoolContract.address,
    inviSwapPoolContractAddress: inviSwapPoolContract.address,
    inviCoreContractAddress: inviCoreContract.address,
    priceManagerContractAddress: priceManagerContract.address,
  };
};

const main = async () => {
  console.log("deploying start ...");
  const ContractAddresses = await deploy();
  console.log("deploying end ...");
  // set init
  await setInit(ContractAddresses, network);
  console.log("ContractAddresses: ", ContractAddresses);
};

try {
  main();
} catch (e) {
  console.error(e);
  process.exitCode = 1;
}
