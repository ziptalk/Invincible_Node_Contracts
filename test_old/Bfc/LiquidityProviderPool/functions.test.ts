import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { deployInviToken, deployILPToken, deployLpPoolContract, deployAllWithSetting } from "../../deploy";
import { testAddressBfc } from "../../../scripts/addresses/testAddresses/address.bfc";

describe("Liquidity Provider Pool Test", function () {
  let lpPoolContract: Contract;
  let iLPTokenContract: Contract;

  this.beforeAll(async function () {
    // for testnet test
    iLPTokenContract = await ethers.getContractAt("ILPToken", testAddressBfc.iLPTokenContractAddress);
    lpPoolContract = await ethers.getContractAt("LiquidityProviderPool", testAddressBfc.lpPoolContractAddress);
  });

  it("Test getRewardAmount success", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();
    console.log(`iLP token contract ${iLPTokenContract.address}`);
    console.log(`LP Pool contract ${lpPoolContract.address}`);

    // verify init
    expect(await lpPoolContract.iLP()).equals(iLPTokenContract.address);

    // verify owner
    expect(await iLPTokenContract.owner()).equals(lpPoolContract.address);
  });
});
