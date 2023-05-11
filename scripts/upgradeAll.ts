import { upgradeContracts, upgradeLendingPoolContract } from "./upgradeFunctions";
import address from "./address.json";

const main = async () => {
  console.log(address.lendingPoolContractAddress);
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
