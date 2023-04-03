// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./interfaces/IERC20.sol";
import "./lib/AddressUtils.sol";
import "./lib/Logics.sol";
import "hardhat/console.sol";

contract InviTokenStake is Initializable, OwnableUpgradeable {
    //------Contracts and Addresses------//
    IERC20 public inviToken;
    address public stakeManager;
    address public inviCoreAddress;

    //------stake status------//
    mapping(address => uint) public stakedAmount;
    mapping(address => uint) public nativeRewardAmount;
    uint public totalStakedAmount;

    //------addresses status------//
    address[] public addressList;
    uint public totalAddressNumber;

    //====== modifiers ======//
    modifier onlyInviCore {
        require(msg.sender == inviCoreAddress, "msg sender should be invi core");
        _;
    }
    
    //====== initializer ======//
    function initialize(address _inviTokenAddr) public initializer {
        __Ownable_init();
        inviToken = IERC20(_inviTokenAddr);
    }

    //====== getter functions ======//
    
    //====== setter functions ======//
    function setStakeManager(address _stakeManager) external onlyOwner {
        stakeManager = _stakeManager;
    }

    function setInviCoreAddress(address _inviCoreAddr) public onlyOwner {
        inviCoreAddress = _inviCoreAddr;
    }

    function setInviTokenAddress(address _inviTokenAddr) public onlyOwner {
        inviToken = IERC20(_inviTokenAddr);
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

    // distribute native rewards
    function updateNativeReward() external payable onlyInviCore {
        // require(msg.sender == STAKE_MANAGER, "Sent from Wrong Address");
        for (uint256 i = 0; i < addressList.length; i++) {
            address account = addressList[i];
            uint rewardAmount = (msg.value * stakedAmount[account] / totalStakedAmount);
            console.log("reward: ", rewardAmount);
            nativeRewardAmount[account] += rewardAmount;
        }
    }

    // distribute invi token rewards (tbd)
    function updateInviTokenReward(uint _totalRewardAmount) external onlyInviCore {
        // require(msg.sender == STAKE_MANAGER, "Sent from Wrong Address");
        for (uint256 i = 0; i < addressList.length; i++) {}
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
    
}