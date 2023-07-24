// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
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

    bool private _setStakeNFTContract;
    bool private _setLpPoolContract;
    bool private _setInviTokenStakeContract;
    bool private _locked; // for reentrancy guard
    uint32 private _networkId;

    //------reward related------//
    uint32 public lpPoolRewardPortion;
    uint32 public inviTokenStakeRewardPortion;
    uint128 public totalNFTRewards;
    //------stake related------//
    uint32 public stakingAPR;
    uint128 public minStakeAmount;
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
    
    modifier nonReentrant() {
        require(!_locked, "Reentrant call detected");
        _locked = true;
        _;
        _locked = false;
    }
    
    //======initializer======//
    /**
     * @dev Initializes the contract.
     * @param _stTokenAddr The address of the ST token contract.
     * @param _liquidStakingAddr The address of the Liquid Staking contract.
     * @param _network The network ID.
     */
    function initialize(address _stTokenAddr, address _liquidStakingAddr, uint8 _network) initializer public {
        __Ownable_init();
        stToken = IERC20(_stTokenAddr);
        liquidStakingContract = ILiquidStaking(_liquidStakingAddr);

        slippage = 5 * SLIPPAGE_UNIT;
        stakingAPR = 10 * APR_UNIT;
        lpPoolRewardPortion = 700;
        inviTokenStakeRewardPortion = REWARD_PORTION_TOTAL_UNIT - lpPoolRewardPortion;
        
        _networkId = _network; // cannot change

        unstakeRequestsFront = 0;
        unstakeRequestsRear = 0;
        stTokenDistributePeriod = 1 minutes; // test: 1min / main: 1hour

        _locked = false;
        minStakeAmount = 10**15; // 0.001
    }

    //====== modifier functions ======//
    modifier onlyLpPool {
        require(msg.sender == address(lpPoolContract), "InviCore: caller is not the lpPool contract");
        _;
    }

    //====== getter functions ======//
    /**
     * @notice Retrieves the stake information for the provided account, principal amount, leverage ratio, and lock period.
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

        StakeInfo memory stakeInfo = StakeInfo({
            user: _account,
            lockPeriod: lockPeriod, 
            lockStart: lockStart, 
            lockEnd: lockEnd, 
            protocolFee: protocolFee, 
            principal: _principal, 
            stakedAmount: stakedAmount, 
            originalLeverageRatio: _leverageRatio,
            leverageRatio: _leverageRatio, 
            isLent: false
        });
        
        return stakeInfo;
    }

    /**
     * @notice Retrieves the expected reward for the provided amount and lock period.
     * @param _amount The total amount (principal + lent amount).
     * @param _lockPeriod The lock period.
     * @return reward The expected reward.
     */
    function getExpectedReward(uint128 _amount, uint256 _lockPeriod) public view returns (uint) {
        return ExpectedReward(_amount, _lockPeriod, stakingAPR);
    }

    /**
     * @notice Retrieves the lock period for the provided leverage ratio.
     * @param _leverageRatio The leverage ratio.
     * @return lockPeriod The lock period.
     */
    function getLockPeriod(uint32 _leverageRatio) public pure returns (uint) {
        return LockPeriod(_leverageRatio);
    }

    /**
     * @notice Retrieves the protocol fee for the provided lent amount and leverage ratio.
     * @param _lentAmount The lent amount.
     * @param _leverageRatio The leverage ratio.
     * @return protocolFee The protocol fee.
     */
    function getProtocolFee(uint128 _lentAmount, uint32 _leverageRatio) public view returns (uint128) {
        uint128 totalLiquidity = lpPoolContract.getTotalLiquidity();
        return ProtocolFee(_lentAmount, _leverageRatio, totalLiquidity);
    }
    
    /**
     * @notice Retrieves the total liquidity from the LP Pool.
     * @return liquidity The total liquidity.
     */
    function getTotalLiquidity() public view returns (uint) {
        return lpPoolContract.getTotalLiquidity();
    }

    /**
     * @notice Retrieves the staked amount for the provided principal amount and leverage ratio.
     * @param _amount The principal amount.
     * @param _leverageRatio The leverage ratio.
     * @return stakedAmount The staked amount.
     */
    function getStakedAmount(uint128 _amount, uint32 _leverageRatio) public pure returns (uint128) {
        return StakedAmount(_amount, _leverageRatio);
    }

     /**
     * @notice Retrieves the length of the unstake requests array.
     * @return length The length of the unstake requests array.
     */
    function getUnstakeRequestsLength() public view returns (uint32) {
        return unstakeRequestsRear - unstakeRequestsFront;
    }

    /**
     * @notice Retrieves the total staked amount.
     * @return totalStakedAmount The total staked amount.
     */
    function getTotalStakedAmount() public view returns (uint128) {
        uint128 totalStakedAmount = stakeNFTContract.totalStakedAmount() + lpPoolContract.totalStakedAmount() - lpPoolContract.totalLentAmount();
        return totalStakedAmount;
    }

    /**
     * @notice Retrieves the balance of ST tokens held by the contract.
     * @return balance The ST token balance.
     */
    function getStTokenBalance() public view returns (uint) {
        return stToken.balanceOf(address(this));
    }
    

    //====== setter functions ======//
    /**
     * @notice Sets the address of the StakeNFT contract.
     * @dev can be called only once by the owner.
     * @param _stakeNFTAddr The address of the StakeNFT contract.
    */
    function setStakeNFTContract(address _stakeNFTAddr) external onlyOwner {
        require(!_setStakeNFTContract, "InviCore: stakeNFTContract is already set");
        stakeNFTContract = StakeNFT(_stakeNFTAddr);
        _setStakeNFTContract = true;
    }

    /**
     * @notice Sets the address of the LiquidityProviderPool contract.
     * @dev can be called only once by the owner.
     * @param _lpPoolAddr The address of the LiquidityProviderPool contract.
     */
    function setLpPoolContract(address _lpPoolAddr) external onlyOwner {
        require(!_setLpPoolContract, "InviCore: lpPoolContract is already set");
        lpPoolContract = LiquidityProviderPool(_lpPoolAddr);
        _setLpPoolContract = true;
    }

    /**
     * @notice Sets the address of the InviTokenStake contract.
     * @dev can be called only once by the owner.
     * @param _inviTokenStakeAddr The address of the InviTokenStake contract.
     */
    function setInviTokenStakeContract(address _inviTokenStakeAddr) external onlyOwner {
        require(!_setInviTokenStakeContract, "InviCore: inviTokenStakeContract is already set");
        inviTokenStakeContract = InviTokenStake(_inviTokenStakeAddr);
        _setInviTokenStakeContract = true;
    }

    /**
     * @notice Sets the address of the ST token contract.
     * @dev Only the owner can call this function.
     * @param _stTokenAddr The address of the ST token contract.
     */
    function setStTokenContract(address _stTokenAddr) external onlyOwner {
        stToken = IERC20(_stTokenAddr);
    }

    /**
     * @notice Sets the address of the Liquid Staking contract.
     * @dev Only the owner can call this function.
     * @param _liquidStakingAddr The address of the Liquid Staking contract.
     */
    function setLiquidStakingContract(address _liquidStakingAddr) external onlyOwner {
        liquidStakingContract = ILiquidStaking(_liquidStakingAddr);
    }
    /**
     * @notice Sets the staking APR (Annual Percentage Rate).
     * @param _stakingAPR The staking APR.
     */
    function setStakingAPR(uint32 _stakingAPR) external onlyOwner {
        stakingAPR = _stakingAPR;
    }

    /**
     * @notice Sets the slippage for protocol fees.
     * @param _slippage The slippage.
     */
    function setSlippage(uint32 _slippage) external onlyOwner {
        slippage = _slippage;
    }

     /**
     * @notice Sets the reward portion for LP pool and INVI token stake.
     * @param _lpPoolRewardPortion The reward portion for the LP pool.
     * @param _inviTokenStakeRewardPortion The reward portion for the INVI token stake.
     */
    function _setRewardPortion(uint32 _lpPoolRewardPortion, uint32 _inviTokenStakeRewardPortion) external onlyOwner {
        require (_lpPoolRewardPortion + _inviTokenStakeRewardPortion == REWARD_PORTION_TOTAL_UNIT, "InviCore: invalid reward portion");
        lpPoolRewardPortion = _lpPoolRewardPortion;
        inviTokenStakeRewardPortion = _inviTokenStakeRewardPortion;
    }

     /**
     * @notice Set the minimum stake amount
     * @param _minStakeAmount The new minimum stake amount.
     */
    function setMinStakeAmount(uint128 _minStakeAmount) external onlyOwner {
        minStakeAmount = _minStakeAmount;
    }

    //====== service functions ======//
    /**
     * @notice Stakes native coins by minting an NFT and staking the principal amount.
     * @dev prevents reentrancy attack
     * @param _principal The principal amount to stake.
     * @param _leverageRatio The leverage ratio.
     * @param _lockPeriod The lock period.
     * @param _feeSlippage The slippage for the protocol fee.
     * @return nftId The ID of the minted NFT.
     */
    function stake(uint128 _principal, uint32 _leverageRatio, uint256 _lockPeriod,uint32 _feeSlippage) external payable nonReentrant returns (uint) {
        require(msg.value >= minStakeAmount, "InviCore: amount is less than minimum stake amount");
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
     * @notice return NFT and request unstake for user
     * @dev prevents reentrancy attack
     * @param _nftTokenId The ID of the NFT to unstake.
     */
    function repayNFT(uint32 _nftTokenId) external nonReentrant {
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
        // get user reward without protocol fee
        uint128 userReward = rewardAmount * (PROTOCOL_FEE_UNIT * 100 - stakeInfo.protocolFee) / (PROTOCOL_FEE_UNIT * 100);
        // get stakers'(INVI staker, LPs) reward
        uint128 stakersReward = rewardAmount - userReward;
        // split reward to LPs and INVI stakers
        uint128 lpPoolReward = stakersReward *  lpPoolRewardPortion / REWARD_PORTION_TOTAL_UNIT;
        uint128 inviTokenStakeReward = stakersReward * inviTokenStakeRewardPortion / REWARD_PORTION_TOTAL_UNIT;
        // update totalNFTReward
        totalNFTRewards -= rewardAmount;
        // create unstake request for user (principal + reward)
        UnstakeRequest memory request = UnstakeRequest({
            recipient: msg.sender,
            fee: stakeInfo.protocolFee, 
            amount: stakeInfo.principal + userReward, 
            requestType: 0, 
            nftId: _nftTokenId 
        });

        //push request to unstakeRequests
        unstakeRequests[unstakeRequestsRear++] = request;
        
        if (lpPoolReward > 0) {
            // create unstake request for LPs
            UnstakeRequest memory lpRequest = UnstakeRequest({
                recipient: address(lpPoolContract),
                fee: 0, 
                amount: lpPoolReward, 
                requestType: 1, 
                nftId: 0 
            });
            unstakeRequests[unstakeRequestsRear++] = lpRequest;
        }
        if (inviTokenStakeReward > 0) {
            // create unstake request for INVI stakers
            UnstakeRequest memory inviStakerRequest = UnstakeRequest({
                recipient: address(inviTokenStakeContract),
                fee: 0, 
                amount: inviTokenStakeReward, 
                requestType: 2,
                nftId: 0
            });
            unstakeRequests[unstakeRequestsRear++] = inviStakerRequest;
        }

        //burn NFT & delete stakeInfo
        stakeNFTContract.deleteStakeInfo(_nftTokenId);
        stakeNFTContract.deleteNFTOwnership(msg.sender, _nftTokenId);
        stakeNFTContract.burnNFT(_nftTokenId);  

        // create unstake event
        if (_networkId == 0 || _networkId == 1) {
            liquidStakingContract.createUnstakeRequest(stakeInfo.principal + userReward + lpPoolReward + inviTokenStakeReward);
        } else if (_networkId == 2) {
            liquidStakingContract.unstake(stakeInfo.principal + userReward + lpPoolReward + inviTokenStakeReward);
        }

        // update unstake request amount
        unstakeRequestAmount += stakeInfo.principal + userReward + lpPoolReward + inviTokenStakeReward;
        emit Unstake(stakeInfo.principal + userReward + lpPoolReward + inviTokenStakeReward);
    }

    /**
     * @notice distribute reward to stakers / lps / inviStakers
     * @dev prevents reentrancy attack
     */
    function distributeStTokenReward() external nonReentrant {
        require(stTokenDistributePeriod + lastStTokenDistributeTime < block.timestamp, "InviCore: reward distribution period not passed");
        // get total staked amount
        uint128 totalStakedAmount = getTotalStakedAmount();
        uint256 stTokenBalance = stToken.balanceOf(address(this));
        require(stTokenBalance > totalStakedAmount + totalNFTRewards , "InviCore: not enough reward");
        // get total rewards
        uint256 totalReward = stTokenBalance - totalStakedAmount - totalNFTRewards;
       
        // check nft rewards 
        uint256 nftReward = totalReward * stakeNFTContract.totalStakedAmount() / totalStakedAmount;

        // update NFT reward
        uint128 leftRewards =  stakeNFTContract.updateReward(uint128(nftReward));
        totalNFTRewards += uint128(nftReward) - leftRewards;
        uint128 lpReward = uint128(totalReward) - uint128(nftReward) + leftRewards;

        // create unstake request for lps and invi stakers
        if (lpReward > 0) {
           // create unstake request for LPs
            UnstakeRequest memory lpRequest = UnstakeRequest({
                recipient: address(lpPoolContract),
                fee: 0, 
                amount: lpReward, 
                requestType: 1,
                nftId: 0
            });
            // push request to unstakeRequests
            unstakeRequests[unstakeRequestsRear++] = lpRequest;

             // create unstake event
            if (_networkId == 0 || _networkId == 1) {
                liquidStakingContract.createUnstakeRequest(lpReward);
            } else if (_networkId == 2) {
                liquidStakingContract.unstake(lpReward);
            }
        }

        // update stTokenRewardTime
        lastStTokenDistributeTime = block.timestamp;
        emit Unstake(lpReward + leftRewards);
    }

    /**
     * @notice stake function for only lp pool
     * @dev prevents reentrancy attack
     * @dev only lp pool can call this function
     */
    function stakeLp() external payable onlyLpPool nonReentrant {
        // stake 
        liquidStakingContract.stake{value : msg.value}();
        emit Stake(uint128(msg.value));
    }

    /**
     * @notice unstake function for lp pool
     * @dev prevents reentrancy attack
     * @dev only lp pool can call this function
     */
   function unstakeLp(uint128 _requestAmount) external onlyLpPool nonReentrant{
        // create unstake event
        if (_networkId == 0 || _networkId == 1) {
            liquidStakingContract.createUnstakeRequest(_requestAmount);
        } else if (_networkId == 2) {
            liquidStakingContract.unstake(_requestAmount);
        }

        // create unstake request for LPs
        UnstakeRequest memory lpRequest = UnstakeRequest({
            recipient: address(lpPoolContract),
            fee: 0, 
            amount: _requestAmount, 
            requestType: 3,
            nftId: 0
        });
       
        // push request to unstakeRequests
        unstakeRequests[unstakeRequestsRear++] = lpRequest;
        unstakeRequestAmount += _requestAmount;

        emit Unstake(_requestAmount);
    }

    /**
     * @notice claim and split unstaked amount. 
     * @dev prevents reentrancy attack
     * @dev can be called by anyone. 
     */
    function claimAndSplitUnstakedAmount() external nonReentrant {
        // claim first
        if (_networkId == 0 || _networkId == 1) {
            liquidStakingContract.claim();
        } else if (_networkId == 2) {
            liquidStakingContract.claim(address(this));
        }

        uint32 front = unstakeRequestsFront;
        uint32 rear = unstakeRequestsRear;
        uint32 count = 0;
        uint256 balance = address(this).balance;
        require(balance >= totalClaimableAmount , "InviCore: Not enough amount");
        for (uint32 i = front; i < rear;) {
            UnstakeRequest memory request = unstakeRequests[i];
            if (request.amount > balance - totalClaimableAmount) {
                break;
            }
            count++;
            
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

            unchecked {i++;}
        }

        // update last send unstaked amount time
        lastClaimAndSplitUnstakedAmountTime = block.timestamp;
    }

    /**
     * @notice claim unstaked amount for user
     * @dev prevents reentrancy attack
     */
    function claimUnstaked() external nonReentrant {
        require(claimableAmount[msg.sender] > 0, "InviCore: No claimable amount");
        uint128 amount = claimableAmount[msg.sender];
        totalClaimableAmount -= amount;
        claimableAmount[msg.sender] = 0;
        (bool sent, ) = msg.sender.call{value : amount }("");
        require(sent, "InviCore: Failed to send coin");
    }
    
    //====== utils function ======//
    /**
     * @notice verify if stake info is correct
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

    // remove it later
    receive () external payable {}


    fallback () external payable {}
}