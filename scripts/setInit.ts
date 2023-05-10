import { ethers } from "hardhat";
import { Contract } from "ethers";
import address from "./address.json";

const main = async () => {
  const stakeManager = address.stakeManager;
  const [deployer] = await ethers.getSigners();
  let nonce = await ethers.provider.getTransactionCount(deployer.address);
  let tx;
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
  tx = await lpPoolContract.connect(deployer).setStakeManager(stakeManager, { nonce: nonce++ });
  await tx.wait();
  tx = await lpPoolContract.connect(deployer).setInviCoreContract(inviCoreContract.address, { nonce: nonce++ });
  await tx.wait();
  console.log("lpPoolContract init condition set at " + nonce + "");

  // set inviTokenStake init condition
  tx = await inviTokenStakeContract.connect(deployer).setInviCoreAddress(inviCoreContract.address, { nonce: nonce++ });
  await tx.wait();

  tx = await inviTokenStakeContract.connect(deployer).setStakeManager(stakeManager, { nonce: nonce++ });
  await tx.wait();
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
  tx = await inviCoreContract.connect(deployer).setStakeManager(stakeManager, { nonce: nonce++ });
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

main();
