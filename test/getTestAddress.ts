import { bfcTestAddress } from "../scripts/addresses/testAddresses/address.bfc";
import { evmosTestAddress } from "../scripts/addresses/testAddresses/address.evmos";
import { klaytnTestAddress } from "../scripts/addresses/testAddresses/address.klaytn";

export const getTestAddress = (network: string) => {
  if (network === "bifrost_testnet") {
    return bfcTestAddress.testnet;
  } else if (network === "bifrost_mainnet") {
    return bfcTestAddress.mainnet;
  } else if (network === "klaytn_testnet") {
    return klaytnTestAddress.testnet;
  } else if (network === "klaytn_mainnet") {
    return klaytnTestAddress.mainnet;
  } else if (network === "evmos_testnet") {
    return evmosTestAddress.testnet;
  } else if (network === "evmos_mainnet") {
    return evmosTestAddress.mainnet;
  } else {
    return;
  }
};
