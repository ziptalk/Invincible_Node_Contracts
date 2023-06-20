import { ethers } from "hardhat";
import { Contract } from "ethers";

// test addresses
import { walletAddresses } from "../addresses/walletAddresses";

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
  console.log("base Nonce : ", nonce, " network : ", network);

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
  } else if (network === "EVMOS") {
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
  } else if (network === "EVMOS") {
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
  } else if (network === "EVMOS") {
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
//   inviTokenContractAddress: "0x29cC923d9F974F06a56F5bEAA1f5c21E0CD23d49",
//   iLPTokenContractAddress: "0x5E60cE2290bfb8843b60B395e3804b6978BCcFE4",
//   iSPTTokenContractAddress: "0xbD126adD28837FA41a4fff60ddb1f2a279D28cb7",
//   stakeNFTContractAddress: "0x845dD17988246c951e4DC59b88A6e2c624f342fb",
//   inviTokenStakeContractAddress: "0xC73cD39Da642a84AD7695CDBb2863551957e8F7D",
//   lpPoolContractAddress: "0xC73cD39Da642a84AD7695CDBb2863551957e8F7D",
//   lendingPoolContractAddress: "0x2Eb3540D302669A3b7Ce98926c08C89Ec5e0FE60",
//   inviSwapPoolContractAddress: "0xE07fd4EC873b9aE0699d6344D0a05092AbaF9dC3",
//   inviCoreContractAddress: "0x9ee674dFADB6aC4cdD64ae7b03224C011E7111b3",
//   priceManagerContractAddress: "0x0b2Fa4BCe83B8d6ff67c3102d1B0509f3226bD5b",
// };
// setInit(address, "KLAYTN");
