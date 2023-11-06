import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
const { expectRevert } = require("@openzeppelin/test-helpers");
import hre from "hardhat";
import { getTestAddress } from "../utils/getTestAddress";
import { leverageStake } from "../utils/utils";
import { units } from "../units";

describe("PriceManager service test", function () {
  let priceManagerContract: Contract;

  const network: string = hre.network.name;
  const testAddresses: any = getTestAddress(network);

  this.beforeAll(async function () {
    // for testnet test
    priceManagerContract = await ethers.getContractAt("PriceManager", testAddresses.priceManagerContractAddress);
  });

  it("Test functions", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    console.log("deployer: ", deployer.address);
    console.log("stakeManager: ", stakeManager.address);
    console.log("LP: ", LP.address);
    console.log("userA: ", userA.address);

    let nonceLP = await ethers.provider.getTransactionCount(LP.address);
    console.log("nonce lp: ", nonceLP);

    //* given
    const inviPrice = await priceManagerContract.connect(deployer).getInviPrice();
    console.log("inviPrice: ", inviPrice.toString());
    const nativePrice = await priceManagerContract.connect(deployer).getNativePrice();
    console.log("nativePrice: ", nativePrice.toString());

    //* when
    // update price
    // const newInviPrice = ethers.utils.parseEther("1");
    // const newNativePrice = ethers.utils.parseEther("0.15");
    // tx = await priceManagerContract.connect(deployer).setInviPrice(newInviPrice);
    // await tx.wait();
    // tx = await priceManagerContract.connect(deployer).setNativePrice(newNativePrice);
    // await tx.wait();

    // //* then
    // const updatedInviPrice = await priceManagerContract.connect(deployer).getInviPrice();
    // console.log("updatedInviPrice: ", updatedInviPrice.toString());
    // const updatedNativePrice = await priceManagerContract.connect(deployer).getNativePrice();
    // console.log("updatedNativePrice: ", updatedNativePrice.toString());

    // expect(updatedInviPrice).to.equal(newInviPrice);
    // expect(updatedNativePrice).to.equal(newNativePrice);
  });
});
