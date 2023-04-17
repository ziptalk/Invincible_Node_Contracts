import { ethers } from "hardhat";
import { Contract } from "ethers";
import address from "./address.json";

const main = async () => {
    const stakeManager = address.stakeManager;
    const [deployer] = await ethers.getSigners();  

    const iLPTokenContract = await ethers.getContractAt("ILPToken", address.iLPTokenContractAddress);
    const inviTokenContract = await ethers.getContractAt("InviToken", address.inviTokenContractAddress);
    const iSPTTokenContract = await ethers.getContractAt("ISPTToken", address.iSPTTokenContractAddress);
    const stakeNFTContract = await ethers.getContractAt("StakeNFT", address.stakeNFTContractAddress);
    const inviTokenStakeContract = await ethers.getContractAt("InviTokenStake", address.inviTokenStakeContractAddress);
    const lpPoolContract = await ethers.getContractAt("LiquidityProviderPool", address.lpPoolContractAddress);
    const lendingPoolContract = await ethers.getContractAt("LendingPool", address.lendingPoolContractAddress);
    const inviSwapPoolContract = await ethers.getContractAt("InviSwapPool", address.inviSwapPoolContractAddress);
    const inviCoreContract = await ethers.getContractAt("InviCore", address.inviCoreContractAddress);
    const swapManagerContract = await ethers.getContractAt("SwapManager", address.swapManagerContractAddress);

    
    // set iLP init condition 
    // await iLPTokenContract.connect(deployer).transferOwnership(lpPoolContract.address);
    // console.log("iLP init condition set");
  
    // set inviToken init condition
    await inviTokenContract.connect(deployer).setLendingPoolAddress(lendingPoolContract.address);
    console.log("inviToken init condition set");
  
    // set ISPTToken init condition
    await iSPTTokenContract.connect(deployer).setInviSwapPool(inviSwapPoolContract.address);
    console.log("iSPTToken init condition set");
  
    // set stakeNFT init condition
    await stakeNFTContract.connect(deployer).setInviCoreAddress(inviCoreContract.address);
    await stakeNFTContract.connect(deployer).setLendingPoolAddress(lendingPoolContract.address);
    console.log("stakeNFT init condition set");
    
    // set lpPoolContract init condition
    await lpPoolContract.connect(deployer).setStakeManager(stakeManager);
    await lpPoolContract.connect(deployer).setInviCoreAddress(inviCoreContract.address);
    console.log("lpPoolContract init condition set");
  
    // set inviTokenStake init condition
    await inviTokenStakeContract.connect(deployer).setInviCoreAddress(inviCoreContract.address);
    await inviTokenStakeContract.connect(deployer).setStakeManager(stakeManager);
    console.log("inviTokenStake init condition set");
  
    // set lendingPool init condition
    await lendingPoolContract.connect(deployer).setStakeNFTContract(stakeNFTContract.address);
    console.log("lendingPool init condition set");
    
    // set InviCore contract
    await inviCoreContract.connect(deployer).setStakeNFTContract(stakeNFTContract.address);
    await inviCoreContract.connect(deployer).setStakeManager(stakeManager);
    await inviCoreContract.connect(deployer).setLpPoolContract(lpPoolContract.address);
    await inviCoreContract.connect(deployer).setInviTokenStakeContract(inviTokenStakeContract.address);
    console.log("inviCore init condition set");
  }


main();   