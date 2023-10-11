import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import hre from "hardhat";
import { provideLiquidity } from "../../utils";
import { initializeContracts } from "../../utils/initializeContracts";

const network: string = hre.network.name; // BIFROST, KLAYTN, EVMOS
console.log("current Network: ", network);

describe("Invi core service test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let inviTokenStakeContract: Contract;
  let stTokenContract: Contract;

  before(async function () {
    const contracts = await initializeContracts(network, [
      "InviCore",
      "StakeNFT",
      "LiquidityProviderPool",
      "InviTokenStake",
      "StToken",
    ]);

    inviCoreContract = contracts["InviCore"];
    stakeNFTContract = contracts["StakeNFT"];
    lpPoolContract = contracts["LiquidityProviderPool"];
    inviTokenStakeContract = contracts["InviToken"];
    stTokenContract = contracts["StToken"];
  });

  it("Test stToken reward distribute function", async () => {
    const [deployer, LP, userA, userB, userC] = await ethers.getSigners();

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

    if (network === "hardhat") {
      const lpAmount: BigNumber = ethers.utils.parseEther("0.01");
      await provideLiquidity(lpPoolContract, LP, lpAmount); // lp stake
      const rewardsAmount = ethers.utils.parseUnits("100", 18);
      const spreadRewards = await stTokenContract.connect(deployer).spreadRewards(inviCoreContract.address, {
        value: rewardsAmount,
      });
      await spreadRewards.wait();
    }

    //* when
    try {
      const distributeResult = await inviCoreContract.connect(deployer).distributeStTokenReward(); // distribute reward
      await distributeResult.wait();
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
