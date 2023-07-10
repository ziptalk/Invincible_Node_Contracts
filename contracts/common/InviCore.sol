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
import "../interfaces/external/ILiquidStaking.sol";

/*
network Ids
- bifrost: 0
- evmos: 1
- klaytn: 2
*/

contract InviCore is Initializable, OwnableUpgradeable {
    //------Contracts and Addresses------//
    IERC20 public stToken;
    StakeNFT public stakeNFTContract;
    LiquidityProviderPool public lpPoolContract;
    InviTokenStake public inviTokenStakeContract;
    ILiquidStaking public liquidStakingContract;
    uint8 public networkId;

    //------events------//
    event Stake(uint128 indexed amount);
    event Unstake(uint128 indexed amount);
    event SendUnstakedAmount(uint32 indexed counts);

    
    //------reward related------//
    uint32 public stakingAPR;
    uint32 private decreaseRatio;
    uint32 private increaseRatio;
    uint32 public lpPoolRewardPortion;
    uint32 public inviTokenStakeRewardPortion;

    //------stake related------//
    mapping(address => uint) public userStakedAmount;
    uint256 public latestStakeBlock;

    //------unstake related------//
    //UnstakeRequest[] public unstakeRequests;
    mapping (uint32 => UnstakeRequest) public unstakeRequests;

    uint32 public unstakeRequestsFront;
    uint32 public unstakeRequestsRear;
    uint128 public unstakeRequestAmount;
    uint128 public requireTransferAmount;
    mapping (uint32 => uint256) public nftUnstakeTime;
    mapping (address => uint128) public claimableAmount;


    //------other variable------// 
    address[] public userList;
    uint32 public slippage;
    uint256 public lastStTokenDistributeTime;
    uint256 public lastSendUnstakedAmountTime;
    uint128 public totalClaimableAmount;
    

    //======initializer======//
    function initialize(address _stTokenAddr, address _liquidStakingAddr, uint8 _networkId) initializer public {
        __Ownable_init();
        stToken = IERC20(_stTokenAddr);
        liquidStakingContract = ILiquidStaking(_liquidStakingAddr);

        slippage = 5 * SLIPPAGE_UNIT;
        decreaseRatio = 10 * REWARD_ERROR_UNIT;
        increaseRatio = 5 * REWARD_ERROR_UNIT;
        stakingAPR = 10 * APR_UNIT;
        lpPoolRewardPortion = 700;
        inviTokenStakeRewardPortion = REWARD_PORTION_TOTAL_UNIT - lpPoolRewardPortion;
        
        latestStakeBlock = block.number;
        networkId = _networkId;

        unstakeRequestsFront = 0;
        unstakeRequestsRear = 0;
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
        lpPoolContract = LiquidityProviderPool(_lpPoolAddr);
    }

    function setInviTokenStakeContract(address _inviTokenStakeAddr) external onlyOwner {
        inviTokenStakeContract = InviTokenStake(_inviTokenStakeAddr);
    }

    function setStTokenContract(address _stTokenAddr) external onlyOwner {
        stToken = IERC20(_stTokenAddr);
    }
    

    //====== getter functions ======//
    // get stake info by principal & leverageRatio variables
    function getStakeInfo(address _account, uint128 _principal, uint32 _leverageRatio, uint256 _lockPeriod) public view returns(StakeInfo memory)  {
        
        uint256 lockPeriod = getLockPeriod(_leverageRatio);
        // if lock period is less than minimum lock period, set lock period to minimum lock period
        if (lockPeriod < _lockPeriod) {
            lockPeriod = _lockPeriod;
        } 
        uint128 lentAmount = _principal * _leverageRatio / LEVERAGE_UNIT- _principal;
        require(lentAmount <= lpPoolContract.getMaxLentAmount(), ERROR_EXCEED_LENT_AMOUNT);
        
        uint128 protocolFee = getProtocolFee(lentAmount, _leverageRatio);
        uint256 lockStart = block.timestamp;
        uint256 lockEnd = block.timestamp + lockPeriod;
        uint128 stakedAmount = getStakedAmount(_principal, _leverageRatio);

        StakeInfo memory stakeInfo = StakeInfo(_account,_leverageRatio,_leverageRatio, protocolFee, _principal, stakedAmount, lockPeriod, lockStart, lockEnd, false);
        
        return stakeInfo;
    }

    // return expected reward(_amount == principal + lentAmount)
    function getExpectedReward(uint128 _amount, uint256 _lockPeriod) public view returns (uint) {
        return ExpectedReward(_amount, _lockPeriod, stakingAPR);
    }

    // return lock period by amount & leverage ratio
    function getLockPeriod(uint32 _leverageRatio) public pure returns (uint) {
        return LockPeriod(_leverageRatio);
    }

    // return protocol fee by amount & leverage ratio
    function getProtocolFee(uint128 _lentAmount, uint32 _leverageRatio) public view returns (uint128) {
        uint128 totalLiquidity = lpPoolContract.getTotalLiquidity();
        return ProtocolFee(_lentAmount, _leverageRatio, totalLiquidity);
    }
    
    // return total Liquidity from LP Pool
    function getTotalLiquidity() public view returns (uint) {
        return lpPoolContract.getTotalLiquidity();
    }

    // return staked amount
    function getStakedAmount(uint128 _amount, uint32 _leverageRatio) public pure returns (uint128) {
        return StakedAmount(_amount, _leverageRatio);
    }

    function getUnstakeRequestsLength() public view returns (uint32) {
        return unstakeRequestsRear - unstakeRequestsFront;
    }
    function getTotalStakedAmount() public view returns (uint128) {
        uint128 totalStakedAmount = stakeNFTContract.totalStakedAmount() + lpPoolContract.totalStakedAmount() - lpPoolContract.totalLentAmount();
        return totalStakedAmount;
    }

    function getStTokenBalance() public view returns (uint) {
        return stToken.balanceOf(address(this));
    }
    

    //====== setter functions ======//

    // set staking ARP function
    function setStakingAPR(uint32 _stakingAPR) external onlyOwner {
        stakingAPR = _stakingAPR;
    }

    // set decrease ratio for min reward
    function setDecreaseRatio(uint32 _decreaseRatio) external onlyOwner {
        decreaseRatio = _decreaseRatio;
    }

    // set increase ratio from max reward
    function setIncreaseRatio(uint32 _increaseRatio) external onlyOwner {
        increaseRatio = _increaseRatio;
    }

    // set sliipage function
    function setSlippage(uint32 _slippage) external onlyOwner {
        slippage = _slippage;
    }

     function setLatestStakeBlock (uint256 _latestStakeBlock) external onlyOwner {
        latestStakeBlock = _latestStakeBlock;
    }

    // set reward portion
    function _setRewardPortion(uint32 _lpPoolRewardPortion, uint32 _inviTokenStakeRewardPortion) external onlyOwner {
        require (_lpPoolRewardPortion + _inviTokenStakeRewardPortion == REWARD_PORTION_TOTAL_UNIT, ERROR_SET_REWARD_PORTION);
        lpPoolRewardPortion = _lpPoolRewardPortion;
        inviTokenStakeRewardPortion = _inviTokenStakeRewardPortion;
    }

    //====== service functions ======//

    fallback() payable external {}
    receive() payable external {}
    

    // stake native coin
    function stake(uint128 _principal, uint32 _leverageRatio, uint256 _lockPeriod,uint32 _slippage) external payable returns (uint) {
         // get stakeInfo
        StakeInfo memory _stakeInfo = getStakeInfo(msg.sender, _principal, _leverageRatio, _lockPeriod);

        // verify given stakeInfo
        _verifyStakeInfo(_stakeInfo, _slippage, msg.sender, uint128(msg.value));

        // stake using bfcLiquidStaking
        liquidStakingContract.stake{value : _stakeInfo.principal}();

        // mint StakeNFT Token by stake info
        uint32 nftId = stakeNFTContract.mintNFT(_stakeInfo);

        //update stakeAmount info
        uint128 lentAmount = _stakeInfo.stakedAmount - _stakeInfo.principal;
        uint128 totalLentAmount = lpPoolContract.totalLentAmount() + lentAmount;
        lpPoolContract.setTotalLentAmount(totalLentAmount);
        userList.push(msg.sender);

        emit Stake(_stakeInfo.principal);
        return nftId;
    }

    // unStake native coin
    function repayNFT(uint32 _nftTokenId) external {
        // verify NFT
        require(stakeNFTContract.isOwner(_nftTokenId, msg.sender), ERROR_NOT_OWNED_NFT);
        require(stakeNFTContract.isUnlock(_nftTokenId), ERROR_NOT_UNLOCKED_NFT);

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

        // set stakeAmount info
        stakeNFTContract.setTotalStakedAmount(stakeNFTContract.totalStakedAmount() - stakeInfo.stakedAmount);

        // create unstake request for user 
        UnstakeRequest memory request = UnstakeRequest(msg.sender, _nftTokenId, 0, stakeInfo.protocolFee, stakeInfo.principal + userReward);
       
       

        //push request to unstakeRequests
        unstakeRequests[unstakeRequestsRear++] = request;
        
        //unstakeRequestsRear = enqueueUnstakeRequests(unstakeRequests, request, unstakeRequestsRear);
        if (lpPoolReward != 0) {
            //unstakeRequestsRear = enqueueUnstakeRequests(unstakeRequests, lpRequest, unstakeRequestsRear);
            // create unstake request for LPs
            UnstakeRequest memory lpRequest = UnstakeRequest(address(lpPoolContract),1, 0, 0, lpPoolReward);
            unstakeRequests[unstakeRequestsRear++] = lpRequest;
        }
        if (inviTokenStakeReward != 0) {
            // create unstake request for INVI stakers
            UnstakeRequest memory inviStakerRequest = UnstakeRequest(address(inviTokenStakeContract),2,0, 0, inviTokenStakeReward);
            //unstakeRequestsRear = enqueueUnstakeRequests(unstakeRequests, inviStakerRequest, unstakeRequestsRear);
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

        // update nftUnstakeTime
        nftUnstakeTime[_nftTokenId] = block.timestamp;
        emit Unstake(stakeInfo.principal + userReward + lpPoolReward + inviTokenStakeReward);
    }

    // periodic reward distribution, update
    function distributeStTokenReward() external {
        // get total staked amount
        uint128 totalStakedAmount = getTotalStakedAmount();
        require(stToken.balanceOf(address(this)) > totalStakedAmount , ERROR_NO_REWARD);
        // get total rewards
        uint128 totalReward = uint128(stToken.balanceOf(address(this))) - totalStakedAmount;
       
        
        // check rewards 
        uint128 nftReward = totalReward * stakeNFTContract.totalStakedAmount() / totalStakedAmount;
        uint128 lpReward = (totalReward - nftReward) * lpPoolRewardPortion / REWARD_PORTION_TOTAL_UNIT;
        uint128 inviStakerReward = totalReward - nftReward - lpReward;

         // create unstake event
        if (networkId == 0 || networkId == 1) {
            liquidStakingContract.createUnstakeRequest(nftReward + lpReward + inviStakerReward);
        } else if (networkId == 2) {
            liquidStakingContract.unstake(nftReward + lpReward + inviStakerReward);
        }

        // update NFT reward
        uint128 leftRewards =  stakeNFTContract.updateReward(nftReward);

        if (lpReward + leftRewards > 0) {
           // create unstake request for LPs
            UnstakeRequest memory lpRequest = UnstakeRequest(address(lpPoolContract),1,0, 0, lpReward + leftRewards);
            // push request to unstakeRequests
            unstakeRequests[unstakeRequestsRear++] = lpRequest;
        }
        if (inviStakerReward > 0) {
            // create unstake request for INVI stakers
            UnstakeRequest memory inviStakerRequest = UnstakeRequest(address(inviTokenStakeContract), 2,0,0,inviStakerReward);
            //unstakeRequestsRear++;
            unstakeRequests[unstakeRequestsRear++] = inviStakerRequest;
        }
      
        
        //unstakeRequestsRear = enqueueUnstakeRequests(unstakeRequests, lpRequest, unstakeRequestsRear);
        //unstakeRequestsRear = enqueueUnstakeRequests(unstakeRequests, inviStakerRequest, unstakeRequestsRear);

        // create unstake event
        if (networkId == 0 || networkId == 1) {
            liquidStakingContract.createUnstakeRequest( lpReward + leftRewards + inviStakerReward);
        } else if (networkId == 2) {
            liquidStakingContract.unstake(lpReward + leftRewards + inviStakerReward);
        }

        // update stTokenRewardTime
        lastStTokenDistributeTime = block.timestamp;

        emit Unstake(lpReward + inviStakerReward);
    }

    function stakeLp() external onlyLpPool payable {
        // stake 
        liquidStakingContract.stake{value : msg.value}();
        emit Stake(uint128(msg.value));
    }

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

    // send unstaked amount to unstakeRequest applicants
    function sendUnstakedAmount() external {
         // claim first
        if (networkId == 0 || networkId == 1) {
            liquidStakingContract.claim();
        } else if (networkId == 2) {
            liquidStakingContract.claim(address(this));
        }

        uint32 front = unstakeRequestsFront;
        uint32 rear = unstakeRequestsRear;
        uint32 count = 0;
        require(address(this).balance >= totalClaimableAmount, "Not enough amount");
        for (uint32 i = front ; i <  rear; i++) {
            if (unstakeRequests[i].amount > address(this).balance - totalClaimableAmount) {
                break;
            }
            count++;
            
            // delete if have error in unstake request
            if (unstakeRequests[i].recipient == 0x0000000000000000000000000000000000000000) {
                delete unstakeRequests[unstakeRequestsFront++];
                continue;
            }
            // check request type (0: user, 1: LP, 2: INVI staker)
            uint32 requestType = unstakeRequests[i].requestType;
            uint128 amount = unstakeRequests[i].amount;
            address recipient = unstakeRequests[i].recipient;
            
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
                lpPoolContract.receiveUnstaked{ value: amount}();
            }
        }

        // update last send unstaked amount time
        lastSendUnstakedAmountTime = block.timestamp;

        emit SendUnstakedAmount(count);

    } 

    // claim unstaked amount
    function claimUnstaked() external {
        require(claimableAmount[msg.sender] > 0, ERROR_NO_CLAIMABLE_AMOUNT);
        uint128 amount = claimableAmount[msg.sender];
        totalClaimableAmount -= amount;
        claimableAmount[msg.sender] = 0;
        (bool sent, ) = msg.sender.call{value : amount }("");
        require(sent, ERROR_FAIL_SEND);
    }
    
    //====== utils function ======//
    // verify stakeInfo is proper
    function _verifyStakeInfo(StakeInfo memory _stakeInfo, uint32 _slippage, address _user, uint128 _sendAmount) private view {
        
        // verify msg.sender
        require(_stakeInfo.user == _user, ERROR_INVALID_STAKE_INFO);
        
        // verify principal amount
        require(_stakeInfo.principal == _sendAmount, ERROR_INVALID_STAKE_INFO);

        // verify lockPeriod
        uint256 minLockPeriod = getLockPeriod(_stakeInfo.leverageRatio);
        require(_stakeInfo.lockPeriod >= minLockPeriod, ERROR_INVALID_STAKE_INFO);

        //verify lockStart & lockEnd
        uint256 today = block.timestamp - (block.timestamp % 86400);
        require(_stakeInfo.lockStart >= today && _stakeInfo.lockStart <= today + 86400, ERROR_INVALID_STAKE_INFO);
        require(_stakeInfo.lockEnd - _stakeInfo.lockStart == _stakeInfo.lockPeriod, ERROR_INVALID_STAKE_INFO);

        // verify lentAmount
        uint128 lentAmount = _stakeInfo.principal * (_stakeInfo.leverageRatio - 1 * LEVERAGE_UNIT) / LEVERAGE_UNIT;
        require(lentAmount <= lpPoolContract.getMaxLentAmount(), ERROR_TOO_MUCH_LENT);

        // verify protocol fee
        uint128 minProtocolFee = _stakeInfo.protocolFee * (100 * SLIPPAGE_UNIT- _slippage) / (SLIPPAGE_UNIT* 100);
        uint128 maxProtocolFee = _stakeInfo.protocolFee * (100 * SLIPPAGE_UNIT + _slippage) / (SLIPPAGE_UNIT* 100);
        uint128 protocolFee = getProtocolFee(lentAmount, _stakeInfo.leverageRatio);
        require(minProtocolFee <= protocolFee, ERROR_INVALID_STAKE_INFO);
        require(maxProtocolFee >= protocolFee, ERROR_INVALID_STAKE_INFO);
    }
}