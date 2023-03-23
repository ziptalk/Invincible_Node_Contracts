// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IERC20.sol";
import "./lib/AddressUtils.sol";
import "./lib/Logics.sol";
import "./lib/Unit.sol";
import "./lib/ErrorMessages.sol";

contract LiquidityProviderPool is Initializable, OwnableUpgradeable {
    //------Contracts and Addresses------//
    IERC20 public iLP;
    IERC20 public inviToken;
    address public stakeManager; 
    address public INVI_CORE;
    address[] public ILPHolders;

    //------Ratios------//
    uint public liquidityAllowableRatio;
    
    //------lp status------//
    mapping(address => uint) public stakedAmount;
    mapping(address => uint) public nativeRewardAmount;
    mapping(address => uint) public inviRewardAmount;
    uint public totalStakedAmount;
    uint public totalLentAmount;
    
    //====== modifiers ======//
    modifier onlyInviCore {
        require(msg.sender == INVI_CORE, "msg sender should be invi core");
        _;
    }

    //====== initializer ======//
    function initialize(address _stakeManager, address _iLP, address _inviToken) public initializer {
        stakeManager = _stakeManager;
        iLP = IERC20(_iLP);
        inviToken = IERC20(_inviToken);
        liquidityAllowableRatio = liquidityAllowableRatioUnit * 1;
        __Ownable_init();
    }

    //====== getter functions ======//
    function getRewardAmount() public view returns (uint, uint) {
        return (nativeRewardAmount[msg.sender], inviRewardAmount[msg.sender]);
    }

    function getTotalLiquidity() public view returns (uint) {
        return (totalStakedAmount - totalLentAmount);
    }

    function getMaxLentAmount() public view returns (uint) {
        return (getTotalLiquidity() * liquidityAllowableRatio) / (100 * liquidityAllowableRatioUnit);
    }

    //====== setter functions ======//
   
    function setInviCoreAddress(address _inviCore) external onlyOwner {
        INVI_CORE = _inviCore;
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
        
        // send coin to LP manager
        (bool sent, ) = stakeManager.call{value: msg.value}("");
        require(sent, ERROR_FAIL_SEND);
    }
    
    // distribute native coin
    function distributeNativeReward() external payable onlyInviCore{
        ILPHolders = iLP.getILPHolders();
        for (uint256 i = 0; i < ILPHolders.length; i++) {
            address account = ILPHolders[i];
            uint rewardAmount = (msg.value * stakedAmount[account] / totalStakedAmount);
            nativeRewardAmount[account] += rewardAmount;
            (bool sent, ) = account.call{value: rewardAmount}("");
            require(sent, ERROR_FAIL_SEND);
        }
    }

    // distribute invi token 
    function distributeInviTokenReward() external onlyOwner{
        ILPHolders = iLP.getILPHolders();
        for (uint256 i = 0; i < ILPHolders.length; i++) {
            //TODO : ILP Holder staking 양에 비례하게 invi token reward 분배
        }
    }

    //====== utils functions ======//

}