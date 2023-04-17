import { Contract, Wallet } from "ethers";
import { ethers, upgrades } from "hardhat";

// deploy test stKlay contract
export const deployStKlay = async () => {
    const StKlayContract = await ethers.getContractFactory("StKlay");
    const stKlayContract = await upgrades.deployProxy(StKlayContract, [], { initializer: "initialize" });
    await stKlayContract.deployed();
  
    return stKlayContract;
  };
  
  // deploy InviToken contract
  export const deployInviToken = async () => {
    const InviTokenContract = await ethers.getContractFactory("InviToken");
    const inviTokenContract = await upgrades.deployProxy(InviTokenContract, [], { initializer: "initialize" });
    await inviTokenContract.deployed();
  
    return inviTokenContract;
  };
  
  // deploy ILPToken contract
  export const deployILPToken = async () => {
    const ILPTokenContract = await ethers.getContractFactory("ILPToken");
    const iLPTokenContract = await upgrades.deployProxy(ILPTokenContract, [], { initializer: "initialize" });
    await iLPTokenContract.deployed();
  
    return iLPTokenContract;
  };
  
  // deploy stakeNFT contract
  export const deployStakeNFT = async () => {
    const StakeNFTContract = await ethers.getContractFactory("StakeNFT");
    const stakeNFTContract = await upgrades.deployProxy(StakeNFTContract, [], { initializer: "initialize" });
    await stakeNFTContract.deployed();
  
    return stakeNFTContract;
  };
  
  // deploy ISPTToken contract
  export const deployISPTToken = async () => {
    const ISPTTokenContract = await ethers.getContractFactory("ISPTToken");
    const iSPTTokenContract = await upgrades.deployProxy(ISPTTokenContract, [], { initializer: "initialize" });
    await iSPTTokenContract.deployed();
  
    return iSPTTokenContract;
  };
  
  // deploy lpPool contract
  export const deployLpPoolContract = async (iLPContract: Contract, inviTokenContract: Contract) => {
    const LpPoolContract = await ethers.getContractFactory("LiquidityProviderPool");
    const lpPoolContract = await upgrades.deployProxy(LpPoolContract, [iLPContract.address, inviTokenContract.address], { initializer: "initialize" });
    await lpPoolContract.deployed();
  
    return lpPoolContract;
  };
  
  // deploy inviTokenStake contract
  export const deployInviTokenStakeContract = async (inviTokenContract: Contract) => {
    const InviTokenStakeContract = await ethers.getContractFactory("InviTokenStake");
    const inviTokenStakeContract = await upgrades.deployProxy(InviTokenStakeContract, [inviTokenContract.address], { initializer: "initialize" });
    await inviTokenStakeContract.deployed();
  
    return inviTokenStakeContract;
  };
  
  // deploy inviCore contract
  export const deployInviCoreContract = async (inviTokenContract: Contract) => {
    const InviCoreContract = await ethers.getContractFactory("InviCore");
    const inviCoreContract = await upgrades.deployProxy(InviCoreContract, [inviTokenContract.address], { initializer: "initialize" });
    await inviCoreContract.deployed();
  
    return inviCoreContract;
  };
  
  // deploy SwapPoolInviKlay contract
  export const deploySwapPoolInviKlay = async (inviTokenContract: Contract) => {
    const SwapPoolInviKlay = await ethers.getContractFactory("SwapPoolInviKlay");
    const swapPoolInviKlay = await upgrades.deployProxy(SwapPoolInviKlay, [inviTokenContract.address], { initializer: "initialize" });
    await swapPoolInviKlay.deployed();
  
    return swapPoolInviKlay;
  };
  
  // deploy InviSwapPool contract
  export const deployInviSwapPool = async (inviTokenContract: Contract, iSPTTokenContract: Contract) => {
    const InviSwapPool = await ethers.getContractFactory("InviSwapPool");
    const inviSwapPool = await upgrades.deployProxy(InviSwapPool, [inviTokenContract.address, iSPTTokenContract.address], { initializer: "initialize" });
    await inviSwapPool.deployed();
  
    return inviSwapPool;
  };
  
  export const deployLendingPoolContract = async (inviToken: Contract) => {
    const LendingPoolContract = await ethers.getContractFactory("LendingPool");
    const lendingPoolContract = await upgrades.deployProxy(LendingPoolContract, [inviToken.address], { initializer: "initialize" });
    await lendingPoolContract.deployed();
  
    return lendingPoolContract;
  };
  
  // deploy SwapManager contract
  export const deploySwapManager = async () => {
    const SwapManagerContract = await ethers.getContractFactory("SwapManager");
    const swapManagerContract = await upgrades.deployProxy(SwapManagerContract, [], { initializer: "initialize" });
    await swapManagerContract.deployed();
  
    return swapManagerContract;
  };

  // deploy all contract
  export const deployAllContract = async () => {
    // ==================== token contract ==================== //
    // deploy stKlay contract
    const stKlayContract = await deployStKlay();
    // deploy inviToken contract
    const inviTokenContract = await deployInviToken();
    // deploy ILPToken contract
    const iLPTokenContract = await deployILPToken();
    // deploy ISPTToken contract
    const iSPTTokenContract = await deployISPTToken();

    // ==================== service contract ==================== //
    // deploy stakeNFT contract
    const stakeNFTContract = await deployStakeNFT();
    // deploy inviTokenStake Contract
    const inviTokenStakeContract = await deployInviTokenStakeContract(inviTokenContract);
    // deploy liquidity pool contract
    const lpPoolContract = await deployLpPoolContract(iLPTokenContract, inviTokenContract);
    // deploy LendingPool contract
    const lendingPoolContract = await deployLendingPoolContract(inviTokenContract);
    // deploy SwapPoolInviKlay contract
    // const swapPoolInviKlay = await deploySwapPoolInviKlay(inviTokenContract);
    // deploy InviSwapPool contract
    const inviSwapPoolContract = await deployInviSwapPool(inviTokenContract, iSPTTokenContract);
    // deploy inviCore contract
    const inviCoreContract = await deployInviCoreContract(stKlayContract);
    // deploy swapManager contract
    const swapManagerContract = await deploySwapManager();

    return { stKlayContract, inviTokenContract, iLPTokenContract, iSPTTokenContract, stakeNFTContract, inviTokenStakeContract, lpPoolContract, lendingPoolContract, inviSwapPoolContract, inviCoreContract, swapManagerContract }
  }