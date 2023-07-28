import { ethers } from "hardhat";
import { Contract } from "ethers";

// test addresses
import { walletAddresses } from "../addresses/walletAddresses";
import { klaytnTestAddress } from "../addresses/testAddresses/address.klaytn";

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
let stTokenContract: Contract;

export const setInit = async (address: any, network: string) => {
  const [deployer] = await ethers.getSigners();
  let nonce = await ethers.provider.getTransactionCount(deployer.address);
  let tx;
  console.log("base Nonce : ", nonce, " network : ", network);
  stTokenContract = await ethers.getContractAt("StToken", address.stTokenContractAddress);
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
  const ilpInit = async () => {
    try {
      // set iLP init condition
      tx = await iLPTokenContract.connect(deployer).setLpPoolAddress(lpPoolContract.address, { nonce: nonce++ });
      await tx.wait();
      console.log("iLP init condition set at " + nonce);
    } catch (e) {
      console.log("(error)iLP init condition set failed at " + nonce);
    }
  };
  const inviTokenInit = async () => {
    try {
      // set inviToken init condition
      tx = await inviTokenContract
        .connect(deployer)
        .setLendingPoolAddress(lendingPoolContract.address, { nonce: nonce++ });
      await tx.wait();
      tx = await inviTokenContract
        .connect(deployer)
        .setInviTokenStakeAddress(inviTokenStakeContract.address, { nonce: nonce++ });
      await tx.wait();
      tx = await inviTokenContract.connect(deployer).setLpPoolAddress(lpPoolContract.address, { nonce: nonce++ });
      await tx.wait();
      tx = await inviTokenContract
        .connect(deployer)
        .setInviSwapPoolAddress(inviSwapPoolContract.address, { nonce: nonce++ });
      await tx.wait();
      console.log("inviToken init condition set at " + nonce);
    } catch (e) {
      console.log("(error)inviToken init condition set failed at " + nonce);
    }
  };

  const isptTokenInit = async () => {
    try {
      // set ISPTToken init condition
      tx = await iSPTTokenContract.connect(deployer).setInviSwapPool(inviSwapPoolContract.address, { nonce: nonce++ });
      await tx.wait();
      console.log("iSPTToken init condition set at " + nonce + "");
    } catch (e) {
      console.log("(error)iSPTToken init condition set failed at " + nonce);
    }
  };

  const stakeNFTInit = async () => {
    try {
      // set stakeNFT init condition
      tx = await stakeNFTContract.connect(deployer).setInviCoreAddress(inviCoreContract.address, { nonce: nonce++ });
      await tx.wait();
      tx = await stakeNFTContract
        .connect(deployer)
        .setLendingPoolAddress(lendingPoolContract.address, { nonce: nonce++ });
      await tx.wait();
      tx = await stakeNFTContract.connect(deployer).setLpPoolAddress(lpPoolContract.address, { nonce: nonce++ });
      await tx.wait();
      console.log("stakeNFT init condition set at " + nonce + "");
    } catch (e) {
      console.log("(error)stakeNFT init condition set failed at " + nonce);
    }
  };

  const lpPoolInit = async () => {
    try {
      //set lpPoolContract init condition
      tx = await lpPoolContract.connect(deployer).setInviCoreContract(inviCoreContract.address, { nonce: nonce++ });
      await tx.wait();
      tx = await lpPoolContract.connect(deployer).setStakeNFTContract(stakeNFTContract.address, { nonce: nonce++ });
      console.log("lpPoolContract init condition set at " + nonce + "");
    } catch (e) {
      console.log("(error)lpPoolContract init condition set failed at " + nonce);
    }
  };

  const inviTokenStakeInit = async () => {
    try {
      //set inviTokenStake init condition
      tx = await inviTokenStakeContract
        .connect(deployer)
        .setInviCoreAddress(inviCoreContract.address, { nonce: nonce++ });
      await tx.wait();
      console.log("inviTokenStake init condition set at " + nonce + "");
    } catch (e) {
      console.log("(error)inviTokenStake init condition set failed at " + nonce);
    }
  };

  const lendingPoolInit = async () => {
    try {
      //set lendingPool init condition
      tx = await lendingPoolContract
        .connect(deployer)
        .setStakeNFTContract(stakeNFTContract.address, { nonce: nonce++ });
      await tx.wait();
      tx = await lendingPoolContract
        .connect(deployer)
        .setInviSwapPoolContract(inviSwapPoolContract.address, { nonce: nonce++ });
      await tx.wait();
      console.log("lendingPool init condition set at " + nonce + "");
    } catch (e) {
      console.log("(error)lendingPool init condition set failed at " + nonce, e);
    }
  };

  const inviCoreInit = async () => {
    try {
      // set InviCore contract
      tx = await inviCoreContract.connect(deployer).setStakeNFTContract(stakeNFTContract.address, { nonce: nonce++ });
      await tx.wait();
      tx = await inviCoreContract.connect(deployer).setLpPoolContract(lpPoolContract.address, { nonce: nonce++ });
      await tx.wait();
      tx = await inviCoreContract
        .connect(deployer)
        .setInviTokenStakeContract(inviTokenStakeContract.address, { nonce: nonce++ });
      await tx.wait();
      console.log("inviCore init condition set at " + nonce + "");
    } catch (e) {
      console.log("(error)inviCore init condition set failed at " + nonce, e);
    }
  };

  await ilpInit();
  await inviTokenInit();
  await isptTokenInit();
  await stakeNFTInit();
  await lpPoolInit();
  await inviTokenStakeInit();
  await lendingPoolInit();
  await inviCoreInit();

  return {
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
    stTokenContract,
  };
};

//=================== when have error =================== //
// let address = klaytnTestAddress.mainnet;
// setInit(address, "default");
