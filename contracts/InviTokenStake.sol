// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./interfaces/IERC20.sol";
import "./lib/AddressUtils.sol";
import "./lib/Logics.sol";

contract InviTokenStake is Initializable, OwnableUpgradeable {

    IERC20 public inviToken;
    address public stakeManager;
    address public INVI_CORE;

    // stake status
    mapping(address => uint) public stakedAmount;
    mapping(address => uint) public nativeRewardAmount;
    uint public totalStakedAmount;

    // addresses status
    address[] public addressList;
    uint public totalAddressNumber;

    //====== modifiers ======//
    modifier onlyInviCore {
        require(msg.sender == INVI_CORE, "msg sender should be invi core");
        _;
    }
    
    //====== initializer ======//
    function initialize(address _stakeManager, address _invi) public initializer {
        stakeManager = _stakeManager;
        inviToken = IERC20(_invi);
        __Ownable_init();
    }

    //====== getter functions ======//
    
    //====== setter functions ======//
   
    function setInviCoreAddress(address _inviCore) public onlyOwner {
        INVI_CORE = _inviCore;
    }
   
    //====== service functions ======//

    // stake inviToken
    function stake(uint _stakeAmount) public  {
        require(inviToken.transferFrom(msg.sender, address(this), _stakeAmount), "Failed to transfer inviToken to contract");

        // update stake amount
        stakedAmount[msg.sender] += _stakeAmount;
        totalStakedAmount += _stakeAmount;

        // add address to address list if new address
        addAddress(addressList, msg.sender);
        totalAddressNumber = addressList.length;
    }

    // unstake inviToken
    function unStake(uint _unstakeAmount) public  {
        // update stake amount
        require(stakedAmount[msg.sender] >= _unstakeAmount, "Unstake Amount cannot be bigger than stake amount");
        stakedAmount[msg.sender] -= _unstakeAmount;

        require(inviToken.transfer(msg.sender, _unstakeAmount));
    }

    // update rewards
    function distributeNativeReward() external payable {
        // require(msg.sender == STAKE_MANAGER, "Sent from Wrong Address");
        for (uint256 i = 0; i < addressList.length; i++) {
            address account = addressList[i];
            uint rewardAmount = (msg.value * stakedAmount[account] / totalStakedAmount);

            (bool sent, ) = account.call{value: rewardAmount}("");
            require(sent, "Failed to send native coin to ILP holder");
            
            nativeRewardAmount[account] += rewardAmount;
        }
    }

    // user receive reward(native coin) function
    function receiveReward() public {
        require(nativeRewardAmount[msg.sender] != 0, "no rewards available for this user");
        uint reward = nativeRewardAmount[msg.sender];
        nativeRewardAmount[msg.sender] = 0;  
        
        // send reward to requester
        (bool sent, ) = msg.sender.call{value: reward}("");
        require(sent, "Failed to send reward to requester");
    }

    //====== utils functions ======//

    // update account's reward
    function _updateAccountReward(address _account, uint256 _totalRewardAmount) private {
        // get Account reward 
        uint accountReward = InviTokenStakerNativeRewardAmount(_totalRewardAmount, stakedAmount[_account], totalStakedAmount);
        
        // update account reward
        nativeRewardAmount[_account] += accountReward;
    }
}