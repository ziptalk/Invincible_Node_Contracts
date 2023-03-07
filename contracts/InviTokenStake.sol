// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "./interfaces/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract InviTokenStake is ReentrancyGuard {
    IERC20 public inviToken;

    mapping(address => uint) public stakedAmount;
    uint public totalStakedAmount;

    constructor(address _invi) {
        inviToken = IERC20(_invi);
    }
    
    // stake inviToken
    function stake(uint _stakeAmount) public returns (bool) {
        require(inviToken.transferFrom(msg.sender, address(this), _stakeAmount), "Failed to transfer inviToken to contract");

        // update stake amount
        stakedAmount[msg.sender] += _stakeAmount;
        totalStakedAmount += _stakeAmount;


    }

    // unstake inviToken
    function unStake(uint _unstakeAmount) public returns (bool) {
        // update stake amount
        require(stakedAmount[msg.sender] >= _unstakeAmount, "Unstake Amount cannot be bigger than stake amount");
        stakedAmount[msg.sender] -= _unstakeAmount;

        require(inviToken.transfer(msg.sender, _unstakeAmount));
    }

    // split rewards
    function splitRewards() public returns (bool) {
        
    }
}