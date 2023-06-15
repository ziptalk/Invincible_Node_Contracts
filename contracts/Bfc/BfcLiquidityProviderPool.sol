// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/IERC20.sol";
import "../common/lib/AddressUtils.sol";
import "../common/lib/Logics.sol";
import "../common/lib/Unit.sol";
import "../common/lib/ErrorMessages.sol";
import "./BfcInviCore.sol";

contract BfcLiquidityProviderPool is Initializable, OwnableUpgradeable {
    //------Contracts and Addresses------//
    IERC20 public iLP;
    IERC20 public inviToken;
    BfcInviCore public inviCoreContract;
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
    uint public totalStakedAmount;
    uint public totalLentAmount;
    uint public totalNativeRewardAmount;

    //====== Upgrades ======//
    uint public totalInviRewardAmount;
    mapping (address => uint) public totalInviRewardAmountByAddress;
    mapping (address => uint) public totalNativeRewardAmountByAddress;

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
        inviCoreContract = BfcInviCore(_inviCore);
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

        console.log("mint success");
    
        // request inviCore
        inviCoreContract.stakeLp{value: msg.value}();
    }

    function unstake(uint _amount) public {
        require(stakedAmount[msg.sender] >= _amount, ERROR_INSUFFICIENT_BALANCE);
        // update stake amount
        stakedAmount[msg.sender] -= _amount;
        totalStakedAmount -= _amount;

        // burn ILP
        iLP.burnToken(msg.sender, _amount);

        // request inviCore
        inviCoreContract.unstakeLp(_amount);

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
            totalInviRewardAmountByAddress[account] += rewardAmount;
        }
    }

    // distribute invi token 
    function distributeInviTokenReward() external onlyOwner{
        require(block.timestamp - lastInviRewardedTime >= inviRewardInterval, ERROR_DISTRIBUTE_INTERVAL_NOT_REACHED);
        uint totalInviToken = inviToken.balanceOf(address(this));
        ILPHolders = iLP.getILPHolders();
        for (uint256 i = 0; i < ILPHolders.length; i++) {
            //TODO : ILP Holder staking 양에 비례하게 invi token reward 분배
            address account = ILPHolders[i];
            uint rewardAmount = (totalInviToken * stakedAmount[account] / (totalStakedAmount * (inviReceiveInterval / inviRewardInterval)));
           
            // update rewards
            inviRewardAmount[account] += rewardAmount;
            totalInviRewardAmount += rewardAmount;
            totalInviRewardAmountByAddress[account] += rewardAmount;
        }

        lastInviRewardedTime = block.timestamp;
    }

    function claimInviReward() external {
        require(inviRewardAmount[msg.sender] > 0, ERROR_INSUFFICIENT_BALANCE);
        uint rewardAmount = inviRewardAmount[msg.sender];
        inviRewardAmount[msg.sender] = 0;
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