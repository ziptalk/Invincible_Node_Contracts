import hre from "hardhat";
import { ethers, upgrades } from "hardhat";
import { targets } from "../targets";

// deploy SwapManager contract
export const deployPriceManager = async (network: string) => {
  const PriceManagerContract = await ethers.getContractFactory("PriceManager");
  const priceManagerContract = await upgrades.deployProxy(PriceManagerContract, [], { initializer: "initialize" });
  await priceManagerContract.deployed();

  return priceManagerContract;
};

async function main() {
  const temp: string = hre.network.name;
  console.log(temp);

  const network: string = targets.network;
  const priceManagerContract = await deployPriceManager(network);
  console.log("deployed priceManager contract: ", priceManagerContract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
