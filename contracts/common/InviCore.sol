// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./StakeNFT.sol";
import "./lib/Structs.sol";
import "hardhat/console.sol";
import "./LiquidityProviderPool.sol";
import "./InviTokenStake.sol";
import "./lib/Logics.sol";
import "./lib/Unit.sol";
import "../interfaces/external/ILiquidStaking.sol";

/*
network Ids
- bifrost: 0
- evmos: 1
- klaytn: 2
*/

/**
 * @title InviCore Contract
 * @dev Main contract for InviToken's staking system
 */
contract InviCore is Initializable, OwnableUpgradeable {
    //------Contracts / Addresses / Networks ------//
    IERC20 public stToken;
    StakeNFT public stakeNFTContract;
    LiquidityProviderPool public lpPoolContract;
    InviTokenStake public inviTokenStakeContract;
    ILiquidStaking public liquidStakingContract;
    uint32 public networkId;

    //------reward related------//
    uint32 public lpPoolRewardPortion;
    uint32 public inviTokenStakeRewardPortion;
    uint128 public totalNFTRewards;
    //------stake related------//
    uint32 public stakingAPR;
    //------unstake related------//
    uint32 public unstakeRequestsFront;
    uint32 public unstakeRequestsRear;
    uint128 public unstakeRequestAmount;
    //------other variable------// 
    uint32 public slippage;
    uint128 public totalClaimableAmount;
    uint256 public lastStTokenDistributeTime;
    uint256 public lastClaimAndSplitUnstakedAmountTime;
    uint256 public stTokenDistributePeriod;
    //------Mappings------//
    mapping (uint32 => UnstakeRequest) public unstakeRequests;
    mapping (address => uint128) public claimableAmount;

    //------events------//
    event Stake(uint128 indexed amount);
    event Unstake(uint128 indexed amount);
    
    //======initializer======//
    /**
     * @dev Initializes the contract.
     * @param _stTokenAddr The address of the ST token contract.
     * @param _liquidStakingAddr The address of the Liquid Staking contract.
     * @param _networkId The network ID.
     */
    function initialize(address _stTokenAddr, address _liquidStakingAddr, uint8 _networkId) initializer public {
        __Ownable_init();
        stToken = IERC20(_stTokenAddr);
        liquidStakingContract = ILiquidStaking(_liquidStakingAddr);

        slippage = 5 * SLIPPAGE_UNIT;
        stakingAPR = 10 * APR_UNIT;
        lpPoolRewardPortion = 700;
        inviTokenStakeRewardPortion = REWARD_PORTION_TOTAL_UNIT - lpPoolRewardPortion;
        
        networkId = _networkId;

        unstakeRequestsFront = 0;
        unstakeRequestsRear = 0;
        stTokenDistributePeriod = 1 minutes; // test: 1min / main: 1hour
    }

    //====== modifier functions ======//
    modifier onlyLpPool {
        require(msg.sender == address(lpPoolContract), "InviCore: caller is not the lpPool contract");
        _;
    }

    //====== setter address & contract functions ======//
    /**
     * @dev Sets the address of the StakeNFT contract.
     * @param _stakeNFTAddr The address of the StakeNFT contract.
    */
    function setStakeNFTContract(address _stakeNFTAddr) external onlyOwner {
        stakeNFTContract = StakeNFT(_stakeNFTAddr);
    }

    /**
     * @dev Sets the address of the LiquidityProviderPool contract.
     * @param _lpPoolAddr The address of the LiquidityProviderPool contract.
     */
    function setLpPoolContract(address _lpPoolAddr) external onlyOwner {
        lpPoolContract = LiquidityProviderPool(_lpPoolAddr);
    }

    /**
     * @dev Sets the address of the InviTokenStake contract.
     * @param _inviTokenStakeAddr The address of the InviTokenStake contract.
     */
    function setInviTokenStakeContract(address _inviTokenStakeAddr) external onlyOwner {
        inviTokenStakeContract = InviTokenStake(_inviTokenStakeAddr);
    }

    /**
     * @dev Sets the address of the ST token contract.
     * @param _stTokenAddr The address of the ST token contract.
     */
    function setStTokenContract(address _stTokenAddr) external onlyOwner {
        stToken = IERC20(_stTokenAddr);
    }
    

    //====== getter functions ======//
    /**
     * @dev Retrieves the stake information for the provided account, principal amount, leverage ratio, and lock period.
     * @param _account The account address.
     * @param _principal The principal amount.
     * @param _leverageRatio The leverage ratio.
     * @param _lockPeriod The lock period.
     * @return stakeInfo The stake information struct.
     */
    function createStakeInfo(address _account, uint128 _principal, uint32 _leverageRatio, uint256 _lockPeriod) public view returns(StakeInfo memory)  {
        // get lock period
        uint256 lockPeriod = getLockPeriod(_leverageRatio);
        // if provided lock period is less than minimum lock period, set lock period to minimum lock period
        if (lockPeriod < _lockPeriod) {
            lockPeriod = _lockPeriod;
        } 
        uint256 lockStart = block.timestamp; // get lock start time
        uint256 lockEnd = lockStart + lockPeriod; // get lock end time
        uint128 lentAmount = _principal * _leverageRatio / LEVERAGE_UNIT- _principal; // get lent amount
        require(lentAmount <= lpPoolContract.getMaxLentAmount(), "InviCore: exceeds max lent amount"); // verify lent amount
        uint128 stakedAmount = getStakedAmount(_principal, _leverageRatio); // get staked amount
        require(stakedAmount >= _principal, "InviCore: invalid staked amount");
        uint128 protocolFee = getProtocolFee(lentAmount, _leverageRatio); // get protocol fee

        StakeInfo memory stakeInfo = StakeInfo(_account,_leverageRatio,_leverageRatio, protocolFee, _principal, stakedAmount, lockPeriod, lockStart, lockEnd, false);
        
        return stakeInfo;
    }

    /**
     * @dev Retrieves the expected reward for the provided amount and lock period.
     * @param _amount The total amount (principal + lent amount).
     * @param _lockPeriod The lock period.
     * @return reward The expected reward.
     */
    function getExpectedReward(uint128 _amount, uint256 _lockPeriod) public view returns (uint) {
        return ExpectedReward(_amount, _lockPeriod, stakingAPR);
    }

    /**
     * @dev Retrieves the lock period for the provided leverage ratio.
     * @param _leverageRatio The leverage ratio.
     * @return lockPeriod The lock period.
     */
    function getLockPeriod(uint32 _leverageRatio) public pure returns (uint) {
        return LockPeriod(_leverageRatio);
    }

    /**
     * @dev Retrieves the protocol fee for the provided lent amount and leverage ratio.
     * @param _lentAmount The lent amount.
     * @param _leverageRatio The leverage ratio.
     * @return protocolFee The protocol fee.
     */
    function getProtocolFee(uint128 _lentAmount, uint32 _leverageRatio) public view returns (uint128) {
        uint128 totalLiquidity = lpPoolContract.getTotalLiquidity();
        return ProtocolFee(_lentAmount, _leverageRatio, totalLiquidity);
    }
    
    /**
     * @dev Retrieves the total liquidity from the LP Pool.
     * @return liquidity The total liquidity.
     */
    function getTotalLiquidity() public view returns (uint) {
        return lpPoolContract.getTotalLiquidity();
    }

    /**
     * @dev Retrieves the staked amount for the provided principal amount and leverage ratio.
     * @param _amount The principal amount.
     * @param _leverageRatio The leverage ratio.
     * @return stakedAmount The staked amount.
     */
    function getStakedAmount(uint128 _amount, uint32 _leverageRatio) public pure returns (uint128) {
        return StakedAmount(_amount, _leverageRatio);
    }

     /**
     * @dev Retrieves the length of the unstake requests array.
     * @return length The length of the unstake requests array.
     */
    function getUnstakeRequestsLength() public view returns (uint32) {
        return unstakeRequestsRear - unstakeRequestsFront;
    }

    /**
     * @dev Retrieves the total staked amount.
     * @return totalStakedAmount The total staked amount.
     */
    function getTotalStakedAmount() public view returns (uint128) {
        uint128 totalStakedAmount = stakeNFTContract.totalStakedAmount() + lpPoolContract.totalStakedAmount() - lpPoolContract.totalLentAmount();
        return totalStakedAmount;
    }

    /**
     * @dev Retrieves the balance of ST tokens held by the contract.
     * @return balance The ST token balance.
     */
    function getStTokenBalance() public view returns (uint) {
        return stToken.balanceOf(address(this));
    }
    

    //====== setter functions ======//
    /**
     * @dev Sets the staking APR (Annual Percentage Rate).
     * @param _stakingAPR The staking APR.
     */
    function setStakingAPR(uint32 _stakingAPR) external onlyOwner {
        stakingAPR = _stakingAPR;
    }

    /**
     * @dev Sets the slippage for protocol fees.
     * @param _slippage The slippage.
     */
    function setSlippage(uint32 _slippage) external onlyOwner {
        slippage = _slippage;
    }

     /**
     * @dev Sets the reward portion for LP pool and INVI token stake.
     * @param _lpPoolRewardPortion The reward portion for the LP pool.
     * @param _inviTokenStakeRewardPortion The reward portion for the INVI token stake.
     */
    function _setRewardPortion(uint32 _lpPoolRewardPortion, uint32 _inviTokenStakeRewardPortion) external onlyOwner {
        require (_lpPoolRewardPortion + _inviTokenStakeRewardPortion == REWARD_PORTION_TOTAL_UNIT, "InviCore: invalid reward portion");
        lpPoolRewardPortion = _lpPoolRewardPortion;
        inviTokenStakeRewardPortion = _inviTokenStakeRewardPortion;
    }

    //====== service functions ======//
    /**
     * @dev Stakes native coins by minting an NFT and staking the principal amount.
     * @param _principal The principal amount to stake.
     * @param _leverageRatio The leverage ratio.
     * @param _lockPeriod The lock period.
     * @param _feeSlippage The slippage for the protocol fee.
     * @return nftId The ID of the minted NFT.
     */
    function stake(uint128 _principal, uint32 _leverageRatio, uint256 _lockPeriod,uint32 _feeSlippage) external payable returns (uint) {
         // get stakeInfo
        StakeInfo memory _stakeInfo = createStakeInfo(msg.sender, _principal, _leverageRatio, _lockPeriod);

        // verify given stakeInfo
        _verifyStakeInfo(_stakeInfo, _feeSlippage, msg.sender, uint128(msg.value));

        // stake using bfcLiquidStaking
        liquidStakingContract.stake{value : _stakeInfo.principal}();

        // mint StakeNFT Token by stake info
        uint32 nftId = stakeNFTContract.mintNFT(_stakeInfo);

        //update stakeAmount info
        uint128 lentAmount = _stakeInfo.stakedAmount - _stakeInfo.principal;
        uint128 totalLentAmount = lpPoolContract.totalLentAmount() + lentAmount;
        lpPoolContract.setTotalLentAmount(totalLentAmount);

        emit Stake(_stakeInfo.principal);
        return nftId;
    }

    /**
     * @dev return NFT and request unstake for user
     * @param _nftTokenId The ID of the NFT to unstake.
     */
    function repayNFT(uint32 _nftTokenId) external {
        // verify NFT
        require(stakeNFTContract.isOwner(_nftTokenId, msg.sender), "InviCore: not owner of NFT");
        require(stakeNFTContract.isUnlock(_nftTokenId), "InviCore: NFT is locked");

        // get stakeInfo by nftTokenId
        StakeInfo memory stakeInfo = stakeNFTContract.getStakeInfo(_nftTokenId);

        // get lent amount
        uint128 lentAmount = stakeInfo.stakedAmount - stakeInfo.principal;
        lpPoolContract.setTotalLentAmount(lpPoolContract.totalLentAmount() - lentAmount);

        // get user reward amount including protocol fee
        uint128 rewardAmount = stakeNFTContract.rewardAmount(_nftTokenId);
        // get stakers'(INVI staker, LPs) reward
        uint128 stakersReward = (rewardAmount + stakeInfo.principal) * (PROTOCOL_FEE_UNIT * 100 - stakeInfo.protocolFee) / (PROTOCOL_FEE_UNIT * 100);
        // get user reward without protocol fee
        uint128 userReward = rewardAmount - stakersReward;
        // split reward to LPs and INVI stakers
        uint128 lpPoolReward = stakersReward *  lpPoolRewardPortion / REWARD_PORTION_TOTAL_UNIT;
        uint128 inviTokenStakeReward = stakersReward * inviTokenStakeRewardPortion / REWARD_PORTION_TOTAL_UNIT;
        // update totalNFTReward
        totalNFTRewards -= userReward;
        // create unstake request for user (principal + reward)
        UnstakeRequest memory request = UnstakeRequest(msg.sender, 0, _nftTokenId, stakeInfo.protocolFee, stakeInfo.principal + userReward);

        //push request to unstakeRequests
        unstakeRequests[unstakeRequestsRear++] = request;
        
        //unstakeRequestsRear = enqueueUnstakeRequests(unstakeRequests, request, unstakeRequestsRear);
        if (lpPoolReward != 0) {
            // create unstake request for LPs
            UnstakeRequest memory lpRequest = UnstakeRequest(address(lpPoolContract),1, 0, 0, lpPoolReward);
            unstakeRequests[unstakeRequestsRear++] = lpRequest;
        }
        if (inviTokenStakeReward != 0) {
            // create unstake request for INVI stakers
            UnstakeRequest memory inviStakerRequest = UnstakeRequest(address(inviTokenStakeContract),2,0, 0, inviTokenStakeReward);
            unstakeRequests[unstakeRequestsRear++] = inviStakerRequest;
        }

        //burn NFT & delete stakeInfo
        stakeNFTContract.deleteStakeInfo(_nftTokenId);
        stakeNFTContract.deleteNFTOwnership(msg.sender, _nftTokenId);
        stakeNFTContract.burnNFT(_nftTokenId);  

        // create unstake event
        if (networkId == 0 || networkId == 1) {
            liquidStakingContract.createUnstakeRequest(stakeInfo.principal + userReward + lpPoolReward + inviTokenStakeReward);
        } else if (networkId == 2) {
            liquidStakingContract.unstake(stakeInfo.principal + userReward + lpPoolReward + inviTokenStakeReward);
        }

        // update unstake request amount
        unstakeRequestAmount += stakeInfo.principal + userReward + lpPoolReward + inviTokenStakeReward;

        emit Unstake(stakeInfo.principal + userReward + lpPoolReward + inviTokenStakeReward);
    }

    /**
     * @dev distribute reward to stakers / lps / inviStakers
     */
    function distributeStTokenReward() external {
        require(stTokenDistributePeriod + lastStTokenDistributeTime < block.timestamp, "InviCore: reward distribution period not passed");
        // get total staked amount
        uint128 totalStakedAmount = getTotalStakedAmount();
        require(stToken.balanceOf(address(this)) > totalStakedAmount + totalNFTRewards , "InviCore: not enough reward");
        // get total rewards
        uint128 totalReward = uint128(stToken.balanceOf(address(this))) - totalStakedAmount - totalNFTRewards;
       
        // check rewards 
        uint128 nftReward = totalReward * stakeNFTContract.totalStakedAmount() / totalStakedAmount;

        // update NFT reward
        uint128 leftRewards =  stakeNFTContract.updateReward(nftReward);
        totalNFTRewards = nftReward - leftRewards;
        uint128 lpReward = totalReward - nftReward + leftRewards;

        // create unstake request for lps and invi stakers
        if (lpReward > 0) {
           // create unstake request for LPs
            UnstakeRequest memory lpRequest = UnstakeRequest(address(lpPoolContract),1,0, 0, lpReward);
            // push request to unstakeRequests
            unstakeRequests[unstakeRequestsRear++] = lpRequest;
        }

        // create unstake event
        if (networkId == 0 || networkId == 1) {
            liquidStakingContract.createUnstakeRequest( lpReward + leftRewards);
        } else if (networkId == 2) {
            liquidStakingContract.unstake(lpReward + leftRewards);
        }

        // update stTokenRewardTime
        lastStTokenDistributeTime = block.timestamp;

        emit Unstake(lpReward + leftRewards);
    }

    /**
     * @dev stake function for only lp pool
     */
    function stakeLp() external onlyLpPool payable {
        // stake 
        liquidStakingContract.stake{value : msg.value}();
        emit Stake(uint128(msg.value));
    }

    /**
     * @dev unstake function for only lp pool
     */
   function unstakeLp(uint128 _requestAmount) external onlyLpPool {
        // create unstake event
        if (networkId == 0 || networkId == 1) {
            liquidStakingContract.createUnstakeRequest(_requestAmount);
        } else if (networkId == 2) {
            liquidStakingContract.unstake(_requestAmount);
        }

        // create unstake request for LPs
        UnstakeRequest memory lpRequest = UnstakeRequest(address(lpPoolContract), 3,0,0, _requestAmount);
       
        // push request to unstakeRequests
        unstakeRequests[unstakeRequestsRear++] = lpRequest;
        unstakeRequestAmount += _requestAmount;

        emit Unstake(_requestAmount);
    }

    /**
     * @dev claim and split unstaked amount
     */
    function claimAndSplitUnstakedAmount() external {
         // claim first
        if (networkId == 0 || networkId == 1) {
            liquidStakingContract.claim();
        } else if (networkId == 2) {
            liquidStakingContract.claim(address(this));
        }

        uint32 front = unstakeRequestsFront;
        uint32 rear = unstakeRequestsRear;
        uint32 count = 0;
        require(address(this).balance >= totalClaimableAmount , "InviCore: Not enough amount");
        for (uint32 i = front ; i <  rear; i++) {
            UnstakeRequest memory request = unstakeRequests[i];
            if (request.amount > address(this).balance - totalClaimableAmount) {
                break;
            }
            count++;
            
            // delete if have error in unstake request
            if (request.recipient == 0x0000000000000000000000000000000000000000) {
                delete unstakeRequests[unstakeRequestsFront++];
                continue;
            }
            // check request type (0: user, 1: LP, 2: INVI staker)
            uint32 requestType = request.requestType;
            uint128 amount = request.amount;
            address recipient = request.recipient;
            
            // remove first element of unstakeRequests
            delete unstakeRequests[unstakeRequestsFront++];

            // update unstakeRequestAmount
            unstakeRequestAmount -= amount;
            // if normal user
            if (requestType == 0) {
                claimableAmount[recipient] += amount;
                totalClaimableAmount += amount;
            } 
            // if lp pool
            else if (requestType == 1) {
                lpPoolContract.distributeNativeReward{value : amount }();
            } 
            // if invi token stake
            else if (requestType == 2) {
                inviTokenStakeContract.distributeNativeReward{value : amount }();
            }
            // if lp pool unstake 
            else if (requestType == 3) {
                lpPoolContract.receiveUnstaked{ value: amount }();
            }
        }

        // update last send unstaked amount time
        lastClaimAndSplitUnstakedAmountTime = block.timestamp;
    } 

    /**
     * @dev claim unstaked amount for user
     */
    function claimUnstaked() external {
        require(claimableAmount[msg.sender] > 0, "InviCore: No claimable amount");
        uint128 amount = claimableAmount[msg.sender];
        totalClaimableAmount -= amount;
        claimableAmount[msg.sender] = 0;
        (bool sent, ) = msg.sender.call{value : amount }("");
        require(sent, "InviCore: Failed to send coin");
    }
    
    //====== utils function ======//
    /**
     * @dev verify if stake info is correct
     * @param _stakeInfo stake info of user
     * @param _slippage slippage of user
     * @param _user user address
     * @param _sendAmount amount of user send
     */
    function _verifyStakeInfo(StakeInfo memory _stakeInfo, uint32 _slippage, address _user, uint128 _sendAmount) private view {
        // verify msg.sender
        require(_stakeInfo.user == _user, "InviCore: Invalid user");
        
        // verify principal amount
        require(_stakeInfo.principal == _sendAmount, "InviCore: Invalid principal amount");

        // verify lockPeriod
        uint256 minLockPeriod = getLockPeriod(_stakeInfo.leverageRatio);
        require(_stakeInfo.lockPeriod >= minLockPeriod, "InviCore: lock period should be bigger than min lock period");

        //verify lockStart & lockEnd
        uint256 today = block.timestamp - (block.timestamp % 86400);
        require(_stakeInfo.lockStart >= today && _stakeInfo.lockStart <= today + 86400, "InviCore: Invalid lock start time");
        require(_stakeInfo.lockEnd - _stakeInfo.lockStart == _stakeInfo.lockPeriod, "InviCore: Invalid lock end time");

        // verify lentAmount
        uint128 lentAmount = _stakeInfo.principal * (_stakeInfo.leverageRatio - 1 * LEVERAGE_UNIT) / LEVERAGE_UNIT;
        require(lentAmount <= lpPoolContract.getMaxLentAmount(), "InviCore: cannot lend more than max lent amount");

        // verify protocol fee
        uint128 minProtocolFee = _stakeInfo.protocolFee * (100 * SLIPPAGE_UNIT- _slippage) / (SLIPPAGE_UNIT* 100);
        uint128 maxProtocolFee = _stakeInfo.protocolFee * (100 * SLIPPAGE_UNIT + _slippage) / (SLIPPAGE_UNIT* 100);
        uint128 protocolFee = getProtocolFee(lentAmount, _stakeInfo.leverageRatio);
        require(minProtocolFee <= protocolFee, "InviCore: Invalid protocol fee");
        require(maxProtocolFee >= protocolFee, "InviCore: Invalid protocol fee");
    }

    receive () external payable {}

    fallback () external payable {}
}