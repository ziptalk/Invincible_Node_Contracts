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
    //------Contracts and Addresses------//
    IERC20 public stKlay;
    StakeNFT public stakeNFTContract;
    LiquidityProviderPool public lpPoolContract;
    InviTokenStake public inviTokenStakeContract;
    address public stakeManager;

    //------events------//
    
    //------reward related------//
    uint public stakingAPR;
    uint private decreaseRatio;
    uint private increaseRatio;
    uint public lpPoolRewardPortion;
    uint public inviTokenStakeRewardPortion;

    //------stake related------//
    mapping(address => uint) public userStakedAmount;

    //------unstake related------//
    UnstakeRequest[] public unstakeRequests;

    //------other variable------//
    uint public slippage;
    address[] public userList;

    //======initializer======//
    function initialize(address _stakeManager, address _stakeNFTAddr, address _lpPoolAddr, address _inviTokenStakeAddr, address _stKlayAddr) initializer public {
        stKlay = IERC20(_stKlayAddr);
        stakeManager = _stakeManager;
        stakeNFTContract = StakeNFT(_stakeNFTAddr);
        lpPoolContract = LiquidityProviderPool(_lpPoolAddr);
        inviTokenStakeContract = InviTokenStake(_inviTokenStakeAddr);
        decreaseRatio = 10 * REWARD_ERROR_UNIT;
        increaseRatio = 5 * REWARD_ERROR_UNIT;
        stakingAPR = 10 * APR_UNIT;
        lpPoolRewardPortion = 700;
        inviTokenStakeRewardPortion = REWARD_PORTION_TOTAL_UNIT - lpPoolRewardPortion;
        __Ownable_init();
    }

    //====== modifier functions ======//
    modifier onlySTM {
        require(msg.sender == stakeManager, ERROR_NOT_OWNER);
        _;
    }

    //====== getter functions ======//
    // get stake info by principal & leverageRatio variables
    function getStakeInfo(address _account, uint _principal, uint _leverageRatio) public view returns(StakeInfo memory)  {
        uint lockPeriod = _getLockPeriod(_leverageRatio);
        uint lentAmount = _principal * _leverageRatio / LEVERAGE_UNIT- _principal;
        require(lentAmount <= lpPoolContract.getMaxLentAmount(), ERROR_EXCEED_LENNT_AMOUNT);
        
        uint protocolFee = _getProtocolFee(lentAmount, _leverageRatio);
        uint lockStart = block.timestamp;
        uint lockEnd = block.timestamp + lockPeriod;
        uint minReward = _getMinReward(_principal + lentAmount, lockPeriod);
        uint maxReward = _getMaxReward(_principal + lentAmount, lockPeriod);
        uint stakedAmount = _getStakedAmount(_principal, _leverageRatio);

        StakeInfo memory stakeInfo = StakeInfo(_account, _principal, _leverageRatio, stakedAmount, lockPeriod, lockStart, lockEnd, protocolFee, minReward, maxReward, false);
        
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

    // return staked amount
    function _getStakedAmount(uint _amount, uint _leverageRatio) private view returns (uint) {
        return StakedAmount(_amount, _leverageRatio);
    }

    function getUnstakeRequestsLength() public view returns (uint) {
        return unstakeRequests.length;
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
        StakeInfo memory stakeInfo = stakeNFTContract.getStakeInfo(_nftTokenId);

        // check reward amount and range
        require(stakeInfo.minReward >= msg.value && stakeInfo.maxReward <= msg.value, ERROR_NFT_REWARD_INVALID_RANGE);
    }

    // set reward portion
    function _setRewardPortion(uint _lpPoolRewardPortion, uint _inviTokenStakeRewardPortion) external onlyOwner {
        require (_lpPoolRewardPortion + _inviTokenStakeRewardPortion == REWARD_PORTION_TOTAL_UNIT, ERROR_SET_REWARD_PORTION);
        lpPoolRewardPortion = _lpPoolRewardPortion;
        inviTokenStakeRewardPortion = _inviTokenStakeRewardPortion;
    }

    //====== service functions ======//
    

    // stake native coin
    function stake(StakeInfo memory _stakeInfo, uint _slippage) external payable{
        // verify given stakeInfo
        _verifyStakeInfo(_stakeInfo, _slippage, msg.sender, msg.value);

        // mint StakeNFT Token by stake info
        uint nftTokenId = stakeNFTContract.mintNFT(_stakeInfo);

        //update stakeAmount info
        uint lentAmount = _stakeInfo.stakedAmount - _stakeInfo.principal;
        uint totalLentAmount = lpPoolContract.totalLentAmount() + lentAmount;
        lpPoolContract.setTotalLentAmount(totalLentAmount);
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

        // get user reward amount including protocol fee
        uint rewardAmount = stakeNFTContract.rewardAmount(_nftTokenId);
        // get protocol fee
        uint protocolFee = stakeInfo.protocolFee;
        // get user reward without protocol fee
        uint userReward = rewardAmount * (PROTOCOL_FEE_UNIT* 100 - protocolFee) / (PROTOCOL_FEE_UNIT * 100);
        // get stakers'(INVI staker, LPs) reward
        uint stakersReward = rewardAmount - userReward;
        // split reward to LPs and INVI stakers
        uint lpPoolReward = stakersReward *  lpPoolRewardPortion / REWARD_PORTION_TOTAL_UNIT;
        uint inviTokenStakeReward = stakersReward * inviTokenStakeRewardPortion / REWARD_PORTION_TOTAL_UNIT;

        // set stakeAmount info
        stakeNFTContract.setTotalStakedAmount(stakeNFTContract.totalStakedAmount() - stakeInfo.stakedAmount);
        lpPoolContract.setTotalStakedAmount(lpPoolContract.totalStakedAmount() + (stakeInfo.stakedAmount - stakeInfo.principal));
        lpPoolContract.setTotalLentAmount(lpPoolContract.totalLentAmount() - (stakeInfo.stakedAmount - stakeInfo.principal));

        // create unstake request for user 
        UnstakeRequest memory request = UnstakeRequest(msg.sender, stakeInfo.principal + userReward, stakeInfo.protocolFee, 0);
        // create unstake request for LPs
        UnstakeRequest memory lpRequest = UnstakeRequest(address(lpPoolContract), lpPoolReward, 0, 1);
        // create unstake request for INVI stakers
        UnstakeRequest memory inviStakerRequest = UnstakeRequest(address(inviTokenStakeContract), inviTokenStakeReward, 0, 2);

        // push request to unstakeRequests
        unstakeRequests.push(request);
        unstakeRequests.push(lpRequest);
        unstakeRequests.push(inviStakerRequest);

        // transfer nft from msg.sender to inviCore
        stakeNFTContract.transferFrom(msg.sender, address(this), _nftTokenId); 

        // burn NFT & delete stakeInfo
        stakeNFTContract.deleteStakeInfo(_nftTokenId);
        stakeNFTContract.burnNFT(_nftTokenId);  
    }

    // periodic reward distribution, update
    function distributeStKlayReward() external onlyOwner {
        // get total staked amount
        uint totalStakedAmount = stakeNFTContract.totalStakedAmount() + lpPoolContract.totalStakedAmount() - lpPoolContract.totalLentAmount();
        // get total rewards
        uint totalReward = stKlay.balanceOf(stakeManager) - totalStakedAmount;

        // check rewards
        uint nftReward = totalReward * stakeNFTContract.totalStakedAmount() / totalStakedAmount;
        uint lpReward = (totalReward - nftReward) * lpPoolRewardPortion / REWARD_PORTION_TOTAL_UNIT;
        uint inviStakerReward = totalReward - nftReward - lpReward;

        // create unstake request for LPs
        UnstakeRequest memory lpRequest = UnstakeRequest(address(lpPoolContract), lpReward, 0, 1);
        // create unstake request for INVI stakers
        UnstakeRequest memory inviStakerRequest = UnstakeRequest(address(inviTokenStakeContract), inviStakerReward, 0, 2);

        // update NFT reward
        stakeNFTContract.updateReward(nftReward);
        // push request to unstakeRequests
        unstakeRequests.push(lpRequest);
        unstakeRequests.push(inviStakerRequest);
    }

    // distribute invi token reward
    function distributeInviTokenReward(uint _totalInviToken) external onlyOwner {
        uint lpReward = (_totalInviToken) * lpPoolRewardPortion;
        uint inviStakerReward = _totalInviToken - lpReward;

        // lpPoolContract.distributeInviTokenReward(lpReward);
        // inviTokenStakeContract.distributeInviTokenReward(inviStakerReward);
    }   

    // send unstaked amount to unstakeRequest applicants
    function sendUnstakedAmount() external payable onlySTM{
        while (unstakeRequests.length > 0 && unstakeRequests[0].amount <= address(this).balance) {
            // check request type (0: user, 1: LP, 2: INVI staker)
            uint requestType = unstakeRequests[0].requestType;
            uint amount = unstakeRequests[0].amount;
            address recipient = unstakeRequests[0].recipient;
            // remove first element of unstakeRequests
            popIndexFromUnstakeRequests(unstakeRequests, 0);
            if (requestType == 0) {
                (bool sent, ) = recipient.call{value : amount }("");
                require(sent, ERROR_FAIL_SEND);
            } else if (requestType == 1) {
                lpPoolContract.distributeNativeReward{value : amount }();
            } else if (requestType == 2) {
                inviTokenStakeContract.updateNativeReward{value : amount }();
            }
        }
    } 
    
    //====== utils function ======//
    // verify stakeInfo is proper
    function _verifyStakeInfo(StakeInfo memory _stakeInfo, uint _slippage, address _msgSender, uint _sendAmount) private view {
        
        // verify msg.sender
        require(_stakeInfo.user == _msgSender, ERROR_INVALID_STAKE_INFO);
        
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
        uint lentAmount = _stakeInfo.principal * (_stakeInfo.leverageRatio - 1 * LEVERAGE_UNIT) / LEVERAGE_UNIT;
        require(lentAmount <= lpPoolContract.getMaxLentAmount(), ERROR_TOO_MUCH_LENT);

        // verify min/max reward
        uint amount = _stakeInfo.principal * _stakeInfo.leverageRatio / LEVERAGE_UNIT;
        uint minReward = MinReward(amount, _stakeInfo.lockPeriod, stakingAPR, decreaseRatio);
        uint maxReward = MaxReward(amount, _stakeInfo.lockPeriod, stakingAPR, increaseRatio);
        require(minReward == _stakeInfo.minReward, ERROR_INVALID_STAKE_INFO);
        require(maxReward == _stakeInfo.maxReward, ERROR_INVALID_STAKE_INFO);        

        // verify protocol fee
        uint minProtocolFee = _stakeInfo.protocolFee * (100 * SLIPPAGE_UNIT- _slippage) / (SLIPPAGE_UNIT* 100);
        uint maxProtocolFee = _stakeInfo.protocolFee * (100 * SLIPPAGE_UNIT + _slippage) / (SLIPPAGE_UNIT* 100);
        uint protocolFee = _getProtocolFee(lentAmount, _stakeInfo.leverageRatio);
        require(minProtocolFee <= protocolFee, ERROR_INVALID_STAKE_INFO);
        require(maxProtocolFee >= protocolFee, ERROR_INVALID_STAKE_INFO);
    }

    // create unstake request for testing
    function createUnstakeRequest(address _recipient, uint _amount, uint _protocolFee, uint _requestType) external onlyOwner {
        UnstakeRequest memory request = UnstakeRequest(_recipient, _amount, _protocolFee, _requestType);
        unstakeRequests.push(request);
    }
}