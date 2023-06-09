import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { BigNumber, Contract } from "ethers";
import Web3 from "web3";
import { deployAllWithSetting } from "../../deploy";
import { leverageStake, provideLiquidity } from "../../utils";
import { units } from "../../units";

const [principal, lockPeriod, expectedReward, leverageRatio, protocolFee, lockStart, lockEnd] = [1000, 10000, 100000, 3, 0, 0, 0];

describe("Stake NFT Test", function () {
  let stakeNFTContract: Contract;
  let inviCoreContract: Contract;
  let lpPoolContract: Contract;

  this.beforeEach(async () => {
    ({ stakeNFTContract, inviCoreContract, lpPoolContract } = await deployAllWithSetting());
  });

  it("Test deploy success", async () => {
    const [deployer, userA, userB, userC] = await ethers.getSigners();
    console.log(`stakeNft contract ${stakeNFTContract.address}`);

    // verify init
    expect(await stakeNFTContract.owner()).equals(deployer.address);
  });

  it("delete nft ownership test", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();
    console.log(`stakeNft contract ${stakeNFTContract.address}`);

    let nonceLP = await ethers.provider.getTransactionCount(LP.address);
    let nonceUserA = await ethers.provider.getTransactionCount(userA.address);

    //* given

    const lpAmount: number = 100000000000;
    await provideLiquidity(lpPoolContract, LP, lpAmount, nonceLP); // lp stake

    const principal: BigNumber = BigNumber.from("1000000");
    const leverageRatio = 3 * units.leverageUnit;
    const minLockPeriod = await inviCoreContract.functions.getLockPeriod(leverageRatio);
    const lockPeriod = minLockPeriod * 2;
    const stakeInfo = await leverageStake(inviCoreContract, userA, principal, leverageRatio, lockPeriod, nonceUserA); // userA stake
    console.log("StakeInfo: ", stakeInfo);

    //* when
    const nftId = await stakeNFTContract.NFTOwnership(userA.address, 0);
    console.log("nft id: ", nftId);
    await stakeNFTContract.connect(userA).deleteNFTOwnership(userA.address, nftId);

    //* then
    const nftOwnership = await stakeNFTContract.getNFTOwnership(userA.address);
    expect(nftOwnership.length).equals(0);
  });
});
