// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./interfaces/IERC20.sol";
import "./lib/AddressUtils.sol";
import "./lib/RewardLogics.sol";

address constant STAKE_MANAGER = 0x81DB617Fe8f2f38F949f8f1Ee4E9DB7f164408CE;

contract InviTokenStake is Initializable {

    IERC20 public inviToken;
    address public owner;

    // stake status
    mapping(address => uint) public stakedAmount;
    mapping(address => uint) public rewardAmount;
    uint public totalStakedAmount;

    // addresses status
    address[] public addressList;
    uint public totalAddressNumber;

    //====== modifiers ======//
    modifier onlyOwner() {
        require(msg.sender == owner, "not authorized");
        _;
    }
    //====== initializer ======//
    function initialize(address _invi) public initializer {
        inviToken = IERC20(_invi);
        owner = msg.sender;
    }

    //====== getter functions ======//
    
    //====== setter functions ======//
    function setOwner(address _newOwner) public onlyOwner {
        owner = _newOwner;
    }

    //====== service functions ======//

    // stake inviToken
    function stake(uint _stakeAmount) public returns (bool) {
        require(inviToken.transferFrom(msg.sender, address(this), _stakeAmount), "Failed to transfer inviToken to contract");

        // update stake amount
        stakedAmount[msg.sender] += _stakeAmount;
        totalStakedAmount += _stakeAmount;

        // add address to address list if new address
        addAddress(addressList, msg.sender);
        totalAddressNumber = addressList.length;
    }

    // unstake inviToken
    function unStake(uint _unstakeAmount) public returns (bool) {
        // update stake amount
        require(stakedAmount[msg.sender] >= _unstakeAmount, "Unstake Amount cannot be bigger than stake amount");
        stakedAmount[msg.sender] -= _unstakeAmount;

        require(inviToken.transfer(msg.sender, _unstakeAmount));
    }

    // update rewards
    function updateReward() public payable {
        // require(msg.sender == STAKE_MANAGER, "Sent from Wrong Address");
        for (uint256 i = 0; i < addressList.length; i++) {
            _updateAccountReward(addressList[i], msg.value);
        }
    }

    // user receive reward(native coin) function
    function receiveReward() public {
        require(rewardAmount[msg.sender] != 0, "no rewards available for this user");
        uint reward = rewardAmount[msg.sender];
        rewardAmount[msg.sender] = 0;  
        
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
        rewardAmount[_account] += accountReward;
    }
}