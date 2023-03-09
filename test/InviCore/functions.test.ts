import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe("Invi Core functions Test", function () {
    let inviCoreContract: Contract;
    let stakeNFTContract: Contract;

    this.beforeEach(async () => {
        const [deployer, stakeManager, userA, userB, userC] = await ethers.getSigners();

        // stakeNFT contract deploy
        const StakeNFTContract = await ethers.getContractFactory("StakeNFT");
        stakeNFTContract = await StakeNFTContract.deploy();
        await stakeNFTContract.deployed();
        
        // inviCore contract deploy
        const InviCoreContract = await ethers.getContractFactory("InviCore");
        inviCoreContract = await InviCoreContract.deploy(stakeManager.address, stakeNFTContract.address);
        await inviCoreContract.deployed();
    })

    it("Test getStakeInfo function", async() => {
        const [deployer, stakeManager, userA, userB, userC] = await ethers.getSigners();
        
        const principal = 100;
        const leverageRatio = 2;

        const stakeInfo =  await inviCoreContract.connect(userA).getStakeInfo(principal, leverageRatio);
        
        //verify stake info
        expect(stakeInfo.user).to.equal(userA.address);
        expect(stakeInfo.principal).to.equal(principal);
        expect(stakeInfo.leverageRatio).to.equal(leverageRatio);
    });
});
