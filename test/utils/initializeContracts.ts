import { Contract } from "ethers";
import { deployAll } from "../../scripts/deploy/deployAll";
import { NETWORK_NAMES, contractToDeployedPropertyMap } from "../constants";
import { ethers } from "hardhat";
import { getTestAddress } from "./getTestAddress";

export const initializeContracts = async (network: string, names: string[]): Promise<Record<string, Contract>> => {
  const contracts: Record<string, Contract> = {};
  const testAddresses: any = getTestAddress(network);

  if (network === NETWORK_NAMES.HARDHAT) {
    const deployedContracts: Record<string, Contract> = (await deployAll()) as Record<string, Contract>; // Type cast here

    for (const name of names) {
      const property = contractToDeployedPropertyMap[name];
      if (property && deployedContracts[property]) {
        contracts[name] = deployedContracts[property];
      } else {
        console.error(`Unexpected contract name or missing mapping: ${name}`);
      }
    }
  } else {
    for (const name of names) {
      const property = contractToDeployedPropertyMap[name];
      if (property && testAddresses[property]) {
        contracts[name] = (await ethers.getContractAt(name, testAddresses[property])) as Contract;
      } else {
        console.error(`Unexpected contract name or missing mapping: ${name}`);
      }
    }
  }

  return contracts;
};
