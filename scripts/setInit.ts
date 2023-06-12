import { ethers } from "hardhat";
import { Contract } from "ethers";

// test addresses
import { walletAddresses } from "./addresses/walletAddresses";

//------------------------------------------------------------------------------------------------//
//====================================== Change this part ========================================//
// const address = testAddressBfc;
//------------------------------------------------------------------------------------------------//
//------------------------------------------------------------------------------------------------//

let iLPTokenContract: Contract;
let inviTokenContract: Contract;
let iSPTTokenContract: Contract;
let stakeNFTContract: Contract;
let inviTokenStakeContract: Contract;
let lpPoolContract: Contract;
let lendingPoolContract: Contract;
let inviSwapPoolContract: Contract;
let inviCoreContract: Contract;
let priceManagerContract: Contract;

export const setInit = async (address: any, network: string) => {
  const [deployer] = await ethers.getSigners();
  let nonce = await ethers.provider.getTransactionCount(deployer.address);
  let tx;
  console.log("base Nonce : ", nonce);

  if (network === "BIFROST") {
    iLPTokenContract = await ethers.getContractAt("ILPToken", address.iLPTokenContractAddress);
    inviTokenContract = await ethers.getContractAt("InviToken", address.inviTokenContractAddress);
    iSPTTokenContract = await ethers.getContractAt("ISPTToken", address.iSPTTokenContractAddress);
    stakeNFTContract = await ethers.getContractAt("StakeNFT", address.stakeNFTContractAddress);
    inviTokenStakeContract = await ethers.getContractAt("BfcInviTokenStake", address.inviTokenStakeContractAddress);
    lpPoolContract = await ethers.getContractAt("BfcLiquidityProviderPool", address.lpPoolContractAddress);
    lendingPoolContract = await ethers.getContractAt("LendingPool", address.lendingPoolContractAddress);
    inviSwapPoolContract = await ethers.getContractAt("InviSwapPool", address.inviSwapPoolContractAddress);
    inviCoreContract = await ethers.getContractAt("BfcInviCore", address.inviCoreContractAddress);
    priceManagerContract = await ethers.getContractAt("PriceManager", address.priceManagerContractAddress);
  } else if (network === "KLAYTN") {
    iLPTokenContract = await ethers.getContractAt("ILPToken", address.iLPTokenContractAddress);
    inviTokenContract = await ethers.getContractAt("InviToken", address.inviTokenContractAddress);
    iSPTTokenContract = await ethers.getContractAt("ISPTToken", address.iSPTTokenContractAddress);
    stakeNFTContract = await ethers.getContractAt("StakeNFT", address.stakeNFTContractAddress);
    inviTokenStakeContract = await ethers.getContractAt("KlaytnInviTokenStake", address.inviTokenStakeContractAddress);
    lpPoolContract = await ethers.getContractAt("KlaytnLiquidityProviderPool", address.lpPoolContractAddress);
    lendingPoolContract = await ethers.getContractAt("LendingPool", address.lendingPoolContractAddress);
    inviSwapPoolContract = await ethers.getContractAt("InviSwapPool", address.inviSwapPoolContractAddress);
    inviCoreContract = await ethers.getContractAt("KlaytnInviCore", address.inviCoreContractAddress);
    priceManagerContract = await ethers.getContractAt("PriceManager", address.priceManagerContractAddress);
  } else if (network === "EVMOS") {
    iLPTokenContract = await ethers.getContractAt("ILPToken", address.iLPTokenContractAddress);
    inviTokenContract = await ethers.getContractAt("InviToken", address.inviTokenContractAddress);
    iSPTTokenContract = await ethers.getContractAt("ISPTToken", address.iSPTTokenContractAddress);
    stakeNFTContract = await ethers.getContractAt("StakeNFT", address.stakeNFTContractAddress);
    inviTokenStakeContract = await ethers.getContractAt("InviTokenStake", address.inviTokenStakeContractAddress);
    lpPoolContract = await ethers.getContractAt("LiquidityProviderPool", address.lpPoolContractAddress);
    lendingPoolContract = await ethers.getContractAt("LendingPool", address.lendingPoolContractAddress);
    inviSwapPoolContract = await ethers.getContractAt("InviSwapPool", address.inviSwapPoolContractAddress);
    inviCoreContract = await ethers.getContractAt("InviCore", address.inviCoreContractAddress);
    priceManagerContract = await ethers.getContractAt("PriceManager", address.priceManagerContractAddress);
  } else {
    iLPTokenContract = await ethers.getContractAt("ILPToken", address.iLPTokenContractAddress);
    inviTokenContract = await ethers.getContractAt("InviToken", address.inviTokenContractAddress);
    iSPTTokenContract = await ethers.getContractAt("ISPTToken", address.iSPTTokenContractAddress);
    stakeNFTContract = await ethers.getContractAt("StakeNFT", address.stakeNFTContractAddress);
    inviTokenStakeContract = await ethers.getContractAt("InviTokenStake", address.inviTokenStakeContractAddress);
    lpPoolContract = await ethers.getContractAt("LiquidityProviderPool", address.lpPoolContractAddress);
    lendingPoolContract = await ethers.getContractAt("LendingPool", address.lendingPoolContractAddress);
    inviSwapPoolContract = await ethers.getContractAt("InviSwapPool", address.inviSwapPoolContractAddress);
    inviCoreContract = await ethers.getContractAt("InviCore", address.inviCoreContractAddress);
    priceManagerContract = await ethers.getContractAt("PriceManager", address.priceManagerContractAddress);
  }

  // set iLP init condition
  tx = await iLPTokenContract.connect(deployer).transferOwnership(lpPoolContract.address, { nonce: nonce++ });
  await tx.wait();
  console.log("iLP init condition set at " + nonce);

  // set inviToken init condition
  tx = await inviTokenContract.connect(deployer).setLendingPoolAddress(lendingPoolContract.address, { nonce: nonce++ });
  await tx.wait();
  tx = await inviTokenContract.connect(deployer).setInviTokenStakeAddress(inviTokenStakeContract.address, { nonce: nonce++ });
  await tx.wait();
  tx = await inviTokenContract.connect(deployer).setLpPoolAddress(lpPoolContract.address, { nonce: nonce++ });
  await tx.wait();
  console.log("inviToken init condition set at " + nonce);

  // set ISPTToken init condition
  tx = await iSPTTokenContract.connect(deployer).setInviSwapPool(inviSwapPoolContract.address, { nonce: nonce++ });
  await tx.wait();
  console.log("iSPTToken init condition set at " + nonce + "");

  // set stakeNFT init condition
  tx = await stakeNFTContract.connect(deployer).setInviCoreAddress(inviCoreContract.address, { nonce: nonce++ });
  await tx.wait();
  tx = await stakeNFTContract.connect(deployer).setLendingPoolAddress(lendingPoolContract.address, { nonce: nonce++ });
  await tx.wait();
  console.log("stakeNFT init condition set at " + nonce + "");

  //set lpPoolContract init condition
  if (network === "BIFROST") {
  } else if (network === "KLAYTN") {
  } else {
    tx = await lpPoolContract.connect(deployer).setStakeManager(address.stakeManager, { nonce: nonce++ });
    await tx.wait();
  }
  tx = await lpPoolContract.connect(deployer).setInviCoreContract(inviCoreContract.address, { nonce: nonce++ });
  await tx.wait();
  console.log("lpPoolContract init condition set at " + nonce + "");

  //set inviTokenStake init condition
  tx = await inviTokenStakeContract.connect(deployer).setInviCoreAddress(inviCoreContract.address, { nonce: nonce++ });
  await tx.wait();
  if (network === "BIFROST") {
  } else if (network === "KLAYTN") {
  } else {
    tx = await inviTokenStakeContract.connect(deployer).setStakeManager(address.stakeManager, { nonce: nonce++ });
    await tx.wait();
  }
  console.log("inviTokenStake init condition set at " + nonce + "");

  //set lendingPool init condition
  tx = await lendingPoolContract.connect(deployer).setStakeNFTContract(stakeNFTContract.address, { nonce: nonce++ });
  await tx.wait();
  tx = await lendingPoolContract.connect(deployer).setPriceManager(priceManagerContract.address, { nonce: nonce++ });
  await tx.wait();
  console.log("lendingPool init condition set at " + nonce + "");

  // set InviCore contract
  tx = await inviCoreContract.connect(deployer).setStakeNFTContract(stakeNFTContract.address, { nonce: nonce++ });
  await tx.wait();
  if (network === "BIFROST") {
  } else if (network === "KLAYTN") {
  } else {
    tx = await inviCoreContract.connect(deployer).setStakeManager(address.stakeManager, { nonce: nonce++ });
    await tx.wait();
  }
  tx = await inviCoreContract.connect(deployer).setLpPoolContract(lpPoolContract.address, { nonce: nonce++ });
  await tx.wait();
  tx = await inviCoreContract.connect(deployer).setInviTokenStakeContract(inviTokenStakeContract.address, { nonce: nonce++ });
  await tx.wait();
  console.log("inviCore init condition set at " + nonce + "");

  // set inviSwapPool init condition
  tx = await inviSwapPoolContract.connect(deployer).setPriceManager(priceManagerContract.address, { nonce: nonce++ });
  await tx.wait();
  console.log("inviSwapPool init condition set at " + nonce + "");
};

//=================== when have nonce error =================== //
// let address = {
//   deployer: "0xe2Cb59A8dcbD7bac0FF2daa1aBE0A63B46a98E05",
//   stakeManager: "0x81DB617Fe8f2f38F949f8f1Ee4E9DB7f164408CE",
//   inviTokenContractAddress: "0x132FACF45B25E445a1D2925d1fB36f41fC1a0D2E",
//   iLPTokenContractAddress: "0x8A90137aCE7CBdAFEb062E9c4Fe9D3811e6Ff7f3",
//   iSPTTokenContractAddress: "0x60Ac0CAb9361FCed95E9a6eF9051A7D35C03d770",
//   stakeNFTContractAddress: "0xab98793EE79c3218129DE09147500Ada775D7E4C",
//   inviTokenStakeContractAddress: "0xd89dB6b4Cb947DF38d23CfFA1666B3040B6fd6eA",
//   lpPoolContractAddress: "0x43e5850fF7aD818cA3a3cb8dfB034c716379ac7e",
//   lendingPoolContractAddress: "0xE802342C881230D12690E459FF0CDa6Fa41150bB",
//   inviSwapPoolContractAddress: "0x2Ce5AEe90E65838F3b654Dc9f112D4247c69542d",
//   inviCoreContractAddress: "0x8b92d6648d90950e12589aC9bc289f51a5f6a0FB",
//   priceManagerContractAddress: "0xE8312257CfFbB565a033068B7306bDfA898E40f9",
// };
// setInit(address);
