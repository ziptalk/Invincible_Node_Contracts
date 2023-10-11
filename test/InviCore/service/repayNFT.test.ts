import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import { provideLiquidity, leverageStake } from "../../utils";
import { units } from "../../units";
import hre from "hardhat";
import { initializeContracts } from "../../utils/initializeContracts";

const network: string = hre.network.name; // BIFROST, KLAYTN, EVMOS
console.log("current Network: ", network);

describe("Invi core service test", function () {
  let inviCoreContract: Contract;
  let stakeNFTContract: Contract;
  let lpPoolContract: Contract;
  let inviTokenStakeContract: Contract;

  before(async function () {
    const contracts = await initializeContracts(network, [
      "InviCore",
      "StakeNFT",
      "LiquidityProviderPool",
      "InviTokenStake",
    ]);

    inviCoreContract = contracts["InviCore"];
    stakeNFTContract = contracts["StakeNFT"];
    lpPoolContract = contracts["LiquidityProviderPool"];
    inviTokenStakeContract = contracts["InviTokenStake"];
  });

  describe("Repay NFT Functionality", function () {
    it("Test repayNFT function", async () => {
      const [deployer, LP, userA, userB, userC] = await ethers.getSigners();

      //* given
      const lpAmount: BigNumber = ethers.utils.parseEther("0.01");
      await provideLiquidity(lpPoolContract, LP, lpAmount); // lp stake

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
      await leverageStake(inviCoreContract, userA, principal, leverageRatio, lockPeriod);
      // get nftId
      let nftId = await stakeNFTContract.NFTOwnership(userA.address, targetNft);
      const nftStakeInfo = await stakeNFTContract.getStakeInfo(nftId);
      console.log("nft id: ", nftId);
      console.log("target stake info: ", nftStakeInfo.toString());

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

      if (network === "hardhat") {
        // pass time by lock period
        await ethers.provider.send("evm_increaseTime", [lockPeriod]);
        await ethers.provider.send("evm_mine", []);
      }

      //* when
      const repay = await inviCoreContract.connect(userA).repayNFT(nftId);
      await repay.wait();
      console.log("repay", repay);

      //* then
      const totalUserStakedAmount = await stakeNFTContract.totalStakedAmount();
      const totalLPStakedAmount = await lpPoolContract.totalStakedAmount();
      const totalLentAmount = await lpPoolContract.totalLentAmount();
      const unstakeRequestLength = await inviCoreContract.functions.getUnstakeRequestsLength();

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
});
