// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./interfaces/IERC20.sol";
import "./lib/AddAddress.sol";

contract InviTokenStake is ReentrancyGuard {
    using AddressUtils for address[];

    IERC20 public inviToken;
    address public owner;

    // stake status
    mapping(address => uint) public stakedAmount;
    mapping(address => uint) public rewardAmount;
    uint public totalStakedAmount;

    // addresses status
    address[] public addressList;
    uint public totalAddressNumber;

    constructor(address _invi) {
        inviToken = IERC20(_invi);
        owner = msg.sender;
    }

    receive() external payable {

    }
    fallback() external payable {
        // update reward when receive native coin
        _updateReward(msg.value);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not authorized");
        _;
    }
    
    // stake inviToken
    function stake(uint _stakeAmount) public returns (bool) {
        require(inviToken.transferFrom(msg.sender, address(this), _stakeAmount), "Failed to transfer inviToken to contract");

        // update stake amount
        stakedAmount[msg.sender] += _stakeAmount;
        totalStakedAmount += _stakeAmount;

        // add address to address list if new address
        addressList.addAddress(msg.sender);
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
    function _updateReward(uint256 _totalRewardAmount) private {
        for (uint256 i = 0; i < addressList.length; i++) {
            updateAccountReward(addressList[i], _totalRewardAmount);
        }
    }
    function _updateAccountReward(address _account, uint256 _totalRewardAmount) private {
        // get Account reward 
        uint256 accountReward = _totalRewardAmount * stakedAmount[_account] / totalStakedAmount;
        
        // update account reward
        rewardAmount[_account] += accountReward;
    }

    // user receive reward(native coin) function
    function receiveReward() public nonReentrant{
        require(rewardAmount[msg.sender] != 0, "no rewards available for this user");
        rewardAmount[msg.sender] = 0;

        require(inviToken.transfer(msg.sender, rewardAmount[msg.sender]), "transfer error");
    }
}