// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/external/IERC20.sol";
import "./lib/AddressUtils.sol";
import "./lib/Logics.sol";
import "hardhat/console.sol";

contract InviTokenStake is Initializable, OwnableUpgradeable {
    //------Contracts and Addresses------//
    IERC20 public inviToken;
    address public inviCoreAddress;

    //------stake status------//
    mapping(address => uint128) public stakedAmount;
    mapping(address => uint128) public nativeRewardAmount;
    mapping(address => uint128) public inviRewardAmount;
    uint128 public totalStakedAmount;

    //------Unstake------//
    mapping(address => uint256) public unstakeRequestTime;
    mapping(address => uint128) public claimableUnstakeAmount;
    mapping(address => uint128) public unstakeRequestAmount;
    uint128 public totalClaimableInviAmount;
    uint256 public unstakePeriod;

    //------Rewards------//
    uint256 public inviRewardInterval;
    uint256 public inviReceiveInterval;
    uint256 public lastInviRewardedTime;
    uint256 public lastNativeRewardDistributeTime;
    uint128 public totalInviRewardAmount;
    mapping (address => uint128) totalInviRewardAmountByAddress;

    //------addresses status------//
    uint128 public totalAddressNumber;
    mapping(uint128 => address) public addressList;
   

    //====== modifiers ======// 
    modifier onlyInviCore {
        require(msg.sender == inviCoreAddress, "InviTokenStake: msg sender should be invi core");
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

        totalAddressNumber = 0;
    }

    //====== getter functions ======//
    function getUnstakeTime(address _addr) public view returns (uint) {
        require(unstakeRequestTime[_addr] != 0, "InviTokenStake: No unstake request");
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
    function setInviCoreAddress(address _inviCoreAddr) external onlyOwner {
        inviCoreAddress = _inviCoreAddr;
    }

    function setInviTokenAddress(address _inviTokenAddr) external onlyOwner {
        inviToken = IERC20(_inviTokenAddr);
    }
    
    function setUnstakePeriod(uint256 _unstakePeriod) external onlyOwner {
        unstakePeriod = _unstakePeriod;
    }

    //====== service functions ======//
    // stake inviToken
    function stake(uint128 _stakeAmount) public  {
        require(inviToken.transferToken(msg.sender, address(this), _stakeAmount), "InviTokenStake: Failed to transfer inviToken to contract");
        require(_stakeAmount > 0, "InviTokenStake: Stake amount should be bigger than 0");

        // update stake amount
        stakedAmount[msg.sender] += _stakeAmount;
        totalStakedAmount += _stakeAmount;

        // add address to address list if new address
        addressList[totalAddressNumber] = msg.sender;
        totalAddressNumber++;
    }

    function requestUnstake(uint128 _unstakeAmount) public {
        require(unstakeRequestTime[msg.sender] + unstakePeriod < block.timestamp, "InviTokenStake: Already requested unstake");
        require(stakedAmount[msg.sender] >= _unstakeAmount, "InviTokenStake: Unstake Amount cannot be bigger than stake amount");
        
        // update claimable unstake amount
        claimableUnstakeAmount[msg.sender] += unstakeRequestAmount[msg.sender];
    

        // update unstake request time
        unstakeRequestTime[msg.sender] = block.timestamp;

        // update values
        stakedAmount[msg.sender] -= _unstakeAmount;
        unstakeRequestAmount[msg.sender] = _unstakeAmount;
        totalStakedAmount -= _unstakeAmount;
    }

    function cancelUnstake() public {
        require(unstakeRequestAmount[msg.sender] >= 0 && unstakeRequestTime[msg.sender] != 0, "InviTokenStake: unstake amount none");
        require(block.timestamp < unstakePeriod + unstakeRequestTime[msg.sender], "InviTokenStake: cancel period passed");

        // update unstake request time
        unstakeRequestTime[msg.sender] = 0;

        // update values
        stakedAmount[msg.sender] += unstakeRequestAmount[msg.sender];
        unstakeRequestAmount[msg.sender] = 0;
        totalStakedAmount += unstakeRequestAmount[msg.sender];
    }

    // unstake inviToken
    function claimUnstaked() public  {
        require(getClaimableAmount(msg.sender) > 0, "InviTokenStake: no claimable unstake amount");
        uint128 claimableAmount;
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
    function distributeNativeReward() external payable onlyInviCore {
        uint128 receivedReward = uint128(msg.value);
        for (uint128 i = 0; i < totalAddressNumber; i++) {
            address account = addressList[i];
            uint128 rewardAmount = (receivedReward * stakedAmount[account] / totalStakedAmount);
        
            // update rewards
            nativeRewardAmount[account] += rewardAmount;
        }

        // update last distribute time
        lastNativeRewardDistributeTime = block.timestamp;
    }

    // distribute invi token rewards (tbd)
    function distributeInviTokenReward() external {
        require(block.timestamp - lastInviRewardedTime >= inviRewardInterval, "InviTokenStake: Not enough time passed");
        uint128 totalInviToken = uint128(inviToken.balanceOf(address(this)));
        require(totalInviToken - totalClaimableInviAmount > 1000000, "InviTokenStake: Not enough invi token to distribute");

        uint128 intervalVar =uint128(inviReceiveInterval) / uint128(inviRewardInterval);
        for (uint128 i = 0; i < totalAddressNumber; i++) {
            address account = addressList[i];
            uint128 rewardAmount = ((totalInviToken - totalClaimableInviAmount) * stakedAmount[account] / (totalStakedAmount * intervalVar));
            
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
        require(nativeRewardAmount[msg.sender] != 0, "InviTokenStake: no rewards available for this user");
        uint128 rewardAmount = nativeRewardAmount[msg.sender];

        // update reward amount
        nativeRewardAmount[msg.sender] = 0;  

        // send reward to requester
        (bool sent, ) = msg.sender.call{value: rewardAmount}("");
        require(sent, "InviTokenStake: Failed to send reward to requester");
    }

    function claimInviReward() public {
        require(inviRewardAmount[msg.sender] != 0, "InviTokenStake: no rewards available for this user");
        uint128 rewardAmount = inviRewardAmount[msg.sender];

        // update reward amount
        inviRewardAmount[msg.sender] = 0;  
        totalClaimableInviAmount -= rewardAmount;

        // send reward to requester
        require(inviToken.transfer(msg.sender, rewardAmount), "InviTokenStake: Failed to send reward to requester");
    }
    
    //====== utils functions ======//
    
}