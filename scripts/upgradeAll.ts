import { testAddressBfc } from "./addresses/testAddresses/address.bfc";
import { upgradeContracts, upgradeLendingPoolContract } from "./upgradeFunctions";

const main = async () => {
  console.log(testAddressBfc.lendingPoolContractAddress);
  console.log("upgrading start ...");
  await upgradeLendingPoolContract();
  console.log("upgrading end ...");
};

try {
  main();
} catch (e) {
  console.error(e);
  process.exitCode = 1;
}
