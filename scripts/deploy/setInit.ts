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
let address = {
  stEvmosContractAddress: "0x6c4674c03Ac5f237997C8F2e296b16643649F70C",
  evmosLiquidStakingContractAddress: "0x3fDDe2E9F36d7222DAdba31D6c26CbC72739aF58",
  inviTokenContractAddress: "0x8A3eC47e83c15276302c3F0231ba7A9884e38Ee5",
  iLPTokenContractAddress: "0xF4C764B686d199c79AfEbFCda87059A2e3191595",
  iSPTTokenContractAddress: "0x5E232427874d60B9ec7c6846b4252D186c136FB4",
  stakeNFTContractAddress: "0x5296218c691EE60607cA5A7A401B694A508C1961",
  inviTokenStakeContractAddress: "0x08CEc9deAba64dC7Dcc7926d8FbCa605544156D2",
  lpPoolContractAddress: "0x1a628444f69E80D92baC9C9493808377092e5773",
  lendingPoolContractAddress: "0x37Df65b7b5C98b4C700da1372Acd77c0c6c499F2",
  inviSwapPoolContractAddress: "0x77a05d84CA4d23420e973302d7095997b51f5D36",
  inviCoreContractAddress: "0x14e45f066687857E26fEa06f5e8551c3A04DB99D",
  priceManagerContractAddress: "0x565a009690587CFf97C69Ad9b0b52B3Afa8e3e22",
};
setInit(address, "EVMOS");
