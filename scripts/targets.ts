//======= test Addresses =======//
import { testAddressMainnetKlaytn, testAddressTestnetKlaytn } from "./addresses/testAddresses/address.klaytn";
import { testAddressMainnetEvmos, testAddressTestnetEvmos } from "./addresses/testAddresses/address.evmos";
import { testAddressMainnetBfc, testAddressTestnetBfc } from "./addresses/testAddresses/address.bfc";

//======= live Addresses =======//
import { bfcMainnetLiveAddress, bfcTestnetLiveAddress } from "./addresses/liveAddresses/address.bfc";
import { evmosMainnetLiveAddress, evmosTestnetLiveAddress } from "./addresses/liveAddresses/address.evmos";
import { klaytnMainnetLiveAddress, klaytnTestnetLiveAddress } from "./addresses/liveAddresses/address.klaytn";

export const targets = {
  //========= deploy contract =========//
  network: "EVMOS",
  networkType: "TESTNET",

  // ======== upgrade Addresses ========//
  upgradingContract: "BfcLiquidityProviderPool",
  upgradingContractAddress: testAddressTestnetBfc.lpPoolContractAddress,

  // ======== test Addresses ========//
  testNetworkType: "TESTNET",
};
