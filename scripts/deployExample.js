const { expect } = require("chai");
const { ethers } = require("hardhat");
const { setTimeout } = require("timers/promises");
const Web3 = require("web3");
describe("Klaytn liquid staking test", function () {
  async function deployFixture() {
    const unbondingTime = 7;
    const [deployer, user] = await ethers.getSigners();
    const ReTokenContract = await ethers.getContractFactory("RewardToken");
    const reTokenContract = await ReTokenContract.deploy(
      deployer.address,
      "InKlay",
      "INKLAY"
    );
    await reTokenContract.deployed();
    const KlaytnContract = await ethers.getContractFactory("TestLiquidStaking");
    const klaytnContract = await KlaytnContract.deploy(
      reTokenContract.address,
      deployer.address,
      unbondingTime
    );
    await klaytnContract.deployed();
    const web3 = new Web3();
    return { web3, deployer, user, reTokenContract, klaytnContract };
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
  it("Test parseHexData logic", async function () {
    const { web3, deployer, user, reTokenContract, klaytnContract } =
      await deployFixture();
    const input = web3.utils.toHex("50");
    console.log("input : ", input);
    const data = await klaytnContract.functions.convertBytesToUint(input);
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
