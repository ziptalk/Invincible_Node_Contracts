import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "solidity-coverage";
import dotenv from "dotenv";
dotenv.config();

// testnet
const OWNER_KEY: string = process.env.OWNER_PRIVATE_KEY as string;
const LP_KEY: string = process.env.LP_PRIVATE_KEY as string;
const USER_A_KEY: string = process.env.USER_A_PRIVATE_KEY as string;
const USER_B_KEY: string = process.env.USER_B_PRIVATE_KEY as string;
const USER_C_KEY: string = process.env.USER_C_PRIVATE_KEY as string;

const gasPrice: number = 50000000000;

// mainnet
const MAINNET_OWNER_KEY: string = process.env.MAINNET_OWNER_PRIVATE_KEY as string;
const MAINNET_STAKE_MANAGER_KEY: string = process.env.MAINNET_STAKE_MANAGER_PRIVATE_KEY as string;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  mocha: {
    timeout: 2000000000,
  },
  paths: {
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {
      accounts: {
        accountsBalance: "100000000000000000000000", // 100000 ETH
      },
      gasPrice: 1000000000,
      blockGasLimit: 10000000,
    },
    // testnets
    goerli: {
      url: process.env.GOERLI_URL,
      accounts: [OWNER_KEY],
    },
    evmos_testnet: {
      url: process.env.EVMOS_TESTNET_URL,
      accounts: [OWNER_KEY, LP_KEY, USER_A_KEY, USER_B_KEY, USER_C_KEY],
    },
    klaytn_testnet: {
      url: process.env.KLAYTN_TESTNET_URL,
      accounts: [OWNER_KEY, LP_KEY, USER_A_KEY, USER_B_KEY, USER_C_KEY],
    },
    kava_testnet: {
      url: process.env.KAVA_TESTNET_URL,
      accounts: [OWNER_KEY],
    },
    bnb_testnet: {
      url: process.env.BNB_TESTNET_URL,
      accounts: [OWNER_KEY],
    },
    mantle_testnet: {
      url: process.env.MANTLE_TESTNET_URL,
      accounts: [OWNER_KEY],
    },
    bifrost_testnet: {
      url: process.env.BIFROST_TESTNET_URL,
      accounts: [OWNER_KEY, LP_KEY, USER_A_KEY, USER_B_KEY, USER_C_KEY],
    },

    // mainnets
    klaytn_mainnet: {
      url: process.env.KLAYTN_MAINNET_URL,
      accounts: [MAINNET_OWNER_KEY, MAINNET_STAKE_MANAGER_KEY, USER_A_KEY, USER_B_KEY, USER_C_KEY],
    },
    // bifrost_mainnet: {
    //   url: process.env.BIFROST_MAINNET_URL,
    //   accounts: [MAINNET_OWNER_KEY, MAINNET_STAKE_MANAGER_KEY, USER_A_KEY, USER_B_KEY, USER_C_KEY],
    // },
    // evmos_mainnet: {
    //   url: process.env.EVMOS_MAINNET_URL,
    //   accounts: [MAINNET_OWNER_KEY, MAINNET_STAKE_MANAGER_KEY, USER_A_KEY, USER_B_KEY, USER_C_KEY],
    // initialBaseFeePerGas: gasPrice,
    // gasPrice: gasPrice,
    // gas: gasPrice,
    //},
  },
};

export default config;
