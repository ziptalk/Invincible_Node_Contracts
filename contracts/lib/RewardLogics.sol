// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

// LP Reward Logic
function LiquidityProviderInviRewardAmount(uint _totalRewardAmount, uint _stakedAmount, uint _totalStakedAmount) pure returns (uint){
    return ( _totalRewardAmount * _stakedAmount / _totalStakedAmount);
}
function LiquidityProviderNativeRewardAmount(uint _totalRewardAmount, uint _stakedAmount, uint _totalStakedAmount) pure returns (uint){
    return ( _totalRewardAmount * _stakedAmount / _totalStakedAmount);
}
function LiquidityProviderILPReceiveAmount(uint _nativeAmount) pure returns (uint) {
    return _nativeAmount;
}

// INVI Token staker Reward Logic
function InviTokenStakerNativeRewardAmount(uint _totalRewardAmount, uint _stakedAmount, uint _totalStakedAmount) pure returns (uint) {
    return ( _totalRewardAmount * _stakedAmount / _totalStakedAmount);
}