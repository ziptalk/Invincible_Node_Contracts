// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/external/IERC20.sol";
import "./lib/AddressUtils.sol";
import "./lib/Logics.sol";
import "./lib/Unit.sol";
import "./lib/ErrorMessages.sol";
import "./InviCore.sol";
import "./StakeNFT.sol";
import "./lib/Structs.sol";
import "./lib/ArrayUtils.sol";
import "./tokens/ILPToken.sol";


contract LiquidityProviderPool is Initializable, OwnableUpgradeable {
    //------Contracts and Addresses------//
    ILPToken public iLP;
    IERC20 public inviToken;
    InviCore public inviCoreContract;
    StakeNFT public stakeNFT;

    //------ratio------//
    uint public liquidityAllowableRatio;

    //------events------//
    event Stake(uint amount);
    
    //------lp status------//
    mapping(address => uint128) public stakedAmount;
    mapping(address => uint128) public nativeRewardAmount;
    mapping(address => uint128) public inviRewardAmount;
    mapping (address => uint128) public totalInviRewardAmountByAddress;
    mapping (address => uint128) public totalNativeRewardAmountByAddress;

    //------Unstake------//
    mapping(address => uint128) public claimableUnstakeAmount;
    mapping(address => uint128) public unstakeRequestAmount;
    //UnstakeRequestLP[] public unstakeRequests;
    mapping(uint => UnstakeRequestLP) public unstakeRequests;
    uint32 public unstakeRequestsRear;
    uint32 public unstakeRequestsFront;

    uint128 public unstakedAmount;
    uint128 public totalStakedAmount;
    uint128 public totalLentAmount;
    uint128 public totalNativeRewardAmount;
    uint128 public totalInviRewardAmount;
    uint128 public totalClaimableInviAmount;

    uint256 public lastNativeRewardDistributeTime;
    uint256 public inviRewardInterval;
    uint256 public inviReceiveInterval;
    uint256 public lastInviRewardedTime;
    uint256 public lastSendUnstakedAmountTime;




    //====== modifiers ======//
    modifier onlyInviCore {
        require(msg.sender == address(inviCoreContract), "msg sender should be invi core");
        _;
    }

    //====== initializer ======//
    function initialize(address iLPAddr, address inviTokenAddr) public initializer {
        __Ownable_init();
        iLP = ILPToken(iLPAddr);
        inviToken = IERC20(inviTokenAddr);
        liquidityAllowableRatio = LIQUIDITY_ALLOWABLE_RATIO_UNIT * 1;

        inviRewardInterval = 1 hours; // testnet : 1 hours
        // inviRewardInterval = 1 days; // mainnet : 1 days

        inviReceiveInterval = 30 hours; // testnet : 30 hours
        // inviReceiveInterval = 90 days; // mainnet : 90 days

        lastInviRewardedTime = block.timestamp - inviRewardInterval;

        unstakeRequestsFront = 0;
        unstakeRequestsRear = 0;
    }

    //====== getter functions ======//
    function getRewardAmount() public view returns (uint, uint) {
        return (nativeRewardAmount[msg.sender], inviRewardAmount[msg.sender]);
    }

    function getTotalLiquidity() public view returns (uint128) {
        return (totalStakedAmount - totalLentAmount);
    }

    function getMaxLentAmount() public view returns (uint) {
        return (getTotalLiquidity() * liquidityAllowableRatio) / (100 * LIQUIDITY_ALLOWABLE_RATIO_UNIT);
    }

    //====== setter functions ======//
    function setInviCoreContract(address payable _inviCore) external onlyOwner {
        inviCoreContract = InviCore(_inviCore);
    }

    function setStakeNFTContract(address _stakeNFT) external onlyOwner {
        stakeNFT = StakeNFT(_stakeNFT);
    }

    function setLiquidityAllowableRatio(uint _liquidityAllowableRatio) public onlyOwner {
        liquidityAllowableRatio = _liquidityAllowableRatio;
    }

    // set total lended amount by invi core
    function setTotalLentAmount(uint128 _totalLentAmount) public onlyInviCore {
        totalLentAmount = _totalLentAmount;
    }

    // set total staked amount by invi core
    function setTotalStakedAmount(uint128 _totalStakedAmount) public onlyInviCore {
        totalStakedAmount = _totalStakedAmount;
    }

    //====== service functions ======//

    // stake Native Coin to LP Pool
    function stake() public payable {
        uint128 stakeAmount = uint128(msg.value);
        // update stake amount
        stakedAmount[msg.sender] += stakeAmount;
        totalStakedAmount += stakeAmount;

        // mint and tranfer ILP to sender
        iLP.mintToken(msg.sender, stakeAmount);
    
        // request inviCore
        inviCoreContract.stakeLp{value: stakeAmount}();
    }

    function unstake(uint128 _amount) public {
        require(stakedAmount[msg.sender] >= _amount &&  _amount > 0, "Improper request amount");
        
        // update stake amount
        stakedAmount[msg.sender] -= _amount;
        totalStakedAmount -= _amount;

        // check if totalStakedAmount is below totalLentAmount
        if (totalStakedAmount < totalLentAmount) {
           uint128 excessAmount = totalLentAmount - totalStakedAmount;

            // request liquidity issue resolve to stakeNFT
           stakeNFT.resolveLiquidityIssue(excessAmount, totalLentAmount);
           totalLentAmount = totalStakedAmount;
        }

        // burn ILP
        iLP.burnToken(msg.sender, _amount);

        // request inviCore
        inviCoreContract.unstakeLp(_amount);
        

        // create unstake request
        UnstakeRequestLP memory unstakeRequest = UnstakeRequestLP({
            recipient: msg.sender,
            amount: _amount,
            requestTime: block.timestamp
        });
        // update unstake request
        unstakeRequests[unstakeRequestsRear++] = unstakeRequest;
    }

    function receiveUnstaked() external payable onlyInviCore {
        unstakedAmount += uint128(msg.value);
    }

    function sendUnstakedAmount() external {
        // require contract balance to be above totalNativeRewardAmount
        require(address(this).balance >= totalNativeRewardAmount, ERROR_INSUFFICIENT_BALANCE);

        // require unstake request to be exist
        require(unstakeRequestsFront != unstakeRequestsRear, "No unstake requests");

        uint front = unstakeRequestsFront;
        uint rear = unstakeRequestsRear;
        for (uint i=front; i< rear; i++) {
            if (unstakeRequests[i].amount > unstakedAmount) {
                break;
            }
            // update claimable amount
            claimableUnstakeAmount[unstakeRequests[i].recipient] += unstakeRequests[i].amount;

              // update unstaked amount
            unstakedAmount -= unstakeRequests[i].amount;

            // remove unstake request
            delete unstakeRequests[unstakeRequestsFront++];
            //unstakeRequestsFront = dequeueUnstakeRequests(unstakeRequests, unstakeRequestsFront, unstakeRequestsRear);

        }

        lastSendUnstakedAmountTime = block.timestamp;
    }

    function claimUnstaked() external {
        require(claimableUnstakeAmount[msg.sender] > 0 && claimableUnstakeAmount[msg.sender] >= address(this).balance, ERROR_INSUFFICIENT_BALANCE);

        uint amount = claimableUnstakeAmount[msg.sender];
        claimableUnstakeAmount[msg.sender] = 0;

        (bool send, ) = msg.sender.call{value: amount}("");
        require(send, "Transfer failed");
    }
    
    // distribute native coin
    function distributeNativeReward() external payable onlyInviCore{
        for (uint32 i = 0; i < iLP.totalILPHoldersCount(); i++) {
            address account = iLP.ILPHolders(i);
            uint128 rewardAmount = (uint128(msg.value) * stakedAmount[account] / totalStakedAmount);

            // update reward amount
            nativeRewardAmount[account] += rewardAmount;
            totalNativeRewardAmount += rewardAmount;
            totalNativeRewardAmountByAddress[account] += rewardAmount;
        }

        lastNativeRewardDistributeTime = block.timestamp;
    }

    // distribute invi token 
    function distributeInviTokenReward() external {
        require(block.timestamp - lastInviRewardedTime >= inviRewardInterval, ERROR_DISTRIBUTE_INTERVAL_NOT_REACHED);
        uint128 totalInviToken = uint128( inviToken.balanceOf(address(this)));
        require(totalInviToken - totalClaimableInviAmount > 1000000, "Insufficient invi token to distribute");
        uint128 totalRewards = totalInviToken - totalClaimableInviAmount;
        for (uint32 i = 0; i < iLP.totalILPHoldersCount(); i++) {
            address account = iLP.ILPHolders(i);
            uint128 intervalVar = uint128(inviReceiveInterval) / uint128(inviRewardInterval);
            uint128 rewardAmount = (totalRewards * stakedAmount[account] / (totalStakedAmount * intervalVar));
           
            // update rewards
            inviRewardAmount[account] += rewardAmount;
            totalInviRewardAmount += rewardAmount;
            totalClaimableInviAmount += rewardAmount;
            totalInviRewardAmountByAddress[account] += rewardAmount;
        }

        lastInviRewardedTime = block.timestamp;
    }
 
    function claimInviReward() external {
        require(inviRewardAmount[msg.sender] > 0 && inviRewardAmount[msg.sender] > address(this).balance, ERROR_INSUFFICIENT_BALANCE);
        uint128 rewardAmount = inviRewardAmount[msg.sender];
        inviRewardAmount[msg.sender] = 0;
        totalClaimableInviAmount -= rewardAmount;
        uint32 inviSlippage = 1000;
        // send invi token to account
        require(inviToken.transfer(msg.sender, rewardAmount - inviSlippage), ERROR_FAIL_SEND);
    }

    function claimNativeReward() external {
        require(nativeRewardAmount[msg.sender] > 0 && nativeRewardAmount[msg.sender] > address(this).balance, ERROR_INSUFFICIENT_BALANCE);
        uint128 rewardAmount = nativeRewardAmount[msg.sender];
        nativeRewardAmount[msg.sender] = 0;

        // send native coin to account
        (bool sent, ) = msg.sender.call{value: rewardAmount}("");
        require(sent, ERROR_FAIL_SEND);
    }

    //====== utils functions ======//
 
}