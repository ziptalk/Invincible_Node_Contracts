import { ethers } from "hardhat";
import { Contract } from "ethers";
import address from "./address.json";

const main = async () => {
  const stakeManager = address.stakeManager;
  const [deployer] = await ethers.getSigners();
  let nonce = await ethers.provider.getTransactionCount(deployer.address);
  console.log("base Nonce : ", nonce);

  const iLPTokenContract = await ethers.getContractAt("ILPToken", address.iLPTokenContractAddress);
  const inviTokenContract = await ethers.getContractAt("InviToken", address.inviTokenContractAddress);
  const iSPTTokenContract = await ethers.getContractAt("ISPTToken", address.iSPTTokenContractAddress);
  const stakeNFTContract = await ethers.getContractAt("StakeNFT", address.stakeNFTContractAddress);
  const inviTokenStakeContract = await ethers.getContractAt("InviTokenStake", address.inviTokenStakeContractAddress);
  const lpPoolContract = await ethers.getContractAt("LiquidityProviderPool", address.lpPoolContractAddress);
  const lendingPoolContract = await ethers.getContractAt("LendingPool", address.lendingPoolContractAddress);
  const inviSwapPoolContract = await ethers.getContractAt("InviSwapPool", address.inviSwapPoolContractAddress);
  const inviCoreContract = await ethers.getContractAt("InviCore", address.inviCoreContractAddress);
  const priceManagerContract = await ethers.getContractAt("PriceManager", address.priceManagerContractAddress);

  // set iLP init condition
  const tx1 = await iLPTokenContract.connect(deployer).transferOwnership(lpPoolContract.address, { nonce: nonce });
  await tx1.wait();
  console.log("iLP init condition set at " + nonce);

  // set inviToken init condition
  const tx2 = await inviTokenContract.connect(deployer).setLendingPoolAddress(lendingPoolContract.address, { nonce: nonce++ });
  await tx2.wait();
  console.log("inviToken init condition set at " + nonce);

  // set ISPTToken init condition
  const tx3 = await iSPTTokenContract.connect(deployer).setInviSwapPool(inviSwapPoolContract.address, { nonce: nonce++ });
  await tx3.wait();
  console.log("iSPTToken init condition set at " + nonce + "");

  // set stakeNFT init condition
  const tx4 = await stakeNFTContract.connect(deployer).setInviCoreAddress(inviCoreContract.address, { nonce: nonce++ });
  await tx4.wait();
  const tx5 = await stakeNFTContract.connect(deployer).setLendingPoolAddress(lendingPoolContract.address, { nonce: nonce++ });
  await tx5.wait();
  console.log("stakeNFT init condition set at " + nonce + "");

  // set lpPoolContract init condition
  const tx6 = await lpPoolContract.connect(deployer).setStakeManager(stakeManager, { nonce: nonce++ });
  await tx6.wait();
  const tx7 = await lpPoolContract.connect(deployer).setInviCoreAddress(inviCoreContract.address, { nonce: nonce++ });
  await tx7.wait();
  console.log("lpPoolContract init condition set at " + nonce + "");

  // set inviTokenStake init condition
  const tx8 = await inviTokenStakeContract.connect(deployer).setInviCoreAddress(inviCoreContract.address, { nonce: nonce++ });
  await tx8.wait();

  const tx9 = await inviTokenStakeContract.connect(deployer).setStakeManager(stakeManager, { nonce: nonce++ });
  await tx9.wait();
  console.log("inviTokenStake init condition set at " + nonce + "");

  // set lendingPool init condition
  const tx10 = await lendingPoolContract.connect(deployer).setStakeNFTContract(stakeNFTContract.address, { nonce: nonce++ });
  await tx10.wait();
  const tx11 = await lendingPoolContract.connect(deployer).setPriceManager(priceManagerContract.address, { nonce: nonce++ });
  await tx11.wait();
  console.log("lendingPool init condition set at " + nonce + "");

  // set InviCore contract
  const tx12 = await inviCoreContract.connect(deployer).setStakeNFTContract(stakeNFTContract.address, { nonce: nonce++ });
  await tx12.wait();
  const tx13 = await inviCoreContract.connect(deployer).setStakeManager(stakeManager, { nonce: nonce++ });
  await tx13.wait();
  const tx14 = await inviCoreContract.connect(deployer).setLpPoolContract(lpPoolContract.address, { nonce: nonce++ });
  await tx14.wait();
  const tx15 = await inviCoreContract.connect(deployer).setInviTokenStakeContract(inviTokenStakeContract.address, { nonce: nonce++ });
  await tx15.wait();
  console.log("inviCore init condition set at " + nonce + "");

  // set inviSwapPool init condition
  const tx16 = await inviSwapPoolContract.connect(deployer).setPriceManager(priceManagerContract.address, { nonce: nonce++ });
  await tx16.wait();
  console.log("inviSwapPool init condition set at " + nonce + "");
};

main();
