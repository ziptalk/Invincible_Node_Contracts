import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { deployAllWithSetting} from "../deploy";
import { leverageStake, provideLiquidity } from "../utils";
import units from "../units.json";

describe("LendingPool contract services test", function () {
  let stKlayContract: Contract;
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let iLPTokenContract: Contract;
  let inviTokenContract: Contract;
  let inviTokenStakeContract: Contract;
  let LendingPoolContract: Contract;

  this.beforeEach(async () => {
    [stKlayContract, inviCoreContract, iLPTokenContract, stakeNFTContract, inviTokenContract, lpPoolContract, inviTokenStakeContract, LendingPoolContract] = await deployAllWithSetting();
  });

  it("Test lend invi token", async function () {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    //* given
    await provideLiquidity(lpPoolContract, LP, 10000000000000);
    const leverageRatio = 3 * units.leverageUnit;
    await leverageStake(inviCoreContract, userA, 1000000, leverageRatio);
    const nftId = (await stakeNFTContract.getNFTOwnership(userA.address))[0];
    const lendInfo = (await LendingPoolContract.functions.createLendInfo(nftId))[0]; //TODO : 이게 왜 배열로 들어올까...

    //* when
    await LendingPoolContract.connect(userA).lend(lendInfo);

    //* then
    expect(await LendingPoolContract.totalLentAmount()).to.equal(lendInfo.lentAmount);
    expect((await LendingPoolContract.getLendInfo(userA.address, 0)).user).to.equal(userA.address);
    expect((await stakeNFTContract.stakeInfos(nftId)).isLent).to.equal(true);
  });
})
