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
import "./InviTokenStake.sol";
import "./lib/Logics.sol";
import "./lib/Unit.sol";

contract InviCore is Initializable, OwnableUpgradeable {

    StakeNFT public stakeNFTContract;
    LiquidityProviderPool public lpPoolContract;
    InviTokenStake public inviTokenStakeContract;
    address public stakeManager;
    
    // reward related
    uint public stakingAPR;
    uint private decreaseRatio;
    uint private increaseRatio;
    uint public lpPoolRewardPortion;
    uint public inviTokenStakeRewardPortion;
    mapping (uint => uint) nftReward;

    // stake status
    uint public totalUserStakedAmount;
    mapping(address => uint) public userStakedAmount;

    // variable
    uint public slippage;

    function initialize(address _stakeManager, address _stakeNFTAddr, address _lpPoolAddr, address _inviTokenStakeAddr) initializer public {
        stakeManager = _stakeManager;
        stakeNFTContract = StakeNFT(_stakeNFTAddr);
        lpPoolContract = LiquidityProviderPool(_lpPoolAddr);
        inviTokenStakeContract = InviTokenStake(_inviTokenStakeAddr);
        decreaseRatio = 10 * rewardErrorUnit;
        increaseRatio = 5 * rewardErrorUnit;
        stakingAPR = 10 * aprUnit;
        lpPoolRewardPortion = 700;
        inviTokenStakeRewardPortion = rewardPortionTotalUnit - lpPoolRewardPortion;
        __Ownable_init();
    }

    //====== modifier functions ======//
    modifier onlySTM {
        require(msg.sender == stakeManager, "msg sender should be stake manager");
        _;
    }

    //====== getter functions ======//
    function getStakeInfo(uint _principal, uint _leverageRatio) public view returns(StakeInfo memory)  {
        uint lockPeriod = _getLockPeriod(_leverageRatio);
        uint lentAmount = _principal * (_leverageRatio - 1 * leverageUnit) / leverageUnit;
        console.log(_principal, lentAmount);
        uint protocolFee = _getProtocolFee(lentAmount, _leverageRatio);
        console.log(protocolFee);
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

    // set sliipage function
    function setSlippage(uint _slippage) external onlyOwner {
        slippage = _slippage;
    }

    // set exchange ratio function
    function _setExchangeRatio() private {

    }

    // set nft reward
    function setNFTReward(uint _nftTokenId) external payable onlySTM{
        // NFT Reward should be updated only once
        require(nftReward[_nftTokenId] == 1, ERROR_NFT_REWARD_CRASH);

        StakeInfo memory stakeInfo = stakeNFTContract.getStakeInfo(_nftTokenId);

        // check reward amount and range
        require(stakeInfo.minReward >= msg.value && stakeInfo.maxReward <= msg.value, ERROR_NFT_REWARD_INVALID_RANGE);

        nftReward[_nftTokenId] = msg.value;
    }

    // set reward portion
    function _setRewardPortion(uint _lpPoolRewardPortion, uint _inviTokenStakeRewardPortion) external onlyOwner {
        require (_lpPoolRewardPortion + _inviTokenStakeRewardPortion == rewardPortionTotalUnit, ERROR_SET_REWARD_PORTION);
        lpPoolRewardPortion = _lpPoolRewardPortion;
        inviTokenStakeRewardPortion = _inviTokenStakeRewardPortion;
    }

    //====== service functions ======//
    
    // stake native coin
    function stake(StakeInfo memory _stakeInfo, uint _slippage) external payable{

        // verify given stakeInfo
        _verifyStakeInfo(_stakeInfo, _slippage, msg.value);

        // mint StakeNFT Token by stake info
        uint nftTokenId = stakeNFTContract.mintNFT(_stakeInfo);
        // update nftReward to 1
        nftReward[nftTokenId] = 1;

        //update stakeAmount info
        uint lentAmount = _stakeInfo.principal * (_stakeInfo.leverageRatio - 1 * leverageUnit) / leverageUnit;
        uint totalLentAmount = lpPoolContract.totalLentAmount() + lentAmount;
        lpPoolContract.updateTotalLentAmount(totalLentAmount);
        totalUserStakedAmount += _stakeInfo.principal + lentAmount;

        // send principal to STM
        (bool sent, ) = stakeManager.call{value : _stakeInfo.principal }("");
        require(sent, ERROR_FAIL_SEND);
    }

    // unStake native coin
    function repayNFT(uint _nftTokenId) external {
        // verify NFT ownership
        require(stakeNFTContract.verifyOwnership(_nftTokenId, msg.sender), ERROR_NOT_OWNED_NFT);

        // get stakeInfo by nftTokenId
        StakeInfo memory stakeInfo = stakeNFTContract.getStakeInfo(_nftTokenId);

        _verifyNFTExpiration(stakeInfo);

        // transfer nft from msg.sender to inviCore
        stakeNFTContract.transferFrom(msg.sender, address(this), _nftTokenId);

        // burn NFT
        stakeNFTContract.burnNFT(_nftTokenId);  

        // tranfer Reward to msg.sender
        nftReward[_nftTokenId] = 0;
        (bool sent, ) = msg.sender.call{value : nftReward[_nftTokenId]}("");
        require(sent, ERROR_FAIL_SEND);

    }

    // split reward to pools
    function splitRewards() external payable onlySTM {
        // reward Portion Total = rewardPortionTotalUnit 
        uint lpPoolReward = msg.value * lpPoolRewardPortion / rewardPortionTotalUnit;
        uint inviTokenStakeReward = msg.value * inviTokenStakeRewardPortion / rewardPortionTotalUnit; 
        lpPoolContract.distributeReward{value: lpPoolReward}();
        // inviTokenStakeContract.updateReward{value: inviTokenStakeReward}();
    }
    
    //====== utils function ======//

    // verify stakeInfo is proper
    function _verifyStakeInfo(StakeInfo memory _stakeInfo, uint _slippage, uint _sendAmount) private view {
        // verify principal amount
        require(_stakeInfo.principal == _sendAmount, ERROR_INVALID_STAKE_INFO);

        // verify lockPeriod
        uint lockPeriod = _getLockPeriod(_stakeInfo.leverageRatio);
        require(_stakeInfo.lockPeriod == lockPeriod, ERROR_INVALID_STAKE_INFO);

        // verify lentAmount
        uint lentAmount = _stakeInfo.principal * (_stakeInfo.leverageRatio - 1 * leverageUnit) / leverageUnit;
        require(lentAmount <= lpPoolContract.getMaxLentAmount(), ERROR_TOO_MUCH_LENT);

        // verify min/max reward
        uint amount = _stakeInfo.principal * _stakeInfo.leverageRatio / leverageUnit;
        uint minReward = MinReward(amount, _stakeInfo.lockPeriod, stakingAPR, decreaseRatio);
        uint maxReward = MaxReward(amount, _stakeInfo.lockPeriod, stakingAPR, increaseRatio);
        require(minReward == _stakeInfo.minReward, ERROR_INVALID_STAKE_INFO);
        require(maxReward == _stakeInfo.maxReward, ERROR_INVALID_STAKE_INFO);        

        // verify protocol fee
        uint minProtocolFee = _stakeInfo.protocolFee * (100 * slippageUnit - _slippage) / (slippageUnit * 100);
        uint maxProtocolFee = _stakeInfo.protocolFee * (100 * slippageUnit + _slippage) / (slippageUnit * 100);
        uint protocolFee = _getProtocolFee(lentAmount, _stakeInfo.leverageRatio);
        require(minProtocolFee <= protocolFee, ERROR_INVALID_STAKE_INFO);
        require(maxProtocolFee >= protocolFee, ERROR_INVALID_STAKE_INFO);
    }

    // verify NFT expiration
    function _verifyNFTExpiration(StakeInfo memory _stakeInfo) private view {
        // verify expire date
        require(_stakeInfo.lockEnd < block.timestamp, ERROR_NOT_EXPIRED_NFT);

    }
}