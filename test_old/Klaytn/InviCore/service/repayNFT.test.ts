import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import { provideLiquidity, leverageStake, verifyRequest } from "../../../utils";
import { units } from "../../../units";
import { testAddressTestnetKlaytn, testAddressMainnetKlaytn } from "../../../../scripts/addresses/testAddresses/address.klaytn";
import { targets } from "../../../../scripts/targets";

const { expectRevert } = require("@openzeppelin/test-helpers");

let targetAddress: any = targets.testNetworkType === "TESTNET" ? testAddressTestnetKlaytn : testAddressMainnetKlaytn;

describe("Invi core service test", function () {
  let stKlayContract: Contract;
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let inviTokenStakeContract: Contract;

  this.beforeAll(async function () {
    // for testnet test
    inviCoreContract = await ethers.getContractAt("KlaytnInviCore", targetAddress.inviCoreContractAddress);
    inviTokenStakeContract = await ethers.getContractAt("InviToken", targetAddress.inviTokenStakeContractAddress);
    stakeNFTContract = await ethers.getContractAt("StakeNFT", targetAddress.stakeNFTContractAddress);
    lpPoolContract = await ethers.getContractAt("KlaytnLiquidityProviderPool", targetAddress.lpPoolContractAddress);
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

    // get unstake requests
    const unstakeRequests = await inviCoreContract.functions.unstakeRequests(6);
    console.log("unstake requests: ", unstakeRequests.amount / 10 ** 18);

    //==================Change This Part==================//
    const targetNft = 0; // repay first nft
    //==================////////////////==================//

    //userA stake
    const principal: BigNumber = ethers.utils.parseEther("0.1");
    const leverageRatio = 2 * units.leverageUnit;
    const minLockPeriod = await inviCoreContract.functions.getLockPeriod(leverageRatio);
    const lockPeriod = minLockPeriod * 2;
    const stakeInfo = await leverageStake(inviCoreContract, userA, principal, leverageRatio, lockPeriod, nonceUserA);

    // get nftId
    let nftId = await stakeNFTContract.NFTOwnership(userA.address, targetNft);
    const nftStakeInfo = await stakeNFTContract.getStakeInfo(nftId);
    console.log("nft id: ", nftId);
    console.log("stake info: ", nftStakeInfo.principal / 10 ** 18);

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

    console.log("lentAmount: ", lentAmount / 10 ** 18);
    console.log("totalUserStakedAmount: ", totalUserStakedAmount / 10 ** 18);
    console.log("totalLPStakedAmount: ", totalLPStakedAmount / 10 ** 18);
    console.log("totalLentAmount: ", totalLentAmount / 10 ** 18);
    console.log("unstakeRequestLength: ", unstakeRequestLength);

    // expect(totalUserStakedAmount).to.equal(BigNumber.from(initTotalUserStakedAmount).sub(principal).sub(lentAmount)); // verify totalUserStakedAmount
    // expect(totalLPStakedAmount).to.equal(BigNumber.from(initTotalLPStakedAmount).add(lentAmount)); // verify totalLentAmount
    // expect(totalLentAmount).to.equal(BigNumber.from(initTotalLentAmount).sub(lentAmount)); // verify totalLentAmount
    // expect(await stakeNFTContract.isExisted(nftId)).to.equal(false); // verify nft is not existed
  });
});
