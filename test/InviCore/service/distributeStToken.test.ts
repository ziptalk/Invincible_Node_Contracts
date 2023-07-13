import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
import hre from "hardhat";
import { leverageStake, provideLiquidity, verifyRequest } from "../../utils";
import { units } from "../../units";
import { getTestAddress } from "../../getTestAddress";

const network: string = hre.network.name; // BIFROST, KLAYTN, EVMOS
console.log("current Network: ", network);
const testAddresses: any = getTestAddress(network);

describe("Invi core service test", function () {
  let stKlayContract: Contract;
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let inviTokenStakeContract: Contract;

  this.beforeAll(async function () {
    // for testnet test
    inviCoreContract = await ethers.getContractAt("InviCore", testAddresses.inviCoreContractAddress);
    inviTokenStakeContract = await ethers.getContractAt("InviToken", testAddresses.inviTokenStakeContractAddress);
    stakeNFTContract = await ethers.getContractAt("StakeNFT", testAddresses.stakeNFTContractAddress);
    lpPoolContract = await ethers.getContractAt("LiquidityProviderPool", testAddresses.lpPoolContractAddress);
  });

  it("Test stToken reward distribute function", async () => {
    const [deployer, LP, userA, userB, userC] = await ethers.getSigners();

    let nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    let nonceLP = await ethers.provider.getTransactionCount(LP.address);
    let nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    let nonceUserB = await ethers.provider.getTransactionCount(userB.address);
    let nonceUserC = await ethers.provider.getTransactionCount(userC.address);

    console.log("nonce deployer: ", nonceDeployer);
    //* given
    // get current unstake requests
    const beforeUnstakeRequestLength = await inviCoreContract.getUnstakeRequestsLength();
    console.log("before unstake requests    : ", beforeUnstakeRequestLength);

    // get stTokenBalance
    const stTokenBalance = await inviCoreContract.getStTokenBalance();
    console.log("stTokenBalance             : ", stTokenBalance.toString());

    // get total staked amount
    const totalStakedAmount = await inviCoreContract.getTotalStakedAmount();
    console.log("total staked amount        : ", totalStakedAmount.toString());

    // get total staked amount lppool
    const totalStakedAmountLpPool = await lpPoolContract.totalStakedAmount();
    console.log("total staked amount lppool : ", totalStakedAmountLpPool.toString());
    const totalLentAmountLpPool = await lpPoolContract.totalLentAmount();
    console.log("total lent amount lppool   : ", totalLentAmountLpPool.toString());

    //* when
    try {
      const distributeResult = await inviCoreContract.connect(deployer).distributeStTokenReward({ nonce: nonceDeployer }); // distribute reward
      console.log("distribute result: ", distributeResult);
    } catch (error) {
      console.log("distribute error: ", error);
    }

    //* then
    // get unstake requests
    const afterUnstakeRequests = await inviCoreContract.getUnstakeRequestsLength();
    console.log("after unstake requests: ", afterUnstakeRequests);
  });
});
