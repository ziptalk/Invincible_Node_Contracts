// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IERC20.sol";
import "./lib/AddAddress.sol";

contract LiquidityProviderPool is ReentrancyGuard {
     using AddAddress for address[];

    
    IERC20 public iLP;
    address constant public LP_MANAGER = 0x8fd6A85Ca1afC8fD3298338A6b23c5ad5469488E; 

    // lp status
    mapping(address => uint) public stakedAmount;
    uint public totalStaked;

    // addresses status
    address[] public addressList;
    uint public totalAddressNumber;

    constructor(address _iLP) {
        iLP = IERC20(_iLP);
    }
    receive() external payable {

    }
    fallback() external payable {
        _stake(msg.sender, msg.value);
    }

    // stake Native Coin to LP Pool
    function _stake(address _sender, uint _stakeAmount) private {
        // update stake amount
        stakedAmount[_sender] += _stakeAmount;
        totalStaked += _stakeAmount;

        // mint and tranfer ILP to sender
        iLP.mintToken(_sender, _stakeAmount);
        iLP.transfer(_sender, _stakeAmount);
        
        // send coin to LP manager
        (bool sent, ) = LP_MANAGER.call{value: msg.value}("");
        require(sent, "Failed to send coin to LP Manager");

        // add address to address list if new address
        addressList.addAddress(msg.sender);
        totalAddressNumber = addressList.length;
    }



}