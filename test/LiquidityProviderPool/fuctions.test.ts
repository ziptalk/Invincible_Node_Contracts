import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import Web3 from "web3";

describe("Liquidity Provider Pool Test", function () {
  // deploy contracts
  async function deployFixture() {
    const [deployer, user1, user2, user3, stakeManager] =
      await ethers.getSigners();
    console.log("addresses: ", deployer.address, user1.address, user2.address);

    // deploy ILPTokenContract
    const ILPTokenContract = await ethers.getContractFactory("ILPToken");
    const iLPTokenContract = await upgrades.deployProxy(ILPTokenContract, [], {
      initializer: "initialize",
    });
    await iLPTokenContract.deployed();

    // deploy LiquidityProviderPoolContract
    const LiquidityProviderPoolContract = await ethers.getContractFactory(
      "LiquidityProviderPool"
    );
    const liquidityProviderPoolContract = await upgrades.deployProxy(
      LiquidityProviderPoolContract,
      [iLPTokenContract.address],
      { initializer: "initialize" }
    );
    await liquidityProviderPoolContract.deployed();

    // switch ILP contract owner to LiquidityProviderPool
    await iLPTokenContract.functions.transferOwnership(
      liquidityProviderPoolContract.address
    );

    // expect deployer == owner
    expect(await liquidityProviderPoolContract.owner()).to.equal(
      deployer.address
    );
    const web3 = new Web3();
    return {
      web3,
      deployer,
      user1,
      user2,
      user3,
      stakeManager,
      iLPTokenContract,
      liquidityProviderPoolContract,
    };
  }
});
