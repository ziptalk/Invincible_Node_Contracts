import { Contract } from "ethers";

export interface ContractLists {
  inviTokenContract: Contract;
  iLPTokenContract: Contract;
  // iSPTTokenContract: Contract; // Uncomment if needed and available
  stakeNFTContract: Contract;
  inviTokenStakeContract: Contract;
  lpPoolContract: Contract;
  lendingPoolContract: Contract;
  inviSwapPoolContract: Contract;
  inviCoreContract: Contract;
  // priceManagerContract: Contract; // Uncomment if needed and available
  stTokenContract: Contract;
}
