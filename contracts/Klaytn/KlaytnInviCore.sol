// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../common/StakeNFT.sol";
import "../common/lib/Structs.sol";
import "../common/lib/ErrorMessages.sol";
import "hardhat/console.sol";
import "../common/lib/Logics.sol";
import "../common/lib/Unit.sol";
import "./KlaytnLiquidityProviderPool.sol";
import "./KlaytnInviTokenStake.sol"; 
import "../interfaces/IStKlay.sol";

contract KlaytnInviCore is Initializable, OwnableUpgradeable {
    //------Contracts and Addresses------//
    IERC20 public stToken;
    StakeNFT public stakeNFTContract;
    KlaytnLiquidityProviderPool public lpPoolContract;
    KlaytnInviTokenStake public inviTokenStakeContract;
    IStKlay public klaytnLiquidStaking;


    //------events------//
    event Stake(uint indexed amount);
    event Unstake(uint indexed amount);
    
    //------reward related------//
    uint public stakingAPR;
    uint private decreaseRatio;
    uint private increaseRatio;
    uint public lpPoolRewardPortion;
    uint public inviTokenStakeRewardPortion;

    //------stake related------//
    mapping(address => uint) public userStakedAmount;
    uint public latestStakeBlock;

    //------unstake related------//
    UnstakeRequest[] public unstakeRequests;
    uint public unstakeRequestsFront;
    uint public unstakeRequestsRear;
    uint public unstakeRequestAmount;
    uint public requireTransferAmount;

    //------other variable------//
    uint public slippage;
    address[] public userList;

    //------upgrades------//
    mapping (uint => uint) public nftUnstakeTime;
    mapping (address => uint) public claimableAmount;
    uint public lastStTokenDistributeTime;
    uint public lastSendUnstakedAmountTime;


    //======initializer======//
    function initialize(address _stTokenAddr, address _klaytnLiquidStaking) initializer public {
        __Ownable_init();
        stToken = IERC20(_stTokenAddr);
        klaytnLiquidStaking = IStKlay(_klaytnLiquidStaking);

        slippage = 5 * SLIPPAGE_UNIT;
        decreaseRatio = 10 * REWARD_ERROR_UNIT;
        increaseRatio = 5 * REWARD_ERROR_UNIT;
        stakingAPR = 10 * APR_UNIT;
        lpPoolRewardPortion = 700;
        inviTokenStakeRewardPortion = REWARD_PORTION_TOTAL_UNIT - lpPoolRewardPortion;

        latestStakeBlock = block.number;
    }

    //====== modifier functions ======//

    modifier onlyLpPool {
        require(msg.sender == address(lpPoolContract), ERROR_NOT_OWNER);
        _;
    }

    //====== setter address & contract functions ======//
    function setStakeNFTContract(address _stakeNFTAddr) external onlyOwner {
        stakeNFTContract = StakeNFT(_stakeNFTAddr);
    }

    function setLpPoolContract(address _lpPoolAddr) external onlyOwner {
        lpPoolContract = KlaytnLiquidityProviderPool(_lpPoolAddr);
    }

    function setInviTokenStakeContract(address _inviTokenStakeAddr) external onlyOwner {
        inviTokenStakeContract = KlaytnInviTokenStake(_inviTokenStakeAddr);
    }

    function setStTokenContract(address _stTokenAddr) external onlyOwner {
        stToken = IERC20(_stTokenAddr);
    }
    

    //====== getter functions ======//
    // get stake info by principal & leverageRatio variables
    function getStakeInfo(address _account, uint _principal, uint _leverageRatio, uint _lockPeriod) public view returns(StakeInfo memory)  {
        uint lockPeriod = getLockPeriod(_leverageRatio);
        // if lock period is less than minimum lock period, set lock period to minimum lock period
        if (lockPeriod < _lockPeriod) {
            lockPeriod = _lockPeriod;
        } 
        uint lentAmount = _principal * _leverageRatio / LEVERAGE_UNIT- _principal;
        require(lentAmount <= lpPoolContract.getMaxLentAmount(), ERROR_EXCEED_LENT_AMOUNT);
        
        uint protocolFee = getProtocolFee(lentAmount, _leverageRatio);
        uint lockStart = block.timestamp;
        uint lockEnd = block.timestamp + lockPeriod;
        uint stakedAmount = getStakedAmount(_principal, _leverageRatio);

        StakeInfo memory stakeInfo = StakeInfo(_account, _principal, _leverageRatio, stakedAmount, lockPeriod, lockStart, lockEnd, protocolFee, false);
        
        return stakeInfo;
    }

    // return expected reward(_amount == principal + lentAmount)
    function getExpectedReward(uint _amount, uint _lockPeriod) public view returns (uint) {
        return ExpectedReward(_amount, _lockPeriod, stakingAPR);
    }

    // return lock period by amount & leverage ratio
    function getLockPeriod(uint _leverageRatio) public pure returns (uint) {
        return LockPeriod(_leverageRatio);
    }

    // return protocol fee by amount & leverage ratio
    function getProtocolFee(uint _lentAmount, uint _leverageRatio) public view returns (uint) {
        uint totalLiquidity = lpPoolContract.getTotalLiquidity();
        return ProtocolFee(_lentAmount, _leverageRatio, totalLiquidity);
    }
    
    // return total Liquidity from LP Pool
    function getTotalLiquidity() public view returns (uint) {
        return lpPoolContract.getTotalLiquidity();
    }

    // return staked amount
    function getStakedAmount(uint _amount, uint _leverageRatio) public pure returns (uint) {
        return StakedAmount(_amount, _leverageRatio);
    }

    function getUnstakeRequestsLength() public view returns (uint) {
        return unstakeRequestsRear - unstakeRequestsFront;
    }
    function getTotalStakedAmount() public view returns (uint) {
        uint totalStakedAmount = stakeNFTContract.totalStakedAmount() + lpPoolContract.totalStakedAmount() - lpPoolContract.totalLentAmount();
        return totalStakedAmount;
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
    function setLatestStakeBlock (uint _latestStakeBlock) external onlyOwner {
        latestStakeBlock = _latestStakeBlock;
    }

    // set reward portion
    function _setRewardPortion(uint _lpPoolRewardPortion, uint _inviTokenStakeRewardPortion) external onlyOwner {
        require (_lpPoolRewardPortion + _inviTokenStakeRewardPortion == REWARD_PORTION_TOTAL_UNIT, ERROR_SET_REWARD_PORTION);
        lpPoolRewardPortion = _lpPoolRewardPortion;
        inviTokenStakeRewardPortion = _inviTokenStakeRewardPortion;
    }

    //====== service functions ======//

    fallback() payable external {}
    receive() payable external {}
    
     /**
     * @notice stake native coin
     */
    function stake(uint _principal, uint _leverageRatio, uint _lockPeriod, uint _slippage) external payable returns (StakeInfo memory) {
        // get stakeInfo
        StakeInfo memory _stakeInfo = getStakeInfo(msg.sender, _principal, _leverageRatio, _lockPeriod);

        // verify given stakeInfo
        _verifyStakeInfo(_stakeInfo, _slippage, msg.sender, msg.value);

        // stake using klaytnLiquidStaking
        klaytnLiquidStaking.stake{value : _stakeInfo.principal}();

        // mint StakeNFT Token by stake info
        stakeNFTContract.mintNFT(_stakeInfo);

        //update stakeAmount info
        uint lentAmount = _stakeInfo.stakedAmount - _stakeInfo.principal;
        uint totalLentAmount = lpPoolContract.totalLentAmount() + lentAmount;
        lpPoolContract.setTotalLentAmount(totalLentAmount);
        userList.push(msg.sender);

        emit Stake(_stakeInfo.principal);
        return _stakeInfo;
    }

     /**
     * @notice unStake native coin
     */
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
        UnstakeRequest memory request = UnstakeRequest(msg.sender, _nftTokenId, stakeInfo.principal + userReward, stakeInfo.protocolFee, 0);
        // create unstake request for LPs
        UnstakeRequest memory lpRequest = UnstakeRequest(address(lpPoolContract),10**18, lpPoolReward, 0, 1);
        // create unstake request for INVI stakers
        UnstakeRequest memory inviStakerRequest = UnstakeRequest(address(inviTokenStakeContract),10**18, inviTokenStakeReward, 0, 2);

        // push request to unstakeRequests
        unstakeRequestsRear = enqueueUnstakeRequests(unstakeRequests, request, unstakeRequestsRear);
        unstakeRequestsRear = enqueueUnstakeRequests(unstakeRequests, lpRequest, unstakeRequestsRear);
        unstakeRequestsRear = enqueueUnstakeRequests(unstakeRequests, inviStakerRequest, unstakeRequestsRear);

        // // burn NFT & delete stakeInfo
        stakeNFTContract.deleteStakeInfo(_nftTokenId);
        stakeNFTContract.deleteNFTOwnership(msg.sender, _nftTokenId);
        stakeNFTContract.burnNFT(_nftTokenId);  

        // create unstake event
        klaytnLiquidStaking.unstake(stakeInfo.principal + userReward + lpPoolReward + inviTokenStakeReward);

        // update unstake request amount
        unstakeRequestAmount += stakeInfo.principal + userReward + lpPoolReward + inviTokenStakeReward;

        // update nft unstake time
        nftUnstakeTime[_nftTokenId] = block.timestamp;
        
        emit Unstake(stakeInfo.principal + userReward + lpPoolReward + inviTokenStakeReward);
    }

     /**
     * @notice Periodic reward distribution
     */
    function distributeStTokenReward() external {
        // get total staked amount
        uint totalStakedAmount = stakeNFTContract.totalStakedAmount() + lpPoolContract.totalStakedAmount() - lpPoolContract.totalLentAmount();
        // get total rewards
        uint totalReward = stToken.balanceOf(address(this)) - totalStakedAmount;
        require(totalReward > 0, ERROR_NO_REWARD);

        // check rewards 
        uint nftReward = totalReward * stakeNFTContract.totalStakedAmount() / totalStakedAmount;
        uint lpReward = (totalReward - nftReward) * lpPoolRewardPortion / REWARD_PORTION_TOTAL_UNIT;
        uint inviStakerReward = totalReward - nftReward - lpReward;

        // request unstake to klaytnLiquidStaking
        klaytnLiquidStaking.unstake(nftReward + lpReward + inviStakerReward);

        // create unstake request for LPs
        UnstakeRequest memory lpRequest = UnstakeRequest(address(lpPoolContract),10**18, lpReward, 0, 1);
        // create unstake request for INVI stakers
        UnstakeRequest memory inviStakerRequest = UnstakeRequest(address(inviTokenStakeContract),10**18, inviStakerReward, 0, 2);

        // update NFT reward
        stakeNFTContract.updateReward(nftReward);
        // push request to unstakeRequests
        unstakeRequestsRear = enqueueUnstakeRequests(unstakeRequests, lpRequest, unstakeRequestsRear);
        unstakeRequestsRear = enqueueUnstakeRequests(unstakeRequests, inviStakerRequest, unstakeRequestsRear);

        lastStTokenDistributeTime = block.timestamp;


        emit Unstake(lpReward + inviStakerReward);
    }

     /**
     * @notice stake from LPPool
     */
    function stakeLp() external onlyLpPool payable returns (bool) {
        // stake 
        klaytnLiquidStaking.stake{value : msg.value}();
        emit Stake(msg.value);
        return true;
    }

     /**
     * @notice unStake from LP Pool
     */
    function unstakeLp(uint _requestAmount) external onlyLpPool {
        // create unstake request
        klaytnLiquidStaking.unstake(_requestAmount);

        // create unstake request for LPs
        UnstakeRequest memory lpRequest = UnstakeRequest(address(lpPoolContract), 10**18,_requestAmount, 0, 1);
       
        // push request to unstakeRequests
        unstakeRequestsRear = enqueueUnstakeRequests(unstakeRequests, lpRequest, unstakeRequestsRear);

        emit Unstake(_requestAmount);
    }

     /**
     * @notice send unstaked amount to unstakeRequest applicants
     */
    function sendUnstakedAmount() external {
        klaytnLiquidStaking.claim(address(this));
        uint front = unstakeRequestsFront;
        uint rear = unstakeRequestsRear;
        for (uint i = front ; i <  rear; i++) {
            if (unstakeRequests[i].amount > address(this).balance) {
                break;
            }
            // check request type (0: user, 1: LP, 2: INVI staker)
            uint requestType = unstakeRequests[i].requestType;
            uint amount = unstakeRequests[i].amount;
            address recipient = unstakeRequests[i].recipient;
            // remove first element of unstakeRequests
            unstakeRequestsFront = dequeueUnstakeRequests(unstakeRequests, unstakeRequestsFront, unstakeRequestsRear);
            // update unstakeRequestAmount
            unstakeRequestAmount -= amount;
            // if normal user
            if (requestType == 0) {
                claimableAmount[recipient] += amount;
            } 
            // if lp pool
            else if (requestType == 1) {
                lpPoolContract.distributeNativeReward{value : amount }();
            } 
            // if invi token stake
            else if (requestType == 2) {
                inviTokenStakeContract.updateNativeReward{value : amount }();
            }
        }

        // update sendUnstakedAmountTime
        lastSendUnstakedAmountTime = block.timestamp;
    } 

    // claim unstaked amount
    function claimUnstaked() external {
        require(claimableAmount[msg.sender] > 0, ERROR_NO_CLAIMABLE_AMOUNT);
        uint amount = claimableAmount[msg.sender];
        claimableAmount[msg.sender] = 0;
        (bool sent, ) = msg.sender.call{value : amount }("");
        require(sent, ERROR_FAIL_SEND);
    }
    
    //====== utils function ======//
    /**
     * @notice verify stakeInfo is proper
     */
    function _verifyStakeInfo(StakeInfo memory _stakeInfo, uint _slippage, address _sender, uint _sendAmount) private view {
        
        // verify msg.sender
        require(_stakeInfo.user == _sender, ERROR_INVALID_STAKE_INFO);
        
        // verify principal amount
        require(_stakeInfo.principal == _sendAmount, ERROR_INVALID_STAKE_INFO);

        // verify lockPeriod
        uint minLockPeriod = getLockPeriod(_stakeInfo.leverageRatio);
        require(_stakeInfo.lockPeriod >= minLockPeriod, ERROR_INVALID_STAKE_INFO);

        //verify lockStart & lockEnd
        uint256 today = block.timestamp - (block.timestamp % 86400);
        require(_stakeInfo.lockStart >= today && _stakeInfo.lockStart <= today + 86400, ERROR_INVALID_STAKE_INFO);
        require(_stakeInfo.lockEnd - _stakeInfo.lockStart == _stakeInfo.lockPeriod, ERROR_INVALID_STAKE_INFO);

        // verify lentAmount
        uint lentAmount = _stakeInfo.principal * (_stakeInfo.leverageRatio - 1 * LEVERAGE_UNIT) / LEVERAGE_UNIT;
        require(lentAmount <= lpPoolContract.getMaxLentAmount(), ERROR_TOO_MUCH_LENT);

        // verify protocol fee
        uint minProtocolFee = _stakeInfo.protocolFee * (100 * SLIPPAGE_UNIT- _slippage) / (SLIPPAGE_UNIT* 100);
        uint maxProtocolFee = _stakeInfo.protocolFee * (100 * SLIPPAGE_UNIT + _slippage) / (SLIPPAGE_UNIT* 100);
        uint protocolFee = getProtocolFee(lentAmount, _stakeInfo.leverageRatio);
        require(minProtocolFee <= protocolFee, ERROR_INVALID_STAKE_INFO);
        require(maxProtocolFee >= protocolFee, ERROR_INVALID_STAKE_INFO);
    }
}