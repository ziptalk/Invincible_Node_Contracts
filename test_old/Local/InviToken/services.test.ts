import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { deployInviToken, deployInviTokenStakeContract, deployAllWithSetting } from "../../deploy";

describe("InviToken Stake Test", function () {
  let inviTokenContract: Contract;
  let inviTokenStakeContract: Contract;
  let lpPoolContract: Contract;
  let lendingPoolContract: Contract;

  this.beforeEach(async () => {
    ({ inviTokenContract, inviTokenStakeContract, lpPoolContract, lendingPoolContract } = await deployAllWithSetting());
  });

  it("Test regular minting", async function () {
    const [deployer, stakeManager, userA, userB, userC] = await ethers.getSigners();

    //* given

    //* when
    await inviTokenContract.functions.regularMinting();
    let interval = await inviTokenContract.functions.mintInterval();

    await ethers.provider.send("evm_increaseTime", [parseInt(interval.toString())]); // time move to repay nft
    await ethers.provider.send("evm_mine", []);

    await inviTokenContract.functions.regularMinting();

    await ethers.provider.send("evm_increaseTime", [parseInt(interval.toString()) / 2]); // time move to repay nft
    await ethers.provider.send("evm_mine", []);

    // expect error
    await expect(inviTokenContract.functions.regularMinting()).to.be.revertedWith("minting interval not reached");

    //* then
    console.log(await inviTokenContract.functions.balanceOf(inviTokenStakeContract.address));
    console.log(await inviTokenContract.functions.balanceOf(lpPoolContract.address));
  });
});
