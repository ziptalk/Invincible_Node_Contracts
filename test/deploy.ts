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

// deploy lpPool contract
export const deployLpPoolContract = async (iLPContract : Contract, inviTokenContract : Contract) => {
  const LpPoolContract = await ethers.getContractFactory("LiquidityProviderPool");
  const lpPoolContract = await upgrades.deployProxy(LpPoolContract, [iLPContract.address, inviTokenContract.address], {initializer: "initialize",});
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
  const inviCoreContract = await upgrades.deployProxy(InviCoreContract,[inviTokenContract.address],{initializer: "initialize",});
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

export const deployLendingPoolContract = async (inviToken : Contract) => {
  const LendingPoolContract = await ethers.getContractFactory("LendingPool");
  const lendingPoolContract = await upgrades.deployProxy(LendingPoolContract,[inviToken.address],{initializer: "initialize",});
  await lendingPoolContract.deployed();

  return lendingPoolContract;
}


// deploy entire contract with setting
export const deployAllWithSetting = async () => {
  const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();


  // ==================== token contract ==================== //
  // deploy stKlay contract
  const stKlayContract = await deployStKlay();
  // deploy inviToken contract
  const inviTokenContract = await deployInviToken();
  // deploy ILPToken contract
  const iLPTokenContract = await deployILPToken();

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
  const swapPoolInviKlay = await deploySwapPoolInviKlay(inviTokenContract);
  // deploy inviCore contract
  const inviCoreContract = await deployInviCoreContract(stKlayContract);

  // ==================== set init condition ==================== //
  // set iLP init condition
  await iLPTokenContract.connect(deployer).transferOwnership(lpPoolContract.address);
  // set inviToken init condition
  await inviTokenContract.connect(deployer).setLendingPoolAddress(lendingPoolContract.address);
  // set stakeNFT init condition
  await stakeNFTContract.connect(deployer).setInviCoreAddress(inviCoreContract.address);
  await stakeNFTContract.connect(deployer).setLendingPoolAddress(lendingPoolContract.address);
  // set lpPoolContract init condition
  await lpPoolContract.connect(deployer).setStakeManager(stakeManager.address);
  await lpPoolContract.connect(deployer).setInviCoreAddress(inviCoreContract.address);
  // set inviTokenStake init condition
  await inviTokenStakeContract.connect(deployer).setInviCoreAddress(inviCoreContract.address);
  await inviTokenStakeContract.connect(deployer).setStakeManager(stakeManager.address);
  // set lendingPool init condition
  await lendingPoolContract.connect(deployer).setStakeNFTContract(stakeNFTContract.address);
  // set InviCore contract
  await inviCoreContract.connect(deployer).setStakeNFTContract(stakeNFTContract.address);
  await inviCoreContract.connect(deployer).setStakeManager(stakeManager.address);
  await inviCoreContract.connect(deployer).setLpPoolContract(lpPoolContract.address);
  await inviCoreContract.connect(deployer).setInviTokenStakeContract(inviTokenStakeContract.address);

  return {stKlayContract, inviCoreContract, iLPTokenContract, stakeNFTContract, inviTokenContract, lpPoolContract, inviTokenStakeContract, lendingPoolContract, swapPoolInviKlay};
}
