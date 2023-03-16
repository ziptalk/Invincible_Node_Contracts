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
import "./lib/Logics.sol";
import "./lib/Unit.sol";

contract InviCore is Initializable, OwnableUpgradeable {

    StakeNFT public stakeNFTContract;
    LiquidityProviderPool public lpPoolContract;
    address public stakeManager;
    
    // reward related
    uint public stakingAPR;
    uint private decreaseRatio;
    uint private increaseRatio;

    // stake status
    uint public totalUserStakedAmount;
    mapping(address => uint) public userStakedAmount;

    function initialize(address _stakeManager, address _stakeNFTAddr, address _lpPoolAddr) initializer public {
        stakeManager = _stakeManager;
        stakeNFTContract = StakeNFT(_stakeNFTAddr);
        lpPoolContract = LiquidityProviderPool(_lpPoolAddr);
        decreaseRatio = 10 * rewardErrorUnit;
        increaseRatio = 5 * rewardErrorUnit;
        stakingAPR = 10;
        __Ownable_init();
    }

    //====== getter functions ======//

    function getStakeInfo(uint _principal, uint _leverageRatio) public view returns(StakeInfo memory)  {
        uint leverageUnit = defaultUnit();
        uint lockPeriod = _getLockPeriod(_leverageRatio);
        uint lentAmount = _principal * (_leverageRatio - leverageUnit) / leverageUnit;

        uint protocolFee = _getProtocolFee(lentAmount, _leverageRatio);
        uint lockStart = block.timestamp;
        uint lockEnd = block.timestamp + lockPeriod;
        uint minReward = _getMinReward(_principal + lentAmount, lockPeriod);
        uint maxReward = _getMaxReward(_principal + lentAmount, lockPeriod);

        StakeInfo memory stakeInfo = StakeInfo(msg.sender, _principal, _leverageRatio, lockPeriod, lockStart, lockEnd, protocolFee, minReward, maxReward);
        
        return stakeInfo;
    }

    // return expected reward(_amount == principal + lentAmount)
    function getExpectedReward(uint _amount, uint _lockPeriod) public view returns (uint) {
        return ExpectedReward(_amount, _lockPeriod, stakingAPR);
    }

    // return lock period by amount & leverage ratio
    function _getLockPeriod(uint _leverageRatio) private pure returns (uint) {
        return LockPeriod(_leverageRatio);
    }

    // return protocol fee by amount & leverage ratio
    function _getProtocolFee(uint _lentAmount, uint _leverageRatio) private view returns (uint) {
        uint totalLiquidity = lpPoolContract.getTotalLiquidity();
        return ProtocolFee(_lentAmount, _leverageRatio, totalLiquidity);
    }
    
    // return minimum Reward
    function _getMinReward(uint _amount, uint _lockPeriod) private view returns (uint) {
        return MinReward(_amount, _lockPeriod, stakingAPR, decreaseRatio);
    }

    // return maximum Reward
    function _getMaxReward(uint _amount, uint _lockPeriod) private view returns (uint) {
        return MaxReward(_amount, _lockPeriod, stakingAPR, increaseRatio);
    }

    // return total Liquidity from LP Pool
    function _getTotalLiquidity() private view returns (uint) {
        return lpPoolContract.getTotalLiquidity();
    }

    //====== setter functions ======//

    // set staking ARP function
    function setStakingAPR(uint _stakingAPR) external onlyOwner {
        stakingAPR = _stakingAPR;
    }

    // set decrease ratio for min reward
    function setDecreaseRatio(uint _decreaseRatio) external onlyOwner {
        decreaseRatio = _decreaseRatio;
    }

    // set increase ratio from max reward
    function setIncreaseRatio(uint _increaseRatio) external onlyOwner {
        increaseRatio = _increaseRatio;
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


    // stake function. 10 <= leverage ratio <= 50 
    function newStake(uint _leverageRatio) external payable {
        StakeInfo memory stakeInfo = getStakeInfo(msg.value, _leverageRatio);

        uint nftTokenId = stakeNFTContract.mintNFT(stakeInfo);

        //update stakeAmount info
        uint lentAmount = stakeInfo.principal * (stakeInfo.leverageRatio - 1);
        uint totalLentAmount = lpPoolContract.totalLentAmount() + lentAmount;
        
        lpPoolContract.updateTotalLentAmount(totalLentAmount);
        totalUserStakedAmount += stakeInfo.principal + lentAmount;

        // send principal to STM
        (bool sent, ) = stakeManager.call{value : stakeInfo.principal }("");
        require(sent, ERROR_FAIL_SEND);
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