// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "../interfaces/IERC20.sol";
import "../common/lib/AddressUtils.sol";
import "../common/lib/Logics.sol";
import "../common/lib/ErrorMessages.sol";
import "hardhat/console.sol";

contract KlaytnInviTokenStake is Initializable, OwnableUpgradeable {
    //------Contracts and Addresses------//
    IERC20 public inviToken;
    address public inviCoreAddress;

    //------stake status------//
    mapping(address => uint) public stakedAmount;
    mapping(address => uint) public nativeRewardAmount;
    mapping(address => uint) public inviRewardAmount;
    uint public totalStakedAmount;

    //------ratio------//
    uint public inviRewardInterval;
    uint public inviReceiveInterval;
    uint public lastInviRewardedTime;

    //------addresses status------//
    address[] public addressList;
    uint public totalAddressNumber;

    //------ Upgrades ------//
    uint public lastNativeRewardDistributeTime;
    uint public unstakePeriod;
    mapping(address => uint) public unstakeRequestTime;
    mapping(address => uint) public claimableUnstakeAmount;


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
    }

    //====== getter functions ======//
    
    //====== setter functions ======//


    function setInviCoreAddress(address _inviCoreAddr) public onlyOwner {
        inviCoreAddress = _inviCoreAddr;
    }

    function setInviTokenAddress(address _inviTokenAddr) public onlyOwner {
        inviToken = IERC20(_inviTokenAddr);
    }
   
    //====== service functions ======//

    /**
     * @notice stake inviToken
     */
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
        require(stakedAmount[msg.sender] >= _unstakeAmount, "Unstake Amount cannot be bigger than stake amount");
        require(unstakeRequestTime[msg.sender] == 0, "Already requested unstake");

        // update unstake request time
        unstakeRequestTime[msg.sender] = block.timestamp;

        // update values
        stakedAmount[msg.sender] -= _unstakeAmount;
        claimableUnstakeAmount[msg.sender] += _unstakeAmount;
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
        claimableUnstakeAmount[msg.sender] = 0;
        totalStakedAmount += claimableUnstakeAmount[msg.sender];
    }

    // unstake inviToken
    function claimUnstaked() public  {
        require(claimableUnstakeAmount[msg.sender] >= 0, "no claimable unstake amount");
        require(unstakeRequestTime[msg.sender] != 0, "No unstake request");
        require(block.timestamp >= unstakePeriod + unstakeRequestTime[msg.sender], "unstake period not passed");

        // update claimable unstake amount
        uint claimableAmount = claimableUnstakeAmount[msg.sender];
        claimableUnstakeAmount[msg.sender] = 0;

        // send invi Token to requester
        require(inviToken.transfer(msg.sender, claimableAmount));
    }

    // /**
    //  * @notice unstake inviToken
    //  */
    // function unStake(uint _unstakeAmount) public  {
    //     // update stake amount
    //     require(stakedAmount[msg.sender] >= _unstakeAmount, "Unstake Amount cannot be bigger than stake amount");
    //     stakedAmount[msg.sender] -= _unstakeAmount;
    //     // update total staked amount
    //     totalStakedAmount -= _unstakeAmount;

    //     require(inviToken.transfer(msg.sender, _unstakeAmount));
    // }

    /**
     * @notice distribute native coin rewards
     */
    function updateNativeReward() external payable onlyInviCore {
        // require(msg.sender == STAKE_MANAGER, "Sent from Wrong Address");
        for (uint256 i = 0; i < addressList.length; i++) {
            address account = addressList[i];
            uint rewardAmount = (msg.value * stakedAmount[account] / totalStakedAmount);
            console.log("reward: ", rewardAmount);
            nativeRewardAmount[account] += rewardAmount;
        }

        lastNativeRewardDistributeTime = block.timestamp;
    }

    /**
     * @notice distribute inviToken rewards
     */
    function updateInviTokenReward() external onlyOwner{
        require(block.timestamp - lastInviRewardedTime >= inviRewardInterval, ERROR_DISTRIBUTE_INTERVAL_NOT_REACHED);
        uint totalInviToken = inviToken.balanceOf(address(this));
        for (uint256 i = 0; i < addressList.length; i++) {
            address account = addressList[i];
            uint rewardAmount = (totalInviToken * stakedAmount[account] / (totalStakedAmount * (inviReceiveInterval / inviRewardInterval)));
            inviRewardAmount[account] += rewardAmount;
        }

        lastInviRewardedTime = block.timestamp;
    }

    /**
     * @notice user receive reward(native coin) function
     */
    function claimNativeReward() public {
        require(nativeRewardAmount[msg.sender] != 0, "no rewards available for this user");
        uint reward = nativeRewardAmount[msg.sender];
        nativeRewardAmount[msg.sender] = 0;  
        
        // send reward to requester
        (bool sent, ) = msg.sender.call{value: reward}("");
        require(sent, "Failed to send reward to requester");
    }

    /**
     * @notice user receive reward(inviToken) function
     */
    function claimInviReward() public {
        require(inviRewardAmount[msg.sender] != 0, "no rewards available for this user");
        uint reward = inviRewardAmount[msg.sender];
        inviRewardAmount[msg.sender] = 0;  
        
        // send reward to requester
        require(inviToken.transfer(msg.sender, reward), "Failed to send reward to requester");
    }
    
    //====== utils functions ======//
    
}