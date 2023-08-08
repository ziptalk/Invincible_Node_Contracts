import { Contract, Wallet } from "ethers";
import { ethers, upgrades } from "hardhat";

// addresses
import { targets } from "../targets";
import { evmosTestAddress } from "../addresses/testAddresses/address.evmos";
import { evmosLiveAddress } from "../addresses/liveAddresses/address.evmos";
import { klaytnTestAddress } from "../addresses/testAddresses/address.klaytn";
import { klaytnLiveAddress } from "../addresses/liveAddresses/address.klaytn";
import { bfcTestAddress } from "../addresses/testAddresses/address.bfc";
import { bfcLiveAddress } from "../addresses/liveAddresses/address.bfc";

//================================================================================================//
//====================================== Change this part ========================================//
//================================================================================================//
let stTokenContractAddress: String = "0x0";
let liquidStakingAddress: String = "0x0";
let networkId: number;
//================================================================================================//
//================================================================================================//

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
export const deployLpPoolContract = async (iLPContract: Contract, inviTokenContract: Contract, network: string) => {
  let LpPoolContract;
  let lpPoolContract;
  if (network === "BIFROST") {
    LpPoolContract = await ethers.getContractFactory("BfcLiquidityProviderPool");
    lpPoolContract = await upgrades.deployProxy(LpPoolContract, [iLPContract.address, inviTokenContract.address], {
      initializer: "initialize",
    });
    await lpPoolContract.deployed();
  } else if (network === "KLAYTN") {
    LpPoolContract = await ethers.getContractFactory("KlaytnLiquidityProviderPool");
    lpPoolContract = await upgrades.deployProxy(LpPoolContract, [iLPContract.address, inviTokenContract.address], {
      initializer: "initialize",
    });
    await lpPoolContract.deployed();
  } else if (network === "EVMOS") {
    LpPoolContract = await ethers.getContractFactory("EvmosLiquidityProviderPool");
    lpPoolContract = await upgrades.deployProxy(LpPoolContract, [iLPContract.address, inviTokenContract.address], {
      initializer: "initialize",
    });
    await lpPoolContract.deployed();
  } else {
    LpPoolContract = await ethers.getContractFactory("LiquidityProviderPool");
    lpPoolContract = await upgrades.deployProxy(LpPoolContract, [iLPContract.address, inviTokenContract.address], {
      initializer: "initialize",
    });
    await lpPoolContract.deployed();
  }

  return lpPoolContract;
};

// deploy inviTokenStake contract
export const deployInviTokenStakeContract = async (inviTokenContract: Contract, network: string) => {
  let InviTokenStakeContract;
  let inviTokenStakeContract;
  if (network === "BIFROST") {
    InviTokenStakeContract = await ethers.getContractFactory("BfcInviTokenStake");
    inviTokenStakeContract = await upgrades.deployProxy(InviTokenStakeContract, [inviTokenContract.address], {
      initializer: "initialize",
    });
    await inviTokenStakeContract.deployed();
  } else if (network === "KLAYTN") {
    InviTokenStakeContract = await ethers.getContractFactory("KlaytnInviTokenStake");
    inviTokenStakeContract = await upgrades.deployProxy(InviTokenStakeContract, [inviTokenContract.address], {
      initializer: "initialize",
    });
    await inviTokenStakeContract.deployed();
  } else if (network === "EVMOS") {
    InviTokenStakeContract = await ethers.getContractFactory("EvmosInviTokenStake");
    inviTokenStakeContract = await upgrades.deployProxy(InviTokenStakeContract, [inviTokenContract.address], {
      initializer: "initialize",
    });
    await inviTokenStakeContract.deployed();
  } else {
    InviTokenStakeContract = await ethers.getContractFactory("InviTokenStake");
    inviTokenStakeContract = await upgrades.deployProxy(InviTokenStakeContract, [inviTokenContract.address], {
      initializer: "initialize",
    });
    await inviTokenStakeContract.deployed();
  }
  return inviTokenStakeContract;
};

// deploy inviCore contract
export const deployInviCoreContract = async (
  stTokenContract: String,
  inviTokenContract: String,
  liquidStakingAddress: String,
  network: String,
  networkId: number
) => {
  let InviCoreContract;
  let inviCoreContract;
  if (network === "BIFROST") {
    InviCoreContract = await ethers.getContractFactory("BfcInviCore");
    inviCoreContract = await upgrades.deployProxy(
      InviCoreContract,
      [stTokenContract, liquidStakingAddress, networkId],
      { initializer: "initialize" }
    );
    await inviCoreContract.deployed();
  } else if (network === "KLAYTN") {
    InviCoreContract = await ethers.getContractFactory("KlaytnInviCore");
    inviCoreContract = await upgrades.deployProxy(
      InviCoreContract,
      [stTokenContract, liquidStakingAddress, networkId],
      { initializer: "initialize" }
    );
    await inviCoreContract.deployed();
  } else if (network === "EVMOS") {
    InviCoreContract = await ethers.getContractFactory("EvmosInviCore");
    inviCoreContract = await upgrades.deployProxy(
      InviCoreContract,
      [stTokenContract, liquidStakingAddress, networkId],
      { initializer: "initialize" }
    );
    await inviCoreContract.deployed();
  } else {
    InviCoreContract = await ethers.getContractFactory("InviCore");
    inviCoreContract = await upgrades.deployProxy(
      InviCoreContract,
      [stTokenContract, inviTokenContract, liquidStakingAddress, networkId],
      { initializer: "initialize" }
    );
    await inviCoreContract.deployed();
  }

  return inviCoreContract;
};

// deploy SwapPoolInviKlay contract
export const deploySwapPoolInviKlay = async (inviTokenContract: Contract) => {
  const SwapPoolInviKlay = await ethers.getContractFactory("SwapPoolInviKlay");
  const swapPoolInviKlay = await upgrades.deployProxy(SwapPoolInviKlay, [inviTokenContract.address], {
    initializer: "initialize",
  });
  await swapPoolInviKlay.deployed();

  return swapPoolInviKlay;
};

// deploy InviSwapPool contract
export const deployInviSwapPool = async (inviTokenContract: Contract) => {
  const InviSwapPool = await ethers.getContractFactory("InviSwapPool");
  const inviSwapPool = await upgrades.deployProxy(InviSwapPool, [inviTokenContract.address], {
    initializer: "initialize",
  });
  await inviSwapPool.deployed();

  return inviSwapPool;
};

export const deployLendingPoolContract = async (inviToken: Contract) => {
  const LendingPoolContract = await ethers.getContractFactory("LendingPool");
  const lendingPoolContract = await upgrades.deployProxy(LendingPoolContract, [inviToken.address], {
    initializer: "initialize",
  });
  await lendingPoolContract.deployed();

  return lendingPoolContract;
};

// deploy SwapManager contract
// export const deployPriceManager = async (network: string) => {
//   const PriceManagerContract = await ethers.getContractFactory("PriceManager");
//   const priceManagerContract = await upgrades.deployProxy(PriceManagerContract, [], { initializer: "initialize" });
//   await priceManagerContract.deployed();

//   return priceManagerContract;
// };

// deploy all contract
export const deployAllContract = async (network: string) => {
  // deploy stToken and liquidStaking contract for test
  const StTokenContract = await ethers.getContractFactory("StToken");
  const stTokenContract = await upgrades.deployProxy(StTokenContract, [], { initializer: "initialize" });
  await stTokenContract.deployed();

  if (network === "bifrost_testnet") {
    stTokenContractAddress = bfcLiveAddress.testnet.stBFCContractAddress;
    liquidStakingAddress = bfcLiveAddress.testnet.bfcLiquidStakingContractAddress;
    networkId = 0;
  } else if (network === "bifrost_mainnet") {
    stTokenContractAddress = bfcLiveAddress.mainnet.stBFCContractAddress;
    liquidStakingAddress = bfcLiveAddress.mainnet.bfcLiquidStakingContractAddress;
    networkId = 0;
  } else if (network === "evmos_testnet") {
    stTokenContractAddress = evmosLiveAddress.testnet.stEvmosContractAddress;
    liquidStakingAddress = evmosLiveAddress.testnet.evmosLiquidStakingContractAddress;
    networkId = 1;
  } else if (network === "evmos_mainnet") {
    stTokenContractAddress = evmosLiveAddress.mainnet.stEvmosContractAddress;
    liquidStakingAddress = evmosLiveAddress.mainnet.evmosLiquidStakingContractAddress;
    networkId = 1;
  } else if (network === "klaytn_testnet") {
    stTokenContractAddress = klaytnLiveAddress.testnet.stakelyContractAddress;
    liquidStakingAddress = klaytnLiveAddress.testnet.stakelyContractAddress;
    networkId = 2;
  } else if (network === "klaytn_mainnet") {
    stTokenContractAddress = klaytnLiveAddress.mainnet.stakelyContractAddress;
    liquidStakingAddress = klaytnLiveAddress.mainnet.stakelyContractAddress;
    networkId = 2;
  } else {
    //========== Test on Hardhat ==========//
    console.log("Testing on hardhat");

    stTokenContractAddress = stTokenContract.address;
    liquidStakingAddress = stTokenContract.address;
    networkId = 2; // based on klaytn
  }

  console.log("stTokenContractAddress: ", stTokenContractAddress);
  console.log("liquidStakingAddress: ", liquidStakingAddress);
  // ==================== libraries ==================== //

  // ==================== token contract ==================== //
  // deploy inviToken contract
  const inviTokenContract = await deployInviToken();
  await inviTokenContract.deployed();
  console.log("deployed inviToken contract: ", inviTokenContract.address);
  // deploy ILPToken contract
  const iLPTokenContract = await deployILPToken();
  await iLPTokenContract.deployed();
  console.log("deployed iLPToken contract: ", iLPTokenContract.address);
  // deploy ISPTToken contract
  const iSPTTokenContract = await deployISPTToken();
  await iSPTTokenContract.deployed();
  console.log("deployed iSPTToken contract: ", iSPTTokenContract.address);

  // ==================== service contract ==================== //
  // deploy stakeNFT contract
  const stakeNFTContract = await deployStakeNFT();
  await stakeNFTContract.deployed();
  console.log("deployed stakeNFT contract: ", stakeNFTContract.address);
  // deploy inviTokenStake Contract
  const inviTokenStakeContract = await deployInviTokenStakeContract(inviTokenContract, network);
  await inviTokenStakeContract.deployed();
  console.log("deployed inviTokenStake contract: ", inviTokenStakeContract.address);
  // deploy liquidity pool contract
  const lpPoolContract = await deployLpPoolContract(iLPTokenContract, inviTokenContract, network);
  await lpPoolContract.deployed();
  console.log("deployed lpPool contract: ", lpPoolContract.address);
  // deploy LendingPool contract
  const lendingPoolContract = await deployLendingPoolContract(inviTokenContract);
  await lendingPoolContract.deployed();
  console.log("deployed lendingPool contract: ", lendingPoolContract.address);
  // deploy InviSwapPool contract
  const inviSwapPoolContract = await deployInviSwapPool(inviTokenContract);
  await inviSwapPoolContract.deployed();
  console.log("deployed inviSwapPool contract: ", inviSwapPoolContract.address);
  // deploy inviCore contract
  const inviCoreContract = await deployInviCoreContract(
    stTokenContractAddress,
    inviTokenContract.address,
    liquidStakingAddress,
    network,
    networkId
  );
  await inviCoreContract.deployed();
  console.log("deployed inviCore contract: ", inviCoreContract.address);
  // deploy swapManager contract
  // const priceManagerContract = await deployPriceManager(network);
  // await priceManagerContract.deployed();
  // console.log("deployed priceManager contract: ", priceManagerContract.address);

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
    //priceManagerContract,
    stTokenContract,
  };
};
