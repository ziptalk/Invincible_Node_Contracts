import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import Web3 from "web3";
import { string } from "hardhat/internal/core/params/argumentTypes";

describe("Staking NFT Test", function () {
  async function deployFixture() {
    const [deployer, user] = await ethers.getSigners();
    console.log("addresses: ", deployer.address);
    const StakingNFTContract = await ethers.getContractFactory("StakingNFT");
    const stakingNFTContract = await StakingNFTContract.deploy();
    await stakingNFTContract.deployed();

    const web3 = new Web3();
    return { web3, deployer, user, stakingNFTContract };
  }
  // it("Test Staking logic", async function(){
  //     const { web3, deployer, user, reTokenContract, klaytnContract } = await deployFixture();
  //     const transaction = {
  //         "to" : klaytnContract.address,
  //         "from" : user.address,
  //         "value" : 0.001 * 10 ** 18,
  //         "data" : web3.utils.toHex("50,50")
  //     }
  //     await user.call(transaction);
  // })
  it("Test minting logic", async function () {
    const { web3, deployer, user, stakingNFTContract } = await deployFixture();
    const data = await stakingNFTContract.functions.mintNFT(
      user.toString(),
      1000,
      10000,
      100000
    );
    console.log(data);
  });
  // it("Test Staking logic2", async function(){
  //     const { web3, deployer, user, reTokenContract, klaytnContract } = await deployFixture();
  //     const withdrawAmount = ethers.BigNumber.from("1000000000000000000");
  //     await reTokenContract.connect(user).mintToken(user.address, withdrawAmount);
  //     await reTokenContract.connect(user).approve(klaytnContract.address, withdrawAmount);
  //     await klaytnContract.connect(user).withdraw(withdrawAmount);
  // })
});
