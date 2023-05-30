import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "dotenv/config";

const OWNER_KEY: string = process.env.OWNER_PRIVATE_KEY as string;
const STAKE_MANAGER_KEY: string = process.env.STAKE_MANAGER_PRIVATE_KEY as string;
const LP_KEY: string = process.env.LP_PRIVATE_KEY as string;
const USER_A_KEY: string = process.env.USER_A_PRIVATE_KEY as string;
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
  paths: {
    artifacts: "./artifacts",
  },
  networks: {
    goerli: {
      url: process.env.GOERLI_RPC_URL,
      accounts: [OWNER_KEY],
    },
    evmos_testnet: {
      url: process.env.EVMOS_TESTNET_RPC_URL,
      accounts: [OWNER_KEY],
    },
    klaytn_testnet: {
      url: process.env.KLAYTN_TESTNET_URL,
      accounts: [OWNER_KEY],
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
      accounts: [OWNER_KEY, STAKE_MANAGER_KEY, LP_KEY, USER_A_KEY],
    },
    // klaytn_mainnet: {
    //   url: process.env.KLAYTN_MAINNET_URL,
    //   accounts: [OWNER_KEY],
    // },
  },
};

export default config;
