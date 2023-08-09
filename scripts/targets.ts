//======= test Addresses =======//
import { klaytnTestAddress } from "./addresses/testAddresses/address.klaytn";
import { evmosTestAddress } from "./addresses/testAddresses/address.evmos";
import { bfcTestAddress } from "./addresses/testAddresses/address.bfc";

//======= live Addresses =======//
import { bfcLiveAddress } from "./addresses/liveAddresses/address.bfc";
import { evmosLiveAddress } from "./addresses/liveAddresses/address.evmos";
import { klaytnLiveAddress } from "./addresses/liveAddresses/address.klaytn";

const contractLists = [
  "InviCore", // 0
  "LiquidityProviderPool", // 1
  "StakeNFT", // 2
  "InviTokenStake", // 3
  "LendingPool", // 4
  "PriceManager", // 5
  "InviToken", // 6
  "ILPToken", // 7
];

export const targets = {
  //========= deploy contract =========//
  network: "BIFROST",
  networkType: "MAINNET",

  // ======== upgrade Addresses ========//
  upgradingContract: contractLists[0],
  upgradingContractAddress: klaytnTestAddress.testnet.inviCoreContractAddress,

  // ======== test Addresses ========//
  testNetworkType: "MAINNET",
};
