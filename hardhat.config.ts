import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const OWNER_KEY: string = process.env.OWNER_PRIVATE_KEY as string;
const config: HardhatUserConfig = {
  solidity: "0.8.18",
  defaultNetwork: "goerli",
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
  },
};

export default config;
