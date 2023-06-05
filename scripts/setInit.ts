import { ethers } from "hardhat";
import { Contract } from "ethers";

// test addresses
import { walletAddresses } from "./addresses/walletAddresses";

//------------------------------------------------------------------------------------------------//
//====================================== Change this part ========================================//
// const address = testAddressBfc;
const network = "BIFROST"; // BIFROST, KLAYTN, EVMOS
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

export const setInit = async (address: any) => {
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

  // set lpPoolContract init condition
  if (network === "BIFROST") {
  } else {
    tx = await lpPoolContract.connect(deployer).setStakeManager(address.stakeManager, { nonce: nonce++ });
    await tx.wait();
  }
  tx = await lpPoolContract.connect(deployer).setInviCoreContract(inviCoreContract.address, { nonce: nonce++ });
  await tx.wait();
  console.log("lpPoolContract init condition set at " + nonce + "");

  // set inviTokenStake init condition
  tx = await inviTokenStakeContract.connect(deployer).setInviCoreAddress(inviCoreContract.address, { nonce: nonce++ });
  await tx.wait();
  if (network === "BIFROST") {
  } else {
    tx = await inviTokenStakeContract.connect(deployer).setStakeManager(address.stakeManager, { nonce: nonce++ });
    await tx.wait();
  }
  console.log("inviTokenStake init condition set at " + nonce + "");

  // set lendingPool init condition
  tx = await lendingPoolContract.connect(deployer).setStakeNFTContract(stakeNFTContract.address, { nonce: nonce++ });
  await tx.wait();
  tx = await lendingPoolContract.connect(deployer).setPriceManager(priceManagerContract.address, { nonce: nonce++ });
  await tx.wait();
  console.log("lendingPool init condition set at " + nonce + "");

  // set InviCore contract
  tx = await inviCoreContract.connect(deployer).setStakeNFTContract(stakeNFTContract.address, { nonce: nonce++ });
  await tx.wait();
  if (network === "BIFROST") {
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

// when have nonce error
// let address = {
//   deployer: "0xe2Cb59A8dcbD7bac0FF2daa1aBE0A63B46a98E05",
//   stakeManager: "0x81DB617Fe8f2f38F949f8f1Ee4E9DB7f164408CE",
//   inviTokenContractAddress: "0xEDa987d8968c8d58fc1Fc7aF38eE3cc7390D3cd1",
//   iLPTokenContractAddress: "0xA67E0A7DFEA3c733845A28b6896dCB95a76Ce8Bb",
//   iSPTTokenContractAddress: "0x1e0D7EA389549fC890083223B96cdE7b77fBE0bA",
//   stakeNFTContractAddress: "0xe50B582f67E0bdf637708A9f1082CB52803E0644",
//   inviTokenStakeContractAddress: "0x27D54b41396B7F6A7CAb5595220CA4B731260b83",
//   lpPoolContractAddress: "0x5eC26A58D18164a3616a77cEe77Dab2F8127203C",
//   lendingPoolContractAddress: "0x4147a7246EFA7E32D9E16d7cA6359f5c18D22b6E",
//   inviSwapPoolContractAddress: "0xe512157245fD8f6D337Ab211cD5895b1653D7233",
//   inviCoreContractAddress: "0x15aBC992EA3019371dB62C8df5b54Db7B9BF09B6",
//   priceManagerContractAddress: "0xa724f71661EbCcAb85041305bE9046df4ce1c947",
// };
// setInit(address);
