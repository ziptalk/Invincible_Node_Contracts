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
    event Stake(uint indexed amount);
    event Unstake(uint indexed amount);
    event SendUnstakedAmount(uint indexed counts);

    
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
    //UnstakeRequest[] public unstakeRequests;
    mapping (uint => UnstakeRequest) public unstakeRequests;

    uint public unstakeRequestsFront;
    uint public unstakeRequestsRear;
    uint public unstakeRequestAmount;
    uint public requireTransferAmount;
    mapping (uint => uint) public nftUnstakeTime;
    mapping (address => uint) public claimableAmount;


    //------other variable------//
    uint public slippage;
    address[] public userList;
    uint public lastStTokenDistributeTime;
    uint public lastSendUnstakedAmountTime;
     uint public totalClaimableAmount;
    

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

    function getStTokenBalance() public view returns (uint) {
        return stToken.balanceOf(address(this));
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
    

    // stake native coin
    function stake(uint _principal, uint _leverageRatio, uint _lockPeriod,uint _slippage) external payable{
         // get stakeInfo
        StakeInfo memory _stakeInfo = getStakeInfo(msg.sender, _principal, _leverageRatio, _lockPeriod);

        // verify given stakeInfo
        _verifyStakeInfo(_stakeInfo, _slippage, msg.sender, msg.value);

        // stake using bfcLiquidStaking
        liquidStakingContract.stake{value : _stakeInfo.principal}();

        // mint StakeNFT Token by stake info
        stakeNFTContract.mintNFT(_stakeInfo);

        //update stakeAmount info
        uint lentAmount = _stakeInfo.stakedAmount - _stakeInfo.principal;
        uint totalLentAmount = lpPoolContract.totalLentAmount() + lentAmount;
        lpPoolContract.setTotalLentAmount(totalLentAmount);
        userList.push(msg.sender);

        emit Stake(_stakeInfo.principal);
    }

    // unStake native coin
    function repayNFT(uint _nftTokenId) external {
        // verify NFT
        require(stakeNFTContract.isOwner(_nftTokenId, msg.sender), ERROR_NOT_OWNED_NFT);
        require(stakeNFTContract.isUnlock(_nftTokenId), ERROR_NOT_UNLOCKED_NFT);

        // get stakeInfo by nftTokenId
        StakeInfo memory stakeInfo = stakeNFTContract.getStakeInfo(_nftTokenId);

        // get lent amount
        uint lentAmount = stakeInfo.stakedAmount - stakeInfo.principal;
        // set total lent amount
        lpPoolContract.setTotalLentAmount(lpPoolContract.totalLentAmount() - lentAmount);

        // get user reward amount including protocol fee
        uint rewardAmount = stakeNFTContract.rewardAmount(_nftTokenId);
        // get user reward without protocol fee
        uint userReward = rewardAmount * (PROTOCOL_FEE_UNIT* 100 - stakeInfo.protocolFee) / (PROTOCOL_FEE_UNIT * 100);
        // get stakers'(INVI staker, LPs) reward
        uint stakersReward = rewardAmount - userReward;
        // split reward to LPs and INVI stakers
        uint lpPoolReward = stakersReward *  lpPoolRewardPortion / REWARD_PORTION_TOTAL_UNIT;
        uint inviTokenStakeReward = stakersReward * inviTokenStakeRewardPortion / REWARD_PORTION_TOTAL_UNIT;

        // set stakeAmount info
        stakeNFTContract.setTotalStakedAmount(stakeNFTContract.totalStakedAmount() - stakeInfo.stakedAmount);
        if (stakeInfo.stakedAmount > stakeInfo.principal) {
            lpPoolContract.setTotalStakedAmount(lpPoolContract.totalStakedAmount() + (stakeInfo.stakedAmount - stakeInfo.principal));
            if (lpPoolContract.totalLentAmount() > stakeInfo.stakedAmount - stakeInfo.principal) {
                lpPoolContract.setTotalLentAmount(lpPoolContract.totalLentAmount() - (stakeInfo.stakedAmount - stakeInfo.principal));
            } else {
                lpPoolContract.setTotalLentAmount(0);
            }
        }

        // create unstake request for user 
        UnstakeRequest memory request = UnstakeRequest(msg.sender,_nftTokenId, stakeInfo.principal + userReward, stakeInfo.protocolFee, 0);
       
       

        //push request to unstakeRequests
        unstakeRequests[unstakeRequestsRear++] = request;
        
        //unstakeRequestsRear = enqueueUnstakeRequests(unstakeRequests, request, unstakeRequestsRear);
        if (lpPoolReward != 0) {
            //unstakeRequestsRear = enqueueUnstakeRequests(unstakeRequests, lpRequest, unstakeRequestsRear);
            // create unstake request for LPs
            UnstakeRequest memory lpRequest = UnstakeRequest(address(lpPoolContract),10**18, lpPoolReward, 0, 1);
            unstakeRequests[unstakeRequestsRear++] = lpRequest;
        }
        if (inviTokenStakeReward != 0) {
            // create unstake request for INVI stakers
            UnstakeRequest memory inviStakerRequest = UnstakeRequest(address(inviTokenStakeContract),10**18, inviTokenStakeReward, 0, 2);
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
        uint totalStakedAmount = stakeNFTContract.totalStakedAmount() + lpPoolContract.totalStakedAmount() - lpPoolContract.totalLentAmount();
        require(stToken.balanceOf(address(this)) > totalStakedAmount , ERROR_NO_REWARD);
        // get total rewards
        uint totalReward = stToken.balanceOf(address(this)) - totalStakedAmount;
       
        
        // check rewards 
        uint nftReward = totalReward * stakeNFTContract.totalStakedAmount() / totalStakedAmount;
        uint lpReward = (totalReward - nftReward) * lpPoolRewardPortion / REWARD_PORTION_TOTAL_UNIT;
        uint inviStakerReward = totalReward - nftReward - lpReward;

         // create unstake event
        if (networkId == 0 || networkId == 1) {
            liquidStakingContract.createUnstakeRequest(nftReward + lpReward + inviStakerReward);
        } else if (networkId == 2) {
            liquidStakingContract.unstake(nftReward + lpReward + inviStakerReward);
        }

        // update NFT reward
        uint leftRewards =  stakeNFTContract.updateReward(nftReward);

        if (lpReward + leftRewards > 0) {
           // create unstake request for LPs
            UnstakeRequest memory lpRequest = UnstakeRequest(address(lpPoolContract),10**18, lpReward + leftRewards, 0, 1);
            // push request to unstakeRequests
            unstakeRequests[unstakeRequestsRear++] = lpRequest;
        }
        if (inviStakerReward > 0) {
            // create unstake request for INVI stakers
            UnstakeRequest memory inviStakerRequest = UnstakeRequest(address(inviTokenStakeContract), 10**18,inviStakerReward, 0, 2);
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
        emit Stake(msg.value);
    }

   function unstakeLp(uint _requestAmount) external onlyLpPool {
        // create unstake event
        if (networkId == 0 || networkId == 1) {
            liquidStakingContract.createUnstakeRequest(_requestAmount);
        } else if (networkId == 2) {
            liquidStakingContract.unstake(_requestAmount);
        }

        // create unstake request for LPs
        UnstakeRequest memory lpRequest = UnstakeRequest(address(lpPoolContract), 10**18,_requestAmount, 0, 3);
       
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

        uint front = unstakeRequestsFront;
        uint rear = unstakeRequestsRear;
        uint count = 0;
        require(address(this).balance > totalClaimableAmount, "Not enough amount");
        for (uint i = front ; i <  rear; i++) {
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
            uint requestType = unstakeRequests[i].requestType;
            uint amount = unstakeRequests[i].amount;
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
        uint amount = claimableAmount[msg.sender];
        totalClaimableAmount -= amount;
        claimableAmount[msg.sender] = 0;
        (bool sent, ) = msg.sender.call{value : amount }("");
        require(sent, ERROR_FAIL_SEND);
    }
    
    //====== utils function ======//
    // verify stakeInfo is proper
    function _verifyStakeInfo(StakeInfo memory _stakeInfo, uint _slippage, address _msgSender, uint _sendAmount) private view {
        
        // verify msg.sender
        require(_stakeInfo.user == _msgSender, ERROR_INVALID_STAKE_INFO);
        
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