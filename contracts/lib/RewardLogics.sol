// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

//======LP related logic=======//
// INVI reward amount for LPs 
function LiquidityProviderInviRewardAmount(uint _totalRewardAmount, uint _stakedAmount, uint _totalStakedAmount) pure returns (uint){
    return ( _totalRewardAmount * _stakedAmount / _totalStakedAmount);
}
// Native reward amount for LPs
function LiquidityProviderNativeRewardAmount(uint _totalRewardAmount, uint _stakedAmount, uint _totalStakedAmount) pure returns (uint){
    return ( _totalRewardAmount * _stakedAmount / _totalStakedAmount);
}
// ILP receive amount for LPs 
function LiquidityProviderILPReceiveAmount(uint _nativeAmount) pure returns (uint) {
    return _nativeAmount;
}

//======INVI stake related logic======/
function InviTokenStakerNativeRewardAmount(uint _totalRewardAmount, uint _stakedAmount, uint _totalStakedAmount) pure returns (uint) {
    return ( _totalRewardAmount * _stakedAmount / _totalStakedAmount);
}

//======User related Logic======//
function LockPeriod(uint _leverageRatio) pure returns (uint) {
    uint day = 24 * 60 * 60;
    uint c = 10; // coefficient
    uint e = 3; // exponent
    return c * (_leverageRatio ** e) * day;
}
function ProtocolFee(uint _lentAmount, uint _leverageRatio) pure returns (uint) {
    uint c = 5000; //coefficient
    
}
function ExpectedReward(uint _lentAmount, uint _leverageRatio) view returns (uint) {

}