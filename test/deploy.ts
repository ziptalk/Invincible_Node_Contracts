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
export const deployLpPoolContract = async (stakeManager: string, iLPTokenContract: Contract, inviTokenContract: Contract) => {
  const LpPoolContract = await ethers.getContractFactory("LiquidityProviderPool");
  const lpPoolContract = await upgrades.deployProxy(LpPoolContract, [stakeManager, iLPTokenContract.address, inviTokenContract.address], {
    initializer: "initialize",
  });
  await lpPoolContract.deployed();

  return lpPoolContract;
};

// deploy inviTokenStake contract
export const deployInviTokenStakeContract = async (stakeManager: string, inviTokenContract: Contract) => {
  const InviTokenStakeContract = await ethers.getContractFactory("InviTokenStake");
  const inviTokenStakeContract = await upgrades.deployProxy(InviTokenStakeContract, [stakeManager, inviTokenContract.address], { initializer: "initialize" });
  await inviTokenStakeContract.deployed();

  return inviTokenStakeContract;
};

// deploy inviCore contract
export const deployInviCoreContract = async (
  stakeManager: string,
  stakeNFTContract: Contract,
  lpPoolContract: Contract,
  inviTokenStakeContract: Contract,
  stKlayContract: Contract
) => {
  const InviCoreContract = await ethers.getContractFactory("InviCore");
  const inviCoreContract = await upgrades.deployProxy(
    InviCoreContract,
    [stakeManager, stakeNFTContract.address, lpPoolContract.address, inviTokenStakeContract.address, stKlayContract.address],
    {
      initializer: "initialize",
    }
  );
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

export const deployLendingPoolContract = async (inviToken: Contract, stakeNFTContract: Contract) => {
  const LendingPoolContract = await ethers.getContractFactory("LendingPool");
  const lendingPoolContract = await upgrades.deployProxy(
    LendingPoolContract,
    [inviToken.address, stakeNFTContract.address],
    {
      initializer: "initialize",
    }
  );
  await lendingPoolContract.deployed();

  return lendingPoolContract;
}


// deploy entire contract with setting
export const deployAllWithSetting = async () => {
  const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

  // deploy stKlay contract
  const stKlayContract = await deployStKlay();
  // deploy inviToken contract
  const inviTokenContract = await deployInviToken();
  // deploy ILPToken contract
  const iLPTokenContract = await deployILPToken();
  // deploy stakeNFT contract
  const stakeNFTContract = await deployStakeNFT();
  // deploy inviTokenStake Contract
  const inviTokenStakeContract = await deployInviTokenStakeContract(stakeManager.address, inviTokenContract);
  // deploy liquidity pool contract
  const lpPoolContract = await deployLpPoolContract(stakeManager.address, iLPTokenContract, inviTokenContract);
  // deploy inviCore contract
  const inviCoreContract = await deployInviCoreContract(stakeManager.address, stakeNFTContract, lpPoolContract, inviTokenStakeContract, stKlayContract);
  // deploy SwapPoolInviKlay contract
  const swapPoolInviKlay = await deploySwapPoolInviKlay(inviTokenContract);
  // deploy LendingPool contract
  const lendingPoolContract = await deployLendingPoolContract(inviTokenContract, stakeNFTContract);

  // set ILP owner
  iLPTokenContract.connect(deployer).transferOwnership(lpPoolContract.address);

  // set LendingPool contract
  inviTokenContract.connect(deployer).setLendingPoolAddress(lendingPoolContract.address);
  stakeNFTContract.connect(deployer).setLendingPoolAddress(lendingPoolContract.address);

  // set InviCore contract
  stakeNFTContract.connect(deployer).setInviCoreAddress(inviCoreContract.address);
  lpPoolContract.connect(deployer).setInviCoreAddress(inviCoreContract.address);
  inviTokenStakeContract.connect(deployer).setInviCoreAddress(inviCoreContract.address);

  return {stKlayContract, inviCoreContract, iLPTokenContract, stakeNFTContract, inviTokenContract, lpPoolContract, inviTokenStakeContract, lendingPoolContract, swapPoolInviKlay};
}
