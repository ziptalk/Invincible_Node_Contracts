// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/external/IERC20.sol";
import "./lib/AddressUtils.sol";
import "hardhat/console.sol";

contract InviTokenStake is Initializable, OwnableUpgradeable {
    //------Contracts and Addresses------//
    IERC20 public inviToken;
    address public inviCoreAddress;

    bool private _locked;
    bool private _setInviTokenAddress;
    bool private _setInvicoreAddress;

    //------stake status------//
    mapping(address => uint128) public stakedAmount;
    mapping(address => uint128) public nativeRewardAmount;
    mapping(address => uint128) public inviRewardAmount;
    uint128 public totalStakedAmount;
    uint128 public minStakeAmount;

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
   

    //====== upgrades ======//
    //====== modifiers ======// 
    modifier nonReentrant() {
        require(!_locked, "Reentrant call detected");
        _locked = true;
        _;
        _locked = false;
    }
    modifier onlyInviCore {
        require(msg.sender == inviCoreAddress, "InviTokenStake: msg sender should be invi core");
        _;
    }
    
    //====== initializer ======//
    /**
     * @dev Initializes the contract.
     * @param _inviTokenAddr The address of the InviToken contract.
     */
    function initialize(address _inviTokenAddr) public initializer {
        __Ownable_init();
        inviToken = IERC20(_inviTokenAddr);

        inviRewardInterval = 1 hours; // testnet : 1 hours
        // inviRewardInterval = 1 days; // mainnet : 1 days

        inviReceiveInterval = 30 hours; // testnet : 30 hours
        // inviReceiveInterval = 90 days; // mainnet : 90 days

        lastInviRewardedTime = block.timestamp - inviRewardInterval;

        unstakePeriod = 7 days; // testnet : 1 min (for test) mainnet: 7 days

        totalAddressNumber = 0;
        _locked = false;

        minStakeAmount = 10**16;
    }

    //====== getter functions ======//
    /**
     * @notice get unstake complete time of address
     * @param _addr target address
     */
    function getUnstakeTime(address _addr) public view returns (uint) {
        require(unstakeRequestTime[_addr] != 0, "InviTokenStake: No unstake request");
        return unstakeRequestTime[_addr] + unstakePeriod;
    }

    /**
     * @notice get claimable unstake amount of address
     * @param _addr target address
     */
    function getClaimableAmount(address _addr) public view returns (uint) {
        if (block.timestamp >= getUnstakeTime(_addr)) {
            return unstakeRequestAmount[_addr] + claimableUnstakeAmount[_addr];
        } else {
            return claimableUnstakeAmount[_addr];
        }
    }
    
    //====== setter functions ======//
    /**
     * @notice Set inviCore address
     * @dev can be called only once by owner
     * @param _inviCoreAddr inviCore address.
     */
    function setInviCoreAddress(address _inviCoreAddr) external onlyOwner {
        require(!_setInvicoreAddress, "InviTokenStake: inviCore address already set");
        inviCoreAddress = _inviCoreAddr;
        _setInvicoreAddress = true;
    }

    /**
     * @notice Set inviToken address
     * @dev can be called only once by owner
     * @param _inviTokenAddr The new inviToken address.
     */
    function setInviTokenAddress(address _inviTokenAddr) external onlyOwner {
        require(!_setInviTokenAddress, "InviTokenStake: inviToken address already set");
        inviToken = IERC20(_inviTokenAddr);
        _setInviTokenAddress = true;
    }
    
    /**
     * @notice Set unstake period
     * @dev can be called only by owner
     * @param _unstakePeriod The new unstake period.
     */
    function setUnstakePeriod(uint256 _unstakePeriod) external onlyOwner {
        require(_unstakePeriod > 1 days && _unstakePeriod < 30 days, "InviTokenStake: unstake period should be between 1 day and 30 days");
        unstakePeriod = _unstakePeriod;
    }

     /**
     * @notice Set the minimum stake amount
     * @dev can be called only by owner
     * @param _minStakeAmount The new minimum stake amount.
     */
    function setMinStakeAmount(uint128 _minStakeAmount) external onlyOwner {
        minStakeAmount = _minStakeAmount;
    }

    //====== service functions ======//
    /**
     * @notice stake inviToken
     * @dev prevents reentrancy attack
     * @param _stakeAmount stake amount
     */
    function stake(uint128 _stakeAmount) external nonReentrant {
        require(_stakeAmount >= minStakeAmount, "InviTokenStake: stake amount should be bigger than min stake amount");
        require(inviToken.transferToken(msg.sender, address(this), _stakeAmount), "InviTokenStake: Failed to transfer inviToken to contract");
        require(_stakeAmount > 0, "InviTokenStake: Stake amount should be bigger than 0");

        // update stake amount
        stakedAmount[msg.sender] += _stakeAmount;
        totalStakedAmount += _stakeAmount;

        // add address to address list if new address
        addressList[totalAddressNumber] = msg.sender;
        totalAddressNumber++;
    }

    /**
     * @notice request unstake
     * @dev prevents reentrancy attack
     * @param _unstakeAmount unstake amount
     */
    function requestUnstake(uint128 _unstakeAmount) external nonReentrant {
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

    /**
     * @notice cancel unstake request
     * @dev prevents reentrancy attack
     */
    function cancelUnstake() external nonReentrant {
        require(unstakeRequestAmount[msg.sender] >= 0 && unstakeRequestTime[msg.sender] != 0, "InviTokenStake: unstake amount none");
        require(block.timestamp < unstakePeriod + unstakeRequestTime[msg.sender], "InviTokenStake: cancel period passed");

        // update unstake request time
        unstakeRequestTime[msg.sender] = 0;

        // update values
        stakedAmount[msg.sender] += unstakeRequestAmount[msg.sender];
        unstakeRequestAmount[msg.sender] = 0;
        totalStakedAmount += unstakeRequestAmount[msg.sender];
    }

    /**
     * @notice claim unstaked inviToken
     * @dev prevents reentrancy attack
     */
    function claimUnstaked() external nonReentrant {
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

    /**
     * @notice distribute native token rewards by InviCore
     * @dev can be called only by inviCore
     * @dev prevents reentrancy attack
     */
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

    /**
     * @notice distribute invi token rewards. Require interval time passed
     * @dev prevents reentrancy attack
     * @dev require interval time passed
     */
    function distributeInviTokenReward() external nonReentrant {
        require(block.timestamp >= inviRewardInterval + lastInviRewardedTime, "InviTokenStake: Not enough time passed");
        uint128 totalInviToken = uint128(inviToken.balanceOf(address(this)));
        require(totalInviToken > 1000000 + totalClaimableInviAmount + totalStakedAmount, "InviTokenStake: Not enough invi token to distribute");

        uint128 intervalVar = uint128(inviReceiveInterval) / uint128(inviRewardInterval);
        uint256 rewardTotal = (totalInviToken - totalClaimableInviAmount- totalStakedAmount) / intervalVar;
        for (uint128 i = 0; i < totalAddressNumber;) {
            address account = addressList[i];
            if (stakedAmount[account] == 0) continue;
            uint256 rewardAmount = rewardTotal * stakedAmount[account] / totalStakedAmount;
            uint128 reward = uint128(rewardAmount);

            // update rewards
            inviRewardAmount[account] += reward;
            totalInviRewardAmount += reward;
            totalClaimableInviAmount += reward;
            totalInviRewardAmountByAddress[account] += reward;

            unchecked {i++;}
        }

        lastInviRewardedTime = block.timestamp;
    }

    /**
     * @notice Claim the native coin rewards.
     * @dev prevents reentrancy attack
     */
    function claimNativeReward() external nonReentrant {
        require(nativeRewardAmount[msg.sender] > 0, "InviTokenStake: no rewards available for this user");
        require(address(this).balance > nativeRewardAmount[msg.sender], "InviTokenStake: Insufficient claimable amount");

        uint128 rewardAmount = nativeRewardAmount[msg.sender];

        // update reward amount
        nativeRewardAmount[msg.sender] = 0;  

        // send reward to requester
        (bool sent, ) = msg.sender.call{value: rewardAmount}("");
        require(sent, "InviTokenStake: Failed to send reward to requester");
    }

    
    /**
     * @notice Claim the INVI token rewards.
     * @dev prevents reentrancy attack
     */
    function claimInviReward() external nonReentrant {
        require(inviRewardAmount[msg.sender] > 0, "InviTokenStake: no rewards available for this user");
        require(inviToken.balanceOf(address(this)) > inviRewardAmount[msg.sender], "InviTokenStake: Insufficient claimable amount");
        uint128 rewardAmount = inviRewardAmount[msg.sender];

        // update reward amount
        inviRewardAmount[msg.sender] = 0;  
        totalClaimableInviAmount -= rewardAmount;

        // send reward to requester
        require(inviToken.transfer(msg.sender, rewardAmount), "InviTokenStake: Failed to send reward to requester");
    }
    
    //====== utils functions ======//
    
}