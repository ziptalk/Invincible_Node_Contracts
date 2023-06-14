import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import { provideLiquidity, leverageStake, verifyRequest } from "../../../utils";
import { testAddressBfc } from "../../../../scripts/addresses/testAddresses/address.bfc";
import { currentNetwork } from "../../../currentNetwork";
import { units } from "../../../units";

const { expectRevert } = require("@openzeppelin/test-helpers");

let network = currentNetwork; // BIFROST, KLAYTN, EVMOS

describe("Invi core service test", function () {
  let stKlayContract: Contract;
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let inviTokenStakeContract: Contract;

  this.beforeAll(async function () {
    // for testnet test
    inviCoreContract = await ethers.getContractAt("BfcInviCore", testAddressBfc.inviCoreContractAddress);
    inviTokenStakeContract = await ethers.getContractAt("InviToken", testAddressBfc.inviTokenStakeContractAddress);
    stakeNFTContract = await ethers.getContractAt("StakeNFT", testAddressBfc.stakeNFTContractAddress);
    lpPoolContract = await ethers.getContractAt("BfcLiquidityProviderPool", testAddressBfc.lpPoolContractAddress);
  });

  it("Test repayNFT function", async () => {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    let nonceDeployer = await ethers.provider.getTransactionCount(deployer.address);
    let nonceLP = await ethers.provider.getTransactionCount(LP.address);
    let nonceUserA = await ethers.provider.getTransactionCount(userA.address);
    let tx;

    //* given
    const lpAmount = 100000000000;
    await provideLiquidity(lpPoolContract, LP, lpAmount, nonceLP); // lp stake

    // get user nft list
    const userNftList = await stakeNFTContract.getNFTOwnership(userA.address);
    console.log("user nft list: ", userNftList);

    //==================Change This Part==================//
    const targetNft = 2; // repay first nft
    //==================////////////////==================//

    //userA stake
    const principal: BigNumber = BigNumber.from("500000");
    const leverageRatio = 3 * units.leverageUnit;
    const minLockPeriod = await inviCoreContract.functions.getLockPeriod(leverageRatio);
    const lockPeriod = minLockPeriod * 2;
    const stakeInfo = await leverageStake(inviCoreContract, userA, principal, leverageRatio, lockPeriod, nonceUserA);

    // get nftId
    let nftId = await stakeNFTContract.NFTOwnership(userA.address, targetNft);
    const nftStakeInfo = await stakeNFTContract.getStakeInfo(nftId);
    console.log("nft id: ", nftId);
    console.log("stake info: ", nftStakeInfo);

    // init value
    const initTotalUserStakedAmount = await stakeNFTContract.totalStakedAmount();
    const initTotalLPStakedAmount = await lpPoolContract.totalStakedAmount();
    const initTotalLentAmount = await lpPoolContract.totalLentAmount();
    console.log(initTotalUserStakedAmount, initTotalLPStakedAmount, initTotalLentAmount);

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
