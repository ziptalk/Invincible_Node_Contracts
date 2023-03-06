// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "./interfaces/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract LiquidityProviderPool is ReentrancyGuard {
    
    IERC20 public iLP;
    address constant public LP_MANAGER;

    // lp status
    mapping(address => uint) public stakedAmount;
    uint public totalStaked;

    constructor(address _iLP) {
        iLP = IERC20(_iLP);
    }
    receive() {

    }
    fallback() {
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
    }

}