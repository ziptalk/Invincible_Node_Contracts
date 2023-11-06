// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./StakeNFT.sol";
import "./lib/Structs.sol";
import "hardhat/console.sol";
import "./LiquidityProviderPool.sol";
import "./InviTokenStake.sol";
import "./tokens/InviToken.sol";
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
    using Logics for uint256;
    using Logics for uint256;
    using Logics for uint32;
    //------Contracts / Addresses / Networks ------//
    IERC20 public stToken;
    InviToken public inviToken;
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
    uint256 public totalNFTRewards;
    //------stake related------//
    uint32 public stakingAPR;
    uint256 public minStakeAmount;
    //------unstake related------//
    uint32 public unstakeRequestsFront;
    uint32 public unstakeRequestsRear;
    uint256 public unstakeRequestAmount;
    uint256 public nftUnstakePeriod;
    //------other variable------// 
    uint32 public slippage;
    uint256 public totalClaimableAmount;
    uint256 public lastStTokenDistributeTime;
    uint256 public lastClaimAndSplitUnstakedAmountTime;
    uint256 public stTokenDistributePeriod;
    uint256 public totalStakedPure;
    
    //------Mappings------//
    mapping (uint32 => UnstakeRequest) public unstakeRequests;
    mapping (address => uint256) public claimableAmount;
    mapping (uint32 => uint256) public nftUnstakeTime;

    //------events------//
    event Stake(address indexed user, uint256 indexed amount);
    event Unstake(address indexed user, uint256 indexed amount);
    
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
    function initialize(address _stTokenAddr, address _inviTokenAddr, address _liquidStakingAddr, uint8 _network) initializer public {
        __Ownable_init();
        stToken = IERC20(_stTokenAddr);
        inviToken = InviToken(_inviTokenAddr);
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

        nftUnstakePeriod = 7 days; // main: 7days / test: 1 min
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
    function createStakeInfo(address _account, uint256 _principal, uint32 _leverageRatio, uint256 _lockPeriod) internal view returns(StakeInfo memory)  {
        // get lock period
        uint256 lockPeriod = getLockPeriod(_leverageRatio);
        // if provided lock period is less than minimum lock period, set lock period to minimum lock period
        if (lockPeriod < _lockPeriod) {
            lockPeriod = _lockPeriod;
        } 
        uint256 lockStart = block.timestamp; // get lock start time
        uint256 lockEnd = lockStart + lockPeriod; // get lock end time
        uint256 lentAmount = _principal * _leverageRatio / LEVERAGE_UNIT- _principal; // get lent amount
        require(lentAmount <= lpPoolContract.getMaxLentAmount(), "InviCore: exceeds max lent amount"); // verify lent amount
        uint256 stakedAmount = getStakedAmount(_principal, _leverageRatio); // get staked amount
        require(stakedAmount >= _principal, "InviCore: invalid staked amount");
        uint256 protocolFee = getProtocolFee(lentAmount, _leverageRatio); // get protocol fee

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
    function getExpectedReward(uint256 _amount, uint256 _lockPeriod) public view returns (uint) {
        uint256 expectedRewards = _amount.ExpectedReward( _lockPeriod, stakingAPR);
        return expectedRewards;
    }

    /**
     * @notice Retrieves the lock period for the provided leverage ratio.
     * @param _leverageRatio The leverage ratio.
     * @return lockPeriod The lock period.
     */
    function getLockPeriod(uint32 _leverageRatio) public pure returns (uint) {
        uint32 lockPeriod = _leverageRatio.LockPeriod();
        return lockPeriod;
    }

    /**
     * @notice Retrieves the protocol fee for the provided lent amount and leverage ratio.
     * @param _lentAmount The lent amount.
     * @param _leverageRatio The leverage ratio.
     * @return protocolFee The protocol fee.
     */
    function getProtocolFee(uint256 _lentAmount, uint32 _leverageRatio) public view returns (uint256) {
        uint256 totalLiquidity = lpPoolContract.getTotalLiquidity();
        uint256 protocolFee = _lentAmount.ProtocolFee(_leverageRatio, totalLiquidity);
        return protocolFee;
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
    function getStakedAmount(uint256 _amount, uint32 _leverageRatio) public pure returns (uint256) {
        uint256 stakedAmount = _amount.StakedAmount(_leverageRatio);
        return stakedAmount;
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
    function getTotalStakedAmount() public view returns (uint256) {
        uint256 totalStakedAmount = stakeNFTContract.totalStakedAmount() + lpPoolContract.totalStakedAmount() - lpPoolContract.totalLentAmount();
        return totalStakedAmount;
    }

    /**
     * @notice Retrieves the balance of ST tokens held by the contract.
     * @return balance The ST token balance.
     */
    function getStTokenBalance() public view returns (uint) {
        return stToken.balanceOf(address(this));
    }

    function getMaxLeverageRatio(uint256 _stakeAmount) public view returns (uint32) {
        uint256 maxLendAmount = lpPoolContract.getMaxLentAmount();
        uint256 maxLeverageRatio = (_stakeAmount + maxLendAmount) * LEVERAGE_UNIT / _stakeAmount ;
        if (maxLeverageRatio >  5 * LEVERAGE_UNIT) {
            maxLeverageRatio = 5 * LEVERAGE_UNIT;
        }
        return uint32(maxLeverageRatio);
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
    function setRewardPortion(uint32 _lpPoolRewardPortion, uint32 _inviTokenStakeRewardPortion) external onlyOwner {
        require (_lpPoolRewardPortion + _inviTokenStakeRewardPortion == REWARD_PORTION_TOTAL_UNIT, "InviCore: invalid reward portion");
        lpPoolRewardPortion = _lpPoolRewardPortion;
        inviTokenStakeRewardPortion = _inviTokenStakeRewardPortion;
    }

     /**
     * @notice Set the minimum stake amount
     * @param _minStakeAmount The new minimum stake amount.
     */
    function setMinStakeAmount(uint256 _minStakeAmount) external onlyOwner {
        minStakeAmount = _minStakeAmount;
    }

    function setNftUnstakePeriod(uint256 _nftUnstakePeriod) external onlyOwner {
        nftUnstakePeriod = _nftUnstakePeriod;
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
    function stake(uint256 _principal, uint32 _leverageRatio, uint256 _lockPeriod,uint32 _feeSlippage) external payable nonReentrant returns (uint) {
        require(msg.value >= minStakeAmount, "InviCore: amount is less than minimum stake amount");
        require(msg.value == _principal, "InviCore: amount is not equal to principal");
         // get stakeInfo
        StakeInfo memory _stakeInfo = createStakeInfo(msg.sender, _principal, _leverageRatio, _lockPeriod);

        // verify given stakeInfo
        _verifyStakeInfo(_stakeInfo, _feeSlippage, msg.sender, uint256(msg.value));

        // stake using bfcLiquidStaking
        liquidStakingContract.stake{value : _stakeInfo.principal}();

        // mint StakeNFT Token by stake info
        uint32 nftId = stakeNFTContract.mintNFT(_stakeInfo);

        //update stakeAmount info
        uint256 lentAmount = _stakeInfo.stakedAmount - _stakeInfo.principal;
        uint256 totalLentAmount = lpPoolContract.totalLentAmount() + lentAmount;
        lpPoolContract.setTotalLentAmount(totalLentAmount);

        totalStakedPure += msg.value;

        emit Stake(msg.sender, _stakeInfo.principal);
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
        require(!stakeNFTContract.isLocked(_nftTokenId), "InviCore: NFT is locked");
        require(!stakeNFTContract.isLent(_nftTokenId), "InviCore: NFT is lent");


        // get stakeInfo by nftTokenId
        StakeInfo memory stakeInfo = stakeNFTContract.getStakeInfo(_nftTokenId);

        // get lent amount
        uint256 lentAmount = stakeInfo.stakedAmount - stakeInfo.principal;
        lpPoolContract.setTotalLentAmount(lpPoolContract.totalLentAmount() - lentAmount);

        // get user reward amount including protocol fee
        uint256 rewardAmount = stakeNFTContract.rewardAmount(_nftTokenId);
        // get user reward without protocol fee
        uint256 userReward = rewardAmount * (PROTOCOL_FEE_UNIT * 100 - stakeInfo.protocolFee) / (PROTOCOL_FEE_UNIT * 100);
        // get stakers'(INVI staker, LPs) reward
        uint256 stakersReward = rewardAmount - userReward;
        // split reward to LPs and INVI stakers
        uint256 lpPoolReward = stakersReward *  lpPoolRewardPortion / REWARD_PORTION_TOTAL_UNIT;
        uint256 inviTokenStakeReward = stakersReward * inviTokenStakeRewardPortion / REWARD_PORTION_TOTAL_UNIT;
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

        // update nftUnstakeTime
        nftUnstakeTime[_nftTokenId] = block.timestamp + nftUnstakePeriod;
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

        //burn NFT
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
        emit Unstake(msg.sender, stakeInfo.principal + userReward + lpPoolReward + inviTokenStakeReward);
    }

    function boostUnlock(uint32 _nftId) external nonReentrant {
        require(stakeNFTContract.isOwner(_nftId, msg.sender), "InviCore: not owner of NFT");
        require(stakeNFTContract.isLocked(_nftId), "InviCore: NFT is already unlocked");
        require(!stakeNFTContract.isLent(_nftId), "InviCore: NFT is lent");
        (uint256 requiredAmount, uint256 currentTimestamp) = stakeNFTContract.getBoostUnlockAmount(_nftId);
        require(requiredAmount > 0, "InviCore: boost unlock amount is zero");

        // burn required amount from user
        //console.log("requiredAmount     : %s", requiredAmount / 10**18);
        //console.log("invitoken balance  : %s", inviToken.balanceOf(msg.sender) / 10**18);
        require(inviToken.balanceOf(msg.sender) >= requiredAmount, "InviCore: not enough INVI token");
        inviToken.burnToken(msg.sender, requiredAmount);
        
        // update unlock time
        stakeNFTContract.updateUnlockTimeWhenBoostUnlock(_nftId, currentTimestamp);
    }

    /**
     * @notice distribute reward to stakers / lps / inviStakers
     * @dev prevents reentrancy attack
     */
    function distributeStTokenReward() external nonReentrant {
        require(stTokenDistributePeriod + lastStTokenDistributeTime < block.timestamp, "InviCore: reward distribution period not passed");
        // get total staked amount
        uint256 totalStakedAmount = getTotalStakedAmount();
        require(totalStakedAmount > 0, "InviCore: total staked amount is zero");
        uint256 stTokenBalance = stToken.balanceOf(address(this));
        require(stTokenBalance > totalStakedAmount + totalNFTRewards , "InviCore: not enough reward");
        // get total rewards
        uint256 totalReward = stTokenBalance - totalStakedAmount - totalNFTRewards;

        // check nft rewards 
        uint256 nftReward = totalReward * stakeNFTContract.totalStakedAmount() / totalStakedAmount;
        
        // update NFT reward
        uint256 leftRewards =  stakeNFTContract.updateReward(uint256(nftReward));
      
        totalNFTRewards += uint256(nftReward) - leftRewards;
      
        uint256 lpReward = uint256(totalReward) - uint256(nftReward) + leftRewards;
   
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
            unstakeRequestAmount += lpReward;

             // create unstake event
            if (_networkId == 0 || _networkId == 1) {
                liquidStakingContract.createUnstakeRequest(lpReward);
            } else if (_networkId == 2) {
                liquidStakingContract.unstake(lpReward);
            }
        }

        // update stTokenRewardTime
        lastStTokenDistributeTime = block.timestamp;
        emit Unstake(msg.sender, lpReward + leftRewards);
    }

    /**
     * @notice stake function for only lp pool
     * @dev prevents reentrancy attack
     * @dev only lp pool can call this function
     */
    function stakeLp() external payable onlyLpPool nonReentrant {
        // stake 
        liquidStakingContract.stake{value : msg.value}();
        emit Stake(msg.sender, uint256(msg.value));
    }

    /**
     * @notice unstake function for lp pool
     * @dev prevents reentrancy attack
     * @dev only lp pool can call this function
     */
   function unstakeLp(uint256 _requestAmount) external onlyLpPool nonReentrant{
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

        emit Unstake(msg.sender, _requestAmount);
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
        for (uint32 i = front; i < rear; i++) {
            uint256 balance = address(this).balance;
            UnstakeRequest memory request = unstakeRequests[i];
            if (request.amount + totalClaimableAmount > balance) {
                break;
            }
            count++;
            
            // check request type (0: user, 1: LP, 2: INVI staker)
            uint32 requestType = request.requestType;
            uint256 amount = request.amount;
            address recipient = request.recipient;
            uint32 nftId = request.nftId;
            
            // remove first element of unstakeRequests
            delete unstakeRequests[unstakeRequestsFront++];

            // update unstakeRequestAmount
            unstakeRequestAmount -= amount;

            // if normal user
            if (requestType == 0) {
                nftUnstakeTime[nftId] = 0;
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

            //unchecked {i++;}
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
        uint256 amount = claimableAmount[msg.sender];
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
    function _verifyStakeInfo(StakeInfo memory _stakeInfo, uint32 _slippage, address _user, uint256 _sendAmount) private view {
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

        // verify leverage Ratio
        require(_stakeInfo.leverageRatio <= 5 * LEVERAGE_UNIT, "InviCore: Invalid leverage ratio");
        // verify lentAmount (leverage ratio)
        uint256 lentAmount = _stakeInfo.principal * (_stakeInfo.leverageRatio - 1 * LEVERAGE_UNIT) / LEVERAGE_UNIT;
        require(lentAmount <= lpPoolContract.getMaxLentAmount(), "InviCore: cannot lend more than max lent amount");

        // verify protocol fee
        uint256 minProtocolFee = _stakeInfo.protocolFee * (100 * SLIPPAGE_UNIT- _slippage) / (SLIPPAGE_UNIT* 100);
        uint256 maxProtocolFee = _stakeInfo.protocolFee * (100 * SLIPPAGE_UNIT + _slippage) / (SLIPPAGE_UNIT* 100);
        uint256 protocolFee = getProtocolFee(lentAmount, _stakeInfo.leverageRatio);
        require(minProtocolFee <= protocolFee, "InviCore: Invalid protocol fee");
        require(maxProtocolFee >= protocolFee, "InviCore: Invalid protocol fee");
    }

    // remove it later
    receive () external payable {}
    fallback () external payable {}
}