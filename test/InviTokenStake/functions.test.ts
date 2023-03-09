import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import Web3 from "web3";

describe("InviToken Stake Test", function () {
  // deploy contracts
  async function deployFixture() {
    const [deployer, user1, user2, user3] = await ethers.getSigners();
    console.log("addresses: ", deployer.address, user1.address, user2.address);

    // deploy InviTokenContract
    const InviTokenContract = await ethers.getContractFactory("InviToken");
    const inviTokenContract = await upgrades.deployProxy(
      InviTokenContract,
      [],
      { initializer: "initialize" }
    );
    await inviTokenContract.deployed();

    // deploy InviTokenStakeContract
    const InviTokenStakeContract = await ethers.getContractFactory(
      "InviTokenStake"
    );
    const inviTokenStakeContract = await upgrades.deployProxy(
      InviTokenStakeContract,
      [inviTokenContract.address],
      {
        initializer: "initialize",
      }
    );
    await inviTokenStakeContract.deployed();

    // expect deployer == owner
    expect(await inviTokenStakeContract.owner()).to.equal(deployer.address);
    const web3 = new Web3();
    return {
      web3,
      deployer,
      user1,
      user2,
      user3,
      inviTokenContract,
      inviTokenStakeContract,
    };
  }
});
