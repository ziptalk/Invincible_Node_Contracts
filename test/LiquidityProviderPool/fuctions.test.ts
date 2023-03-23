import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { deployInviToken, deployILPToken, deployLpPoolContract, deployAllWithSetting } from "../deploy";

describe("Liquidity Provider Pool Test", function () {
  let stKlayContract: Contract;
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let iLPTokenContract: Contract;
  let inviTokenContract: Contract;
  let inviTokenStakeContract: Contract;

  this.beforeEach(async () => {
    [stKlayContract, inviCoreContract, iLPTokenContract, stakeNFTContract, inviTokenContract, lpPoolContract, inviTokenStakeContract] = await deployAllWithSetting();
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
