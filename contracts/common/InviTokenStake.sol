// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "../interfaces/external/IERC20.sol";
import "./lib/AddressUtils.sol";
import "./lib/Logics.sol";
import "./lib/ErrorMessages.sol";
import "hardhat/console.sol";

contract InviTokenStake is Initializable, OwnableUpgradeable {
    //------Contracts and Addresses------//
    IERC20 public inviToken;
    address public inviCoreAddress;

    //------stake status------//
    mapping(address => uint) public stakedAmount;
    mapping(address => uint) public nativeRewardAmount;
    mapping(address => uint) public inviRewardAmount;
    uint public totalStakedAmount;

    //------Unstake------//
    mapping(address => uint) public unstakeRequestTime;
    mapping(address => uint) public claimableUnstakeAmount;
    mapping(address => uint) public unstakeRequestAmount;
    uint public totalClaimableInviAmount;
    uint public unstakePeriod;

    //------Rewards------//
    uint public inviRewardInterval;
    uint public inviReceiveInterval;
    uint public lastInviRewardedTime;
    uint public lastNativeRewardDistributeTime;
    uint public totalInviRewardAmount;
    mapping (address => uint) totalInviRewardAmountByAddress;

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

        inviRewardInterval = 1 hours; // testnet : 1 hours
        // inviRewardInterval = 1 days; // mainnet : 1 days

        inviReceiveInterval = 30 hours; // testnet : 30 hours
        // inviReceiveInterval = 90 days; // mainnet : 90 days

        lastInviRewardedTime = block.timestamp - inviRewardInterval;

        unstakePeriod = 1 minutes; // testnet : 1 min (for test) mainnet: 7 days
    }

    //====== getter functions ======//
    function getUnstakeTime(address _addr) public view returns (uint) {
        require(unstakeRequestTime[_addr] != 0, "No unstake request");
        return unstakeRequestTime[_addr] + unstakePeriod;
    }

    function getClaimableAmount(address _addr) public view returns (uint) {
        if (block.timestamp >= getUnstakeTime(_addr)) {
            return unstakeRequestAmount[_addr] + claimableUnstakeAmount[_addr];
        } else {
            return claimableUnstakeAmount[_addr];
        }
    }
    
    //====== setter functions ======//
    function setInviCoreAddress(address _inviCoreAddr) public onlyOwner {
        inviCoreAddress = _inviCoreAddr;
    }

    function setInviTokenAddress(address _inviTokenAddr) public onlyOwner {
        inviToken = IERC20(_inviTokenAddr);
    }
    
    function setUnstakePeriod(uint _unstakePeriod) external onlyOwner {
        unstakePeriod = _unstakePeriod;
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

    function requestUnstake(uint _unstakeAmount) public {
        require(unstakeRequestTime[msg.sender] + unstakePeriod < block.timestamp, "Already requested unstake");
        require(stakedAmount[msg.sender] >= _unstakeAmount, "Unstake Amount cannot be bigger than stake amount");
        
        // update claimable unstake amount
        claimableUnstakeAmount[msg.sender] += _unstakeAmount;
        // update unstake request time
        unstakeRequestTime[msg.sender] = block.timestamp;

        // update values
        stakedAmount[msg.sender] -= _unstakeAmount;
        unstakeRequestAmount[msg.sender] += _unstakeAmount;
        totalStakedAmount -= _unstakeAmount;
    }

    function cancelUnstake() public {
        require(claimableUnstakeAmount[msg.sender] >= 0, "no claimable unstake amount");
        require(unstakeRequestTime[msg.sender] != 0, "No unstake request");
        require(block.timestamp < unstakePeriod + unstakeRequestTime[msg.sender], "cancel period passed");

        // update unstake request time
        unstakeRequestTime[msg.sender] = 0;

        // update values
        stakedAmount[msg.sender] += claimableUnstakeAmount[msg.sender];
        unstakeRequestAmount[msg.sender] = 0;
        totalStakedAmount += claimableUnstakeAmount[msg.sender];
    }

    // unstake inviToken
    function claimUnstaked() public  {
        require(claimableUnstakeAmount[msg.sender] >= 0, "no claimable unstake amount");
        require(block.timestamp >= unstakePeriod + unstakeRequestTime[msg.sender], "unstake period not passed");
        uint claimableAmount;
        // if unstake period not passed
        if (block.timestamp < unstakePeriod + unstakeRequestTime[msg.sender]) {
            // claim only claimable unstake amount
           claimableAmount = claimableUnstakeAmount[msg.sender];
        } else {
            // claim both
            claimableAmount = unstakeRequestAmount[msg.sender] + claimableUnstakeAmount[msg.sender];
            // update unstake request time
            unstakeRequestAmount[msg.sender] = 0;
        }

        // update claimable unstake amount
        claimableUnstakeAmount[msg.sender] = 0;

        // send invi Token to requester
        require(inviToken.transfer(msg.sender, claimableAmount));
    }

    // distribute native rewards
    function updateNativeReward() external payable onlyInviCore {
        // require(msg.sender == STAKE_MANAGER, "Sent from Wrong Address");
        for (uint256 i = 0; i < addressList.length; i++) {
            address account = addressList[i];
            uint rewardAmount = (msg.value * stakedAmount[account] / totalStakedAmount);
            console.log("reward: ", rewardAmount);

            // update rewards
            nativeRewardAmount[account] += rewardAmount;
        }

        // update last distribute time
        lastNativeRewardDistributeTime = block.timestamp;
    }

    // distribute invi token rewards (tbd)
    function updateInviTokenReward() external {
        require(block.timestamp - lastInviRewardedTime >= inviRewardInterval, ERROR_DISTRIBUTE_INTERVAL_NOT_REACHED);
        uint totalInviToken = inviToken.balanceOf(address(this));
        require(totalInviToken - totalClaimableInviAmount > 1000000, ERROR_INSUFFICIENT_BALANCE);

        for (uint256 i = 0; i < addressList.length; i++) {
            address account = addressList[i];
            uint rewardAmount = ((totalInviToken - totalClaimableInviAmount) * stakedAmount[account] / (totalStakedAmount * (inviReceiveInterval / inviRewardInterval)));
            
            // update rewards
            inviRewardAmount[account] += rewardAmount;
            totalInviRewardAmount += rewardAmount;
            totalClaimableInviAmount += rewardAmount;
            totalInviRewardAmountByAddress[account] += rewardAmount;
        }

        lastInviRewardedTime = block.timestamp;
    }

    // user receive reward(native coin) function
    function claimNativeReward() public {
        require(nativeRewardAmount[msg.sender] != 0, "no rewards available for this user");
        uint rewardAmount = nativeRewardAmount[msg.sender];

        // update reward amount
        nativeRewardAmount[msg.sender] = 0;  

        // send reward to requester
        (bool sent, ) = msg.sender.call{value: rewardAmount}("");
        require(sent, "Failed to send reward to requester");
    }

    function claimInviReward() public {
        require(inviRewardAmount[msg.sender] != 0, "no rewards available for this user");
        uint rewardAmount = inviRewardAmount[msg.sender];

        // update reward amount
        inviRewardAmount[msg.sender] = 0;  
        totalClaimableInviAmount -= rewardAmount;

        // send reward to requester
        require(inviToken.transfer(msg.sender, rewardAmount), "Failed to send reward to requester");
    }
    
    //====== utils functions ======//
    
}