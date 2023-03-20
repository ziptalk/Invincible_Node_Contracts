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

    IERC20 public stKlay;
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

    // stake related
    uint public totalStakedAmount;
    uint public totalUserStakedAmount;
    mapping(address => uint) public userStakedAmount;
    mapping(address => uint) public userRewardAmount;

    // unstake related
    UnstakeRequest[] public unstakeRequests;

    // variable
    uint public slippage;
    address[] public userList;

    function initialize(address _stakeManager, address _stakeNFTAddr, address _lpPoolAddr, address _inviTokenStakeAddr, address _stKlayAddr) initializer public {
        stKlay = IERC20(_stKlayAddr);
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
        require(msg.sender == stakeManager, ERROR_NOT_OWNER);
        _;
    }

    //====== getter functions ======//

    // get stake info by principal & leverageRatio variables
    function getStakeInfo(uint _principal, uint _leverageRatio) public view returns(StakeInfo memory)  {
        uint lockPeriod = _getLockPeriod(_leverageRatio);
        uint lentAmount = _principal * (_leverageRatio - 1 * leverageUnit) / leverageUnit;
        require(lentAmount <= lpPoolContract.getMaxLentAmount(), ERROR_EXCEED_LENNT_AMOUNT);
        
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
        uint lentAmount = _stakeInfo.principal * (_stakeInfo.leverageRatio - 1) / leverageUnit;
        uint totalLentAmount = lpPoolContract.totalLentAmount() + lentAmount;
        lpPoolContract.setTotalLentAmount(totalLentAmount);
        totalUserStakedAmount += _stakeInfo.principal + lentAmount;
        userList.push(msg.sender);

        // send principal to STM
        (bool sent, ) = stakeManager.call{value : _stakeInfo.principal }("");
        require(sent, ERROR_FAIL_SEND);
    }

    // unStake native coin
    function repayNFT(uint _nftTokenId) external {
        // verify NFT
        require(stakeNFTContract.isOwner(_nftTokenId, msg.sender), ERROR_NOT_OWNED_NFT);
        require(stakeNFTContract.isUnlock(_nftTokenId), ERROR_NOT_UNLOCKED_NFT);

        // get stakeInfo by nftTokenId
        StakeInfo memory stakeInfo = stakeNFTContract.getStakeInfo(_nftTokenId);
        //TODO : receive 물량 체크해서 unstakeRequest 생성

        // transfer nft from msg.sender to inviCore
        stakeNFTContract.transferFrom(msg.sender, address(this), _nftTokenId);

        // burn NFT
        stakeNFTContract.burnNFT(_nftTokenId);  

        // create unstake request
        // UnstakeRequest memory request = UnstakeRequest(msg.sender, stakeInfo.principal)

        // tranfer Reward to msg.sender
        nftReward[_nftTokenId] = 0;
        (bool sent, ) = msg.sender.call{value : nftReward[_nftTokenId]}("");
        require(sent, ERROR_FAIL_SEND);
    }

    function distributeStKlayReward() external onlyOwner {
        uint totalReward = stKlay.balanceOf(stakeManager) - totalStakedAmount;
        uint nftReward = totalReward * totalUserStakedAmount / totalStakedAmount;
        uint lpReward = totalReward * (lpPoolContract.totalStakedAmount - lpPoolContract.totalLentAmount) / totalStakedAmount;

        require(nftReward + lpReward >= totalReward - 2, ERROR_NOT_MATCH_REWARD);


    }

    // split reward to pools
    function distributeProtocolFee(uint _totalProtocolFee) external onlyOwner {
        // reward Portion Total = rewardPortionTotalUnit 
        uint lpPoolReward = _totalProtocolFee * lpPoolRewardPortion / rewardPortionTotalUnit;
        uint inviTokenStakeReward = _totalProtocolFee * inviTokenStakeRewardPortion / rewardPortionTotalUnit; 
        lpPoolContract.distributeNativeReward{value: lpPoolReward}();
        inviTokenStakeContract.distributeNativeReward{value : inviTokenStakeReward}();
    }

    function distributeInviToken(uint _totalInviToken) external onlyOwner {
    }   
    
    //====== utils function ======//

    // verify stakeInfo is proper
    function _verifyStakeInfo(StakeInfo memory _stakeInfo, uint _slippage, uint _sendAmount) private view {
        // verify principal amount
        require(_stakeInfo.principal == _sendAmount, ERROR_INVALID_STAKE_INFO);

        // verify lockPeriod
        uint lockPeriod = _getLockPeriod(_stakeInfo.leverageRatio);
        require(_stakeInfo.lockPeriod == lockPeriod, ERROR_INVALID_STAKE_INFO);

        //verify lockStart & lockEnd
        uint256 today = block.timestamp - (block.timestamp % 86400);
        require(_stakeInfo.lockStart >= today && _stakeInfo.lockStart <= today + 86400, ERROR_INVALID_STAKE_INFO);
        require(_stakeInfo.lockEnd - _stakeInfo.lockStart == _stakeInfo.lockPeriod, ERROR_INVALID_STAKE_INFO);

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

    // distribute user reward
    function _distributeUserReward(uint _totalRewardAmount) private onlyOwner {
        for(uint i = 0; i < userList.length; i++){
            address user = userList[i];
            uint rewardAmount = (_totalRewardAmount * userStakedAmount[user] / totalUserStakedAmount);
            userRewardAmount[user] += rewardAmount;
        }

    }
}