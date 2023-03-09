import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe("Invi Core functions Test", function () {
    let inviCoreContract: Contract;
    let stakeNFTContract: Contract;

    this.beforeEach(async () => {
        const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

        // stakeNFT contract deploy
        const StakeNFTContract = await ethers.getContractFactory("StakeNFT");
        stakeNFTContract = await StakeNFTContract.deploy();
        await stakeNFTContract.deployed();
        
        // inviCore contract deploy
        const InviCoreContract = await ethers.getContractFactory("InviCore");
        inviCoreContract = await InviCoreContract.deploy(stakeManager.address, stakeNFTContract.address);
        await inviCoreContract.deployed();

        // stakeNFT setOwner to inviCore address
        await stakeNFTContract.connect(deployer).setOwner(inviCoreContract.address);
    })

    it("Test stake function", async() => {
        const [deployer, stakeManager, LP, userA, userB, userC] = await ethers.getSigners();

        // get stake info 
        const principal = 100;
        const leverageRatio = 2;
        const stakeInfo =  await inviCoreContract.connect(userA).getStakeInfo(principal, leverageRatio);
        
        // await inviCoreContract.connect(userA).stake(stakeInfo, {value : 100});
    });
});
