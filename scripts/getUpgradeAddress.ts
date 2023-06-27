import { bfcTestAddress } from "../scripts/addresses/testAddresses/address.bfc";
import { evmosTestAddress } from "../scripts/addresses/testAddresses/address.evmos";
import { klaytnTestAddress } from "../scripts/addresses/testAddresses/address.klaytn";
import { bfcLiveAddress } from "./addresses/liveAddresses/address.bfc";
import { evmosLiveAddress } from "./addresses/liveAddresses/address.evmos";
import { klaytnLiveAddress } from "./addresses/liveAddresses/address.klaytn";

export const getUpgradeAddress = (network: string, addressType: string) => {
  if (addressType === "live") {
    if (network === "bifrost_testnet") {
      return bfcLiveAddress.testnet;
    } else if (network === "bifrost_mainnet") {
      return bfcLiveAddress.mainnet;
    } else if (network === "klaytn_testnet") {
      return klaytnLiveAddress.testnet;
    } else if (network === "klaytn_testnet") {
      return klaytnLiveAddress.mainnet;
    } else if (network === "evmos_testnet") {
      return evmosLiveAddress.testnet;
    } else if (network === "evmos_mainnet") {
      return evmosLiveAddress.mainnet;
    }
  } else {
    if (network === "bifrost_testnet") {
      return bfcTestAddress.testnet;
    } else if (network === "bifrost_mainnet") {
      return bfcTestAddress.mainnet;
    } else if (network === "klaytn_testnet") {
      return klaytnTestAddress.testnet;
    } else if (network === "klaytn_testnet") {
      return klaytnTestAddress.mainnet;
    } else if (network === "evmos_testnet") {
      return evmosTestAddress.testnet;
    } else if (network === "evmos_mainnet") {
      return evmosTestAddress.mainnet;
    }
  }
};
