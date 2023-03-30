import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { deployAllWithSetting} from "../deploy";
import { leverageStake, provideLiquidity } from "../utils";
import units from "../units.json";

describe("LendInviToken functions test", function () {
  let stKlayContract: Contract;
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let iLPTokenContract: Contract;
  let inviTokenContract: Contract;
  let inviTokenStakeContract: Contract;
  let lendInviTokenContract: Contract;

  this.beforeEach(async () => {
    return [stKlayContract, inviCoreContract, iLPTokenContract, stakeNFTContract, inviTokenContract, lpPoolContract, inviTokenStakeContract, lendInviTokenContract] = await deployAllWithSetting();
  });

  it("Test getLendInfo function", async function () {
    const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

    //* given
    await provideLiquidity(lpPoolContract, LP, 10000000000000);
    const leverageRatio = 3 * units.leverageUnit;
    await leverageStake(inviCoreContract, userA, 1000000, leverageRatio);
    const nftId = (await stakeNFTContract.getNFTOwnership(userA.address))[0];

    //* when
    const lendInfo = (await lendInviTokenContract.functions.createLendInfo(nftId))[0]; //TODO : 이게 왜 배열로 들어올까...

    //* then
    expect(lendInfo.user).to.equals(userA.address);
    expect(lendInfo.nftId).to.equals(nftId);
    expect(lendInfo.principal).to.equals(1000000);
    expect(lendInfo.lentAmount).to.equals(await lendInviTokenContract.getLentAmount(1000000));
  });
})
