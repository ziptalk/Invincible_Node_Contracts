import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import { provideLiquidity, leverageStake } from "../../utils";
import { units } from "../../units";
import hre from "hardhat";
import { getTestAddress } from "../../getTestAddress";
const { expectRevert } = require("@openzeppelin/test-helpers");

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

  it("Test repayNFT function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    let nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    let nonceLP = await ethers.provider.getTransactionCount(LP.address);
    let nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    let tx;

    //* given
    const lpAmount: BigNumber = ethers.utils.parseEther("0.01");
    await provideLiquidity(lpPoolContract, LP, lpAmount, nonceLP); // lp stake

    // get user nft list
    const userNftList = await stakeNFTContract.getNFTOwnership(userA.address);
    console.log("user nft list: ", userNftList);

    //==================Change This Part==================//
    const targetNft = 0; // repay first nft
    //==================////////////////==================//

    //userA stake
    const principal: BigNumber = ethers.utils.parseEther("0.01");
    const leverageRatio = 1 * units.leverageUnit;
    const minLockPeriod = await inviCoreContract.functions.getLockPeriod(leverageRatio);
    const lockPeriod = minLockPeriod * 2;
    const stakeInfo = await leverageStake(inviCoreContract, userA, principal, leverageRatio, lockPeriod, nonceUserA);

    // get nftId
    let nftId = await stakeNFTContract.NFTOwnership(userA.address, targetNft);
    const nftStakeInfo = await stakeNFTContract.getStakeInfo(nftId);
    console.log("nft id: ", nftId);
    console.log("stake info: ", nftStakeInfo.toString());

    // init value
    const initTotalUserStakedAmount = await stakeNFTContract.totalStakedAmount();
    const initTotalLPStakedAmount = await lpPoolContract.totalStakedAmount();
    const initTotalLentAmount = await lpPoolContract.totalLentAmount();
    console.log(
      "init Total user staked amount: ",
      initTotalUserStakedAmount.toString(),
      "init total lp staked amount: ",
      initTotalLPStakedAmount.toString(),
      "init total lent amount: ",
      initTotalLentAmount.toString()
    );

    //* when
    const repay = await inviCoreContract.connect(userA).repayNFT(nftId, { nonce: ++nonceUserA });
    await repay.wait();
    console.log("repay", repay);

    //* then
    const lentAmount = stakeInfo.stakedAmount - stakeInfo.principal;
    const totalUserStakedAmount = await stakeNFTContract.totalStakedAmount();
    const totalLPStakedAmount = await lpPoolContract.totalStakedAmount();
    const totalLentAmount = await lpPoolContract.totalLentAmount();
    const unstakeRequestLength = await inviCoreContract.functions.getUnstakeRequestsLength();

    console.log("lentAmount: ", lentAmount);
    console.log("totalUserStakedAmount: ", totalUserStakedAmount);
    console.log("totalLPStakedAmount: ", totalLPStakedAmount);
    console.log("totalLentAmount: ", totalLentAmount);
    console.log("unstakeRequestLength: ", unstakeRequestLength);

    // expect(totalUserStakedAmount).to.equal(BigNumber.from(initTotalUserStakedAmount).sub(principal).sub(lentAmount)); // verify totalUserStakedAmount
    // expect(totalLPStakedAmount).to.equal(BigNumber.from(initTotalLPStakedAmount).add(lentAmount)); // verify totalLentAmount
    // expect(totalLentAmount).to.equal(BigNumber.from(initTotalLentAmount).sub(lentAmount)); // verify totalLentAmount
    // expect(await stakeNFTContract.isExisted(nftId)).to.equal(false); // verify nft is not existed
  });
});
