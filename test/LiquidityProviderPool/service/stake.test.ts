import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
const { expectRevert } = require("@openzeppelin/test-helpers");
import hre from "hardhat";
import { units } from "../../units";
import { leverageStake, provideLiquidity } from "../../utils";
import { getTestAddress } from "../../getTestAddress";

describe("LpPool service test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;

  const network: string = hre.network.name;
  const testAddresses: any = getTestAddress(network);

  this.beforeAll(async function () {
    if (!network) {
      inviCoreContract = await ethers.deployContract("InviCore");
      stakeNFTContract = await ethers.deployContract("StakeNFT");
      lpPoolContract = await ethers.deployContract("LiquidityProviderPool");
    } else {
      // for testnet test
      inviCoreContract = await ethers.getContractAt("InviCore", testAddresses.inviCoreContractAddress);
      stakeNFTContract = await ethers.getContractAt("StakeNFT", testAddresses.stakeNFTContractAddress);
      lpPoolContract = await ethers.getContractAt("LiquidityProviderPool", testAddresses.lpPoolContractAddress);
    }
  });

  it("Test stake function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    console.log("deployer: ", deployer.address);
    console.log("stakeManager: ", stakeManager.address);
    console.log("LP: ", LP.address);
    console.log("userA: ", userA.address);

    let nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    let nonceLP = await ethers.provider.getTransactionCount(LP.address);
    let nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    let tx;

    console.log("nonce lp: ", nonceLP);

    //* given
    const lpAmount: BigNumber = ethers.utils.parseEther("0.01");
    const previousTotalStakedAmount = await lpPoolContract.totalStakedAmount();

    //* when
    await provideLiquidity(lpPoolContract, LP, lpAmount, nonceLP); // lp stake
    console.log("provided liquidity");

    //* then

    let totalStakedAmount = await lpPoolContract.connect(userA).totalStakedAmount();
    let totalLentAmount = await lpPoolContract.connect(userA).totalLentAmount();
    console.log("totalStakedAmount: ", totalStakedAmount.toString());

    expect(totalStakedAmount).to.equal(BigNumber.from(previousTotalStakedAmount).add(lpAmount));
  });
});
