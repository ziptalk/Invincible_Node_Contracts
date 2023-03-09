import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import Web3 from "web3";

const [
  principal,
  lockPeriod,
  expectedReward,
  leverageRatio,
  protocolFee,
  lockStart,
  lockEnd,
] = [1000, 10000, 100000, 3, 0, 0, 0];
describe("Stake NFT Test", function () {
  // deploy contract
  async function deployFixture() {
    const [deployer, user1, user2] = await ethers.getSigners();
    console.log("addresses: ", deployer.address, user1.address, user2.address);

    // stakeNFT Contract deploy
    const StakeNFTContract = await ethers.getContractFactory("StakeNFT");
    const stakeNFTContract = await upgrades.deployProxy(StakeNFTContract, [], {
      initializer: "initialize",
    });
    await stakeNFTContract.deployed();

    // expect deployer == owner
    expect(await stakeNFTContract.owner()).to.equal(deployer.address);
    const web3 = new Web3();
    return { web3, deployer, user1, user2, stakeNFTContract };
  }

  it("Test getStakeInfos function", async function () {
    console.log("----------------Test getting stakeInfos-----------------");
    const { user1, stakeNFTContract } = await deployFixture();
    const stakeInfo1 = {
      user: user1.address,
      principal: principal,
      leverageRatio: leverageRatio,
      protocolFee: protocolFee,
      lockStart: lockStart,
      lockEnd: lockEnd,
      lockPeriod: lockPeriod,
      expectedReward: expectedReward,
    };
    const stakeInfo2 = {
      user: user1.address,
      principal: principal * 2,
      leverageRatio: leverageRatio * 2,
      protocolFee: protocolFee * 2,
      lockStart: lockStart * 2,
      lockEnd: lockEnd * 2,
      lockPeriod: lockPeriod * 2,
      expectedReward: expectedReward * 2,
    };

    // mint 2 nfts to User 1
    await stakeNFTContract.functions.mintNFT(stakeInfo1);
    await stakeNFTContract.functions.mintNFT(stakeInfo2);

    // check stakeInfos
    const checkStakeInfo1 = await stakeNFTContract.functions.stakeInfos(0);
    const checkStakeInfo2 = await stakeNFTContract.functions.stakeInfos(1);
    expect(checkStakeInfo1.principal.toString()).to.equal(principal.toString());
    expect(checkStakeInfo2.principal.toString()).to.equal(
      (principal * 2).toString()
    );
  });
});
