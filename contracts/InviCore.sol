// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./StakeNFT.sol";
import "./lib/Structs.sol";
import "./lib/ErrorMessages.sol";
import "hardhat/console.sol";

contract InviCore is ReentrancyGuard {

    StakeNFT public stakeNFTContract;
    
    address public stakeManager;
    address public owner;
    uint public stakingAPR;
    uint public totalStaked;
    uint public totalUserStaked;
    uint public totalLPStaked;

    constructor(address _stakeManagerAddr, address stakeNFTAddr){
        stakeManager = _stakeManagerAddr;
        owner = msg.sender;
        stakeNFTContract = StakeNFT(stakeNFTAddr);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, ERROR_NOT_OWNER);
        _;
    }

    //====== getter functions ======//

    function getStakeInfo(uint _amount, uint _leverageRatio) public view returns (StakeInfo memory) {
        uint lockPeriod = _getLockPeriod(_amount, _leverageRatio);
        uint protocolFee = _getProtocolFee(_amount, _leverageRatio);
        uint expectedReward = _getExpectedReward(_amount, _leverageRatio);

        StakeInfo memory stakeInfo = StakeInfo(msg.sender, _amount, _leverageRatio, lockPeriod, protocolFee, expectedReward);
        
        return stakeInfo;
    }

    // return lock period by amount & leverage ratio
    function _getLockPeriod(uint _amount, uint _leverageRatio) private view returns (uint) {

    }

    // return protocol fee by amount & leverage ratio
    function _getProtocolFee(uint _amount, uint _leverageRatio) private view returns (uint) {

    }
    
    // return expected reward by amount & leverage ratio
    function _getExpectedReward(uint _amount, uint _leverageRatio) private view returns (uint) {

    }

    //====== setter functions ======//

    // set owner function
    function setOwner() external onlyOwner {
        owner = msg.sender;
    }

    // set staking ARP function
    function setStakingAPR(uint _stakingAPR) external onlyOwner {
        stakingAPR = _stakingAPR;
    }

    // set exchange ratio function
    function _setExchangeRatio() private {

    }

    //====== service functions ======//
    
    // stake native coin
    function stake(StakeInfo memory _stakeInfo) external payable{

        // verify given stakeInfo
        _verifyStakeInfo(_stakeInfo, msg.value);

        // mint StakeNFT Token by stake info
        uint nftTokenId = stakeNFTContract.mintNFT(_stakeInfo);

        // send principal to STM
        (bool sent, ) = stakeManager.call{value : _stakeInfo.principal }("");
        require(sent, ERROR_FAIL_SEND);

        //update stakeAmount info
        uint borrowed = _stakeInfo.principal * _stakeInfo.leverageRatio;
        totalStaked += _stakeInfo.principal;
        totalUserStaked += _stakeInfo.principal + borrowed;
        totalLPStaked -= borrowed;
    }

    // unStake native coin
    function _unStake() private {

    }

    function _splitRewards(uint _amount) private {

    }
    
    //====== utils function ======//

    // verify stakeInfo is proper
    function _verifyStakeInfo(StakeInfo memory _stakeInfo, uint _sendAmount) private pure {
        require(_stakeInfo.principal == _sendAmount, ERROR_INVALID_STAKE_INFO);
    }
}