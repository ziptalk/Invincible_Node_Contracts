import hre from "hardhat";
import { ethers, upgrades } from "hardhat";
import { Contract, Wallet } from "ethers";
import { deployAllContract} from "./deployFunctions";
import address from "./address.json";

let stKlayContract: Contract;
let inviTokenContract: Contract;
let iLPTokenContract: Contract;
let iSPTTokenContract: Contract;

let stakeNFTContract: Contract;
let inviTokenStakeContract: Contract;
let lpPoolContract: Contract;
let lendingPoolContract: Contract;
let inviSwapPoolContract: Contract;
let inviCoreContract: Contract;
let swapManagerContract: Contract;


const deploy = async () => {
  const [deployer] = await ethers.getSigners();
  const stakeManager = address.stakeManager;
  console.log("Deploying contracts with the account:", deployer.address);

  ({ stKlayContract,inviTokenContract, iLPTokenContract, iSPTTokenContract,
    stakeNFTContract, inviTokenStakeContract, lpPoolContract, lendingPoolContract, 
    inviSwapPoolContract, inviCoreContract, swapManagerContract} = await deployAllContract());

  // return contract addresses
  return{
    stKlayContractAddress: stKlayContract.address,
    inviTokenContractAddress: inviTokenContract.address,
    iLPTokenContractAddress: iLPTokenContract.address,
    iSPTTokenContractAddress: iSPTTokenContract.address,
    stakeNFTContractAddress: stakeNFTContract.address,
    inviTokenStakeContractAddress: inviTokenStakeContract.address,
    lpPoolContractAddress: lpPoolContract.address,
    lendingPoolContractAddress: lendingPoolContract.address,
    inviSwapPoolContractAddress: inviSwapPoolContract.address,
    inviCoreContractAddress: inviCoreContract.address,
    swapManagerContractAddress: swapManagerContract.address,
  }
}

const main = async () => {
  console.log("deploying start ...");
  const ContractAddresses = await deploy();
  console.log("deploying end ...");
  console.log("ContractAddresses: ", ContractAddresses);
}

try{
  main()
}catch(e){
  console.error(e)
  process.exitCode = 1;
}
