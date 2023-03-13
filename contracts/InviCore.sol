// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./StakeNFT.sol";
import "./lib/Structs.sol";
import "./lib/ErrorMessages.sol";
import "hardhat/console.sol";
import "./LiquidityProviderPool.sol";

contract InviCore is Initializable, OwnableUpgradeable {

    StakeNFT public stakeNFTContract;
    LiquidityProviderPool public lpPoolContract;
    address public stakeManager;
    
    uint public stakingAPR;
    uint public totalUserStakedAmount;
    mapping(address => uint) public userStakedAmount;

    function initialize(address _stakeManager, address _stakeNFTAddr, address _lpPoolAddr) initializer public {
        stakeManager = _stakeManager;
        stakeNFTContract = StakeNFT(_stakeNFTAddr);
        lpPoolContract = LiquidityProviderPool(_lpPoolAddr);
        __Ownable_init();
    }

    //====== getter functions ======//

    function getStakeInfo(uint _amount, uint _leverageRatio) public view returns (StakeInfo memory) {
        uint lockPeriod = _getLockPeriod(_amount, _leverageRatio);
        uint protocolFee = _getProtocolFee(_amount, _leverageRatio);
        uint expectedReward = _getExpectedReward(_amount, _leverageRatio);
        uint lockStart = block.timestamp;
        uint lockEnd = block.timestamp + lockPeriod;

        StakeInfo memory stakeInfo = StakeInfo(msg.sender, _amount, _leverageRatio, lockPeriod, lockStart, lockEnd, protocolFee, expectedReward);
        
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
        uint lentAmount = _stakeInfo.principal * (_stakeInfo.leverageRatio - 1);
        uint totalLentAmount = lpPoolContract.totalLentAmount() + lentAmount;
        
        lpPoolContract.updateTotalLentAmount(totalLentAmount);
        totalUserStakedAmount += _stakeInfo.principal + lentAmount;
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