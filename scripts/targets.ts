//======= test Addresses =======//
import { klaytnTestAddress } from "./addresses/testAddresses/address.klaytn";
import { evmosTestAddress } from "./addresses/testAddresses/address.evmos";
import { bfcTestAddress } from "./addresses/testAddresses/address.bfc";

//======= live Addresses =======//
import { bfcLiveAddress } from "./addresses/liveAddresses/address.bfc";
import { evmosLiveAddress } from "./addresses/liveAddresses/address.evmos";
import { klaytnLiveAddress } from "./addresses/liveAddresses/address.klaytn";

export const targets = {
  //========= deploy contract =========//
  network: "BIFROST",
  networkType: "MAINNET",

  // ======== upgrade Addresses ========//
  upgradingContract: "LiquidityProviderPool",
  upgradingContractAddress: klaytnTestAddress.testnet.lpPoolContractAddress,

  // ======== test Addresses ========//
  testNetworkType: "MAINNET",
};
