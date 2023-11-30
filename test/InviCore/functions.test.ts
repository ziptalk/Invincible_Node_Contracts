import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import hre from "hardhat";
import { initializeContracts } from "../utils/initializeContracts";
import { units } from "../units";

const network: string = hre.network.name;

describe("Invi core functions test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let inviTokenContract: Contract;
  let iLPTokenContract: Contract;

  before(async function () {
    const contracts = await initializeContracts(network, [
      "InviCore",
      "StakeNFT",
      "LiquidityProviderPool",
      "InviToken",
      "ILPToken",
    ]);

    inviCoreContract = contracts["InviCore"];
    stakeNFTContract = contracts["StakeNFT"];
    lpPoolContract = contracts["LiquidityProviderPool"];
    inviTokenContract = contracts["InviToken"];
    iLPTokenContract = contracts["ILPToken"];
  });

  it("Test deploy success", async () => {
    console.log("invicore address: ", inviCoreContract.address);
    console.log("inviToken address: ", inviTokenContract.address);
    console.log("iLPToken address: ", iLPTokenContract.address);
    console.log("stakeNFT address: ", stakeNFTContract.address);
    console.log("lpPool address: ", lpPoolContract.address);

    // verify init
    expect(await inviCoreContract.stakeNFTContract()).equals(stakeNFTContract.address);
    expect(await inviCoreContract.lpPoolContract()).equals(lpPoolContract.address);
    expect(await lpPoolContract.inviCoreContract()).equals(inviCoreContract.address);
    expect(await iLPTokenContract.lpPoolContract()).equals(lpPoolContract.address);
  });

  it("Test get functions", async () => {
    const [deployer, LP, userA, userB, userC] = await ethers.getSigners();

    // ====== Get Functions ====== //
    // get Lock Period
    const leverageRatio = 5 * units.leverageUnit;
    const lockPeriod = await inviCoreContract.connect(userA).getLockPeriod(leverageRatio);
    console.log("lockPeriod: ", lockPeriod.toString());
    expect(lockPeriod).to.equal(1300 * 24 * 60 * 60);

    // lp stake coin
    const lpAmount = ethers.utils.parseEther("1");
    await lpPoolContract.connect(LP).stake({ value: lpAmount });

    // get Total Liquidity
    const totalLiquidity = await inviCoreContract.connect(userA).getTotalLiquidity();
    console.log("totalLiquidity: ", totalLiquidity.toString());
    expect(totalLiquidity).to.equal(lpAmount);

    // get Expected Reward
    const principal = 1000;
    const expectedReward = await inviCoreContract.connect(userA).getExpectedReward(principal, lockPeriod);
    console.log("expected reward: ", expectedReward);

    // get protocol fee
    const lentAmount = ethers.utils.parseEther("0.0001");
    const protocolFee = await inviCoreContract.connect(userA).getProtocolFee(lentAmount, 2);
    console.log("protocolFee: ", protocolFee.toString());
  });
});
