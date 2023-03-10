// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interfaces/IERC20.sol";
import "./lib/AddressUtils.sol";
import "./lib/RewardLogics.sol";

contract LiquidityProviderPool is Initializable {

    IERC20 public iLP;
    IERC20 public inviToken;
    address constant public STAKE_MANAGER = 0x8fd6A85Ca1afC8fD3298338A6b23c5ad5469488E; 
    address public owner;

    // lp status
    mapping(address => uint) public stakedAmount;
    uint public totalStakedAmount;
    uint public totalLended;
    mapping(address => uint) public nativeRewardAmount;
    mapping(address => uint) public inviRewardAmount;

    // addresses status
    address[] public addressList;
    uint public totalAddressNumber;

    function initialize(address _iLP, address _inviToken) public initializer {
        iLP = IERC20(_iLP);
        inviToken = IERC20(_inviToken);
        owner = msg.sender;
    }

    receive() external payable {

    }

    // stake Native Coin to LP Pool
    function stake() public payable {
        // update stake amount
        stakedAmount[msg.sender] += msg.value;
        totalStakedAmount += msg.value;

        // mint and tranfer ILP to sender
        iLP.mintToken(msg.sender, msg.value);
        
        // send coin to LP manager
        (bool sent, ) = STAKE_MANAGER.call{value: msg.value}("");
        require(sent, "Failed to send coin to Stake Manager");

        // add address to address list if new address
        addAddress(addressList, msg.sender);
        totalAddressNumber = addressList.length;
    }

     // update rewards
    function updateReward() public payable {
        // require(msg.sender == STAKE_MANAGER, "Sent from Wrong Address");
        for (uint256 i = 0; i < addressList.length; i++) {
            _updateAccountReward(addressList[i], msg.value);
        }
    }

    function _updateAccountReward(address _account, uint256 _totalRewardAmount) private {
        // get Account native token reward 
        uint accountNativeReward = LiquidityProviderNativeRewardAmount(_totalRewardAmount, stakedAmount[_account], totalStakedAmount);
        
        // get Account invi Reward
        uint accountInviReward = LiquidityProviderInviRewardAmount(_totalRewardAmount, stakedAmount[_account], totalStakedAmount);

        // update account native reward
        nativeRewardAmount[_account] += accountNativeReward;

        // update account invi reward
        inviRewardAmount[_account] += accountInviReward;
    }

    function receiveReward() public {
        require(nativeRewardAmount[msg.sender] != 0 || inviRewardAmount[msg.sender] != 0, "no rewards available for this user");
        uint nativeReward = nativeRewardAmount[msg.sender];
        uint inviReward = inviRewardAmount[msg.sender];
        nativeRewardAmount[msg.sender] = 0; 
        inviRewardAmount[msg.sender] = 0;

        // send native reward to requester 
        (bool sent, ) = msg.sender.call{value: nativeReward}("");
        require(sent, "Failed to send reward to requester");

        // send INVI token to requester
        inviToken.mintToken(msg.sender, inviReward);
    }
}