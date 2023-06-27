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
  iLPTokenContract = await ethers.getContractAt("ILPToken", address.iLPTokenContractAddress);
  inviTokenContract = await ethers.getContractAt("InviToken", address.inviTokenContractAddress);
  iSPTTokenContract = await ethers.getContractAt("ISPTToken", address.iSPTTokenContractAddress);
  stakeNFTContract = await ethers.getContractAt("StakeNFT", address.stakeNFTContractAddress);
  lendingPoolContract = await ethers.getContractAt("LendingPool", address.lendingPoolContractAddress);
  inviSwapPoolContract = await ethers.getContractAt("InviSwapPool", address.inviSwapPoolContractAddress);
  priceManagerContract = await ethers.getContractAt("PriceManager", address.priceManagerContractAddress);

  if (network === "BIFROST") {
    inviTokenStakeContract = await ethers.getContractAt("BfcInviTokenStake", address.inviTokenStakeContractAddress);
    lpPoolContract = await ethers.getContractAt("BfcLiquidityProviderPool", address.lpPoolContractAddress);
    inviCoreContract = await ethers.getContractAt("BfcInviCore", address.inviCoreContractAddress);
  } else if (network === "KLAYTN") {
    inviTokenStakeContract = await ethers.getContractAt("KlaytnInviTokenStake", address.inviTokenStakeContractAddress);
    lpPoolContract = await ethers.getContractAt("KlaytnLiquidityProviderPool", address.lpPoolContractAddress);
    inviCoreContract = await ethers.getContractAt("KlaytnInviCore", address.inviCoreContractAddress);
  } else if (network === "EVMOS") {
    inviTokenStakeContract = await ethers.getContractAt("EvmosInviTokenStake", address.inviTokenStakeContractAddress);
    lpPoolContract = await ethers.getContractAt("EvmosLiquidityProviderPool", address.lpPoolContractAddress);
    inviCoreContract = await ethers.getContractAt("EvmosInviCore", address.inviCoreContractAddress);
  } else {
    inviTokenStakeContract = await ethers.getContractAt("InviTokenStake", address.inviTokenStakeContractAddress);
    lpPoolContract = await ethers.getContractAt("LiquidityProviderPool", address.lpPoolContractAddress);
    inviCoreContract = await ethers.getContractAt("InviCore", address.inviCoreContractAddress);
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
  tx = await lpPoolContract.connect(deployer).setInviCoreContract(inviCoreContract.address, { nonce: nonce++ });
  await tx.wait();
  console.log("lpPoolContract init condition set at " + nonce + "");

  //set inviTokenStake init condition
  tx = await inviTokenStakeContract.connect(deployer).setInviCoreAddress(inviCoreContract.address, { nonce: nonce++ });
  await tx.wait();
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
//   stEvmosContractAddress: "0x71B413a8F80E6b2d8060919526F16717D4D77AFB",
//   evmosLiquidStakingContractAddress: "0x95f1e2B3573F8Cad4e3Ec0b4cf184E0BC7B36B2e",
//   inviTokenContractAddress: "0x77a05d84CA4d23420e973302d7095997b51f5D36",
//   iLPTokenContractAddress: "0x14e45f066687857E26fEa06f5e8551c3A04DB99D",
//   iSPTTokenContractAddress: "0x565a009690587CFf97C69Ad9b0b52B3Afa8e3e22",
//   stakeNFTContractAddress: "0xF383BC617CB07c82fa4Cb0703f3bea4bE784eBB6",
//   inviTokenStakeContractAddress: "0x6a49C71628a02200Fa983e3fC518916E65Edc0fb",
//   lpPoolContractAddress: "0xDa5422E5994524Bb75Bd0A2fbB8128A40B999123",
//   lendingPoolContractAddress: "0x34eFfc4B0093eF4Bd6432381fbcCd37aec963D37",
//   inviSwapPoolContractAddress: "0x1159373bE5B1Af44645bcF3FaaA2aC988B5dF4AD",
//   inviCoreContractAddress: "0x1b8558105539cAF3C28B4f5753de813DCA6201bC",
//   priceManagerContractAddress: "0x688d7d4daA6d94E2dB6E15549Cc76e0eb374BD8F",
// };
// setInit(address, "BIFROST");
