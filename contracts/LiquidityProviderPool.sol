// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IERC20.sol";
import "./lib/AddressUtils.sol";
import "./lib/Logics.sol";
import "./lib/Unit.sol";

contract LiquidityProviderPool is Initializable, OwnableUpgradeable {

    IERC20 public iLP;
    IERC20 public inviToken;
    address public stakeManager; 
    address public INVI_CORE;
    address[] public ILPHolders;
    uint public liquidityAllowableRatio;

    // lp status
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
   
    function setInviCoreAddress(address _inviCore) public onlyOwner {
        INVI_CORE = _inviCore;
    }

    function setLiquidityAllowableRatio(uint _liquidityAllowableRatio) public onlyOwner {
        liquidityAllowableRatio = _liquidityAllowableRatio;
    }

    // set total lended amount by invi core
    function setTotalLentAmount(uint _totalLentAmount) public onlyInviCore {
        totalLentAmount = _totalLentAmount;
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
        require(sent, "Failed to send coin to Stake Manager");
    }

     // update rewards
    function distributeNativeReward() external payable onlyInviCore {
        ILPHolders = iLP.getILPHolders();
        for (uint256 i = 0; i < ILPHolders.length; i++) {
            address account = ILPHolders[i];
            uint rewardAmount = (msg.value * stakedAmount[account] / totalStakedAmount);

            (bool sent, ) = account.call{value: rewardAmount}("");
            require(sent, "Failed to send native coin to ILP holder");
            
            nativeRewardAmount[account] += rewardAmount;
        }
    }

    function distributeInviReward(uint _totalRewardAmount) external onlyInviCore{
        ILPHolders = iLP.getILPHolders();
        for (uint256 i = 0; i < ILPHolders.length; i++) {
            address account = ILPHolders[i];
            inviRewardAmount[account] += (_totalRewardAmount * stakedAmount[account] / totalStakedAmount);
        }
    }

    //====== utils functions ======//

    // distribute account reward

    // function _distributeAccountReward(address _account, uint256 _totalRewardAmount) private {

    //     // get Account native token reward 
    //     uint accountNativeReward = LiquidityProviderNativeRewardAmount(_totalRewardAmount, stakedAmount[_account], totalStakedAmount);
        
    //     // get Account invi Reward
    //     uint accountInviReward = LiquidityProviderInviRewardAmount(_totalRewardAmount, stakedAmount[_account], totalStakedAmount);

    //     // distribute account native reward
    //     (bool sent, ) = _account.call{value: accountNativeReward}("");
    //     require(sent, "Failed to send native coin to ILP holder");

    //     // distribute account invi reward
    //     inviToken.mintToken(_account, accountInviReward);
    // }
}