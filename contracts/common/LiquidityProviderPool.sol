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
import "./lib/Structs.sol";
import "./lib/ArrayUtils.sol";


contract LiquidityProviderPool is Initializable, OwnableUpgradeable {
    //------Contracts and Addresses------//
    IERC20 public iLP;
    IERC20 public inviToken;
    InviCore public inviCoreContract;
    address[] public ILPHolders;

    //------ratio------//
    uint public liquidityAllowableRatio;
    uint public inviRewardInterval;
    uint public inviReceiveInterval;
    uint public lastInviRewardedTime;

    //------events------//
    event Stake(uint amount);
    
    //------lp status------//
    mapping(address => uint) public stakedAmount;
    mapping(address => uint) public nativeRewardAmount;
    mapping(address => uint) public inviRewardAmount;
    mapping (address => uint) public totalInviRewardAmountByAddress;
    mapping (address => uint) public totalNativeRewardAmountByAddress;

    //------Unstake------//
    mapping(address => uint) public claimableUnstakeAmount;
    mapping(address => uint) public unstakeRequestAmount;
    //UnstakeRequestLP[] public unstakeRequests;
    mapping(uint => UnstakeRequestLP) public unstakeRequests;
    uint public unstakeRequestsRear;
    uint public unstakeRequestsFront;
    uint public lastSendUnstakedAmountTime;

    uint public totalStakedAmount;
    uint public totalLentAmount;
    uint public totalNativeRewardAmount;
    uint public totalInviRewardAmount;
    uint public lastNativeRewardDistributeTime;
    uint public totalClaimableInviAmount;

    uint public unstakedAmount;

    //====== modifiers ======//
    modifier onlyInviCore {
        require(msg.sender == address(inviCoreContract), "msg sender should be invi core");
        _;
    }

    //====== initializer ======//
    function initialize(address iLPAddr, address inviTokenAddr) public initializer {
        __Ownable_init();
        iLP = IERC20(iLPAddr);
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

    function getTotalLiquidity() public view returns (uint) {
        return (totalStakedAmount - totalLentAmount);
    }

    function getMaxLentAmount() public view returns (uint) {
        return (getTotalLiquidity() * liquidityAllowableRatio) / (100 * LIQUIDITY_ALLOWABLE_RATIO_UNIT);
    }

    //====== setter functions ======//
    function setInviCoreContract(address payable _inviCore) external onlyOwner {
        inviCoreContract = InviCore(_inviCore);
    }

    function setLiquidityAllowableRatio(uint _liquidityAllowableRatio) public onlyOwner {
        liquidityAllowableRatio = _liquidityAllowableRatio;
    }

    // set total lended amount by invi core
    function setTotalLentAmount(uint _totalLentAmount) public onlyInviCore {
        totalLentAmount = _totalLentAmount;
    }

    // set total staked amount by invi core
    function setTotalStakedAmount(uint _totalStakedAmount) public onlyInviCore {
        totalStakedAmount = _totalStakedAmount;
    }

    //====== service functions ======//

    // stake Native Coin to LP Pool
    function stake() public payable {
        // update stake amount
        stakedAmount[msg.sender] += msg.value;
        totalStakedAmount += msg.value;

        // mint and tranfer ILP to sender
        iLP.mintToken(msg.sender, msg.value);
    
        // request inviCore
        inviCoreContract.stakeLp{value: msg.value}();
    }

    function unstake(uint _amount) public {
        require(stakedAmount[msg.sender] >= _amount && totalStakedAmount - totalLentAmount >= _amount && _amount > 0, "Improper request amount");
        // update stake amount
        stakedAmount[msg.sender] -= _amount;
        totalStakedAmount -= _amount;

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
        // unstakeRequestsRear =  enqueueUnstakeRequests(unstakeRequests, unstakeRequest, unstakeRequestsRear);
    }

    function receiveUnstaked() external payable onlyInviCore {
        unstakedAmount += msg.value;
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

            // remove unstake request
            delete unstakeRequests[unstakeRequestsFront++];
            //unstakeRequestsFront = dequeueUnstakeRequests(unstakeRequests, unstakeRequestsFront, unstakeRequestsRear);

            // update unstaked amount
            unstakedAmount -= unstakeRequests[i].amount;
        }

        lastSendUnstakedAmountTime = block.timestamp;
    }

    function claimUnstaked() external {
        require(claimableUnstakeAmount[msg.sender] > 0, ERROR_INSUFFICIENT_BALANCE);

        uint amount = claimableUnstakeAmount[msg.sender];
        claimableUnstakeAmount[msg.sender] = 0;

        (bool send, ) = msg.sender.call{value: amount}("");
        require(send, "Transfer failed");
    }
    
    // distribute native coin
    function distributeNativeReward() external payable onlyInviCore{
        ILPHolders = iLP.getILPHolders();
        for (uint256 i = 0; i < ILPHolders.length; i++) {
            address account = ILPHolders[i];
            uint rewardAmount = (msg.value * stakedAmount[account] / totalStakedAmount);

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
        uint totalInviToken = inviToken.balanceOf(address(this));
        require(totalInviToken - totalClaimableInviAmount > 1000000, ERROR_INSUFFICIENT_BALANCE);
        ILPHolders = iLP.getILPHolders();
        for (uint256 i = 0; i < ILPHolders.length; i++) {
            address account = ILPHolders[i];
            uint rewardAmount = ((totalInviToken - totalClaimableInviAmount) * stakedAmount[account] / (totalStakedAmount * (inviReceiveInterval / inviRewardInterval)));
           
            // update rewards
            inviRewardAmount[account] += rewardAmount;
            totalInviRewardAmount += rewardAmount;
            totalClaimableInviAmount += rewardAmount;
            totalInviRewardAmountByAddress[account] += rewardAmount;
        }

        lastInviRewardedTime = block.timestamp;
    }
 
    function claimInviReward() external {
        require(inviRewardAmount[msg.sender] > 0, ERROR_INSUFFICIENT_BALANCE);
        uint rewardAmount = inviRewardAmount[msg.sender];
        inviRewardAmount[msg.sender] = 0;
        totalClaimableInviAmount -= rewardAmount;
        uint inviSlippage = 1000;
        // send invi token to account
        require(inviToken.transfer(msg.sender, rewardAmount - inviSlippage), ERROR_FAIL_SEND);
    }

    function claimNativeReward() external {
        require(nativeRewardAmount[msg.sender] > 0, ERROR_INSUFFICIENT_BALANCE);
        uint rewardAmount = nativeRewardAmount[msg.sender];
        nativeRewardAmount[msg.sender] = 0;

        // send native coin to account
        (bool sent, ) = msg.sender.call{value: rewardAmount}("");
        require(sent, ERROR_FAIL_SEND);
    }

    //====== utils functions ======//
 
}