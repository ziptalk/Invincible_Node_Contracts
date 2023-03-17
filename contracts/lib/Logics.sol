// SPDX-License-Identifier: MIT
pragma solidity ^0.8;
import "./Unit.sol";

//======LP related logic=======//
// INVI reward amount for LPs 
function LiquidityProviderInviRewardAmount(uint _totalRewardAmount, uint _stakedAmount, uint _totalStakedAmount) pure returns (uint){
    // 총 Liquidity 중 본인의 Liquidity 비중 만큼 invi 제공 
    return ( _totalRewardAmount * _stakedAmount / _totalStakedAmount);
}
// Native reward amount for LPs
function LiquidityProviderNativeRewardAmount(uint _totalRewardAmount, uint _stakedAmount, uint _totalStakedAmount) pure returns (uint){
    // 총 Liquidity 중 본인의 Liquidity 비중 만큼 reward 제공 
    return ( _totalRewardAmount * _stakedAmount / _totalStakedAmount);
}
// ILP receive amount for LPs 
function LiquidityProviderILPReceiveAmount(uint _nativeAmount) pure returns (uint) {
    // nativeAmount 만큼 ILP 제공 
    return _nativeAmount;
}

//======INVI stake related logic======/
function InviTokenStakerNativeRewardAmount(uint _totalRewardAmount, uint _stakedAmount, uint _totalStakedAmount) pure returns (uint) {
    return ( _totalRewardAmount * _stakedAmount / _totalStakedAmount);
}

//======User related Logic======//

// return lock period in seconds
function LockPeriod(uint _leverageRatio) pure returns (uint) {
    uint day = 24 * 60 * 60;
    uint c = 10; // coefficient
    uint e = 3; // exponent
    uint const = 50; // constant
    return (c * (_leverageRatio ** e) / (leverageUnit ** e) + const) * day;
}
function ProtocolFee(uint _lentAmount, uint _leverageRatio, uint _totalLiquidity) pure returns (uint) {
    uint c = 360; //coefficient
    uint minFee = 2 * protocolFeeUnit;
    return (c * _lentAmount * _leverageRatio / (_totalLiquidity * leverageUnit)) * protocolFeeUnit + minFee;
}
function ExpectedReward(uint _amount, uint _lockPeriod, uint _apr) pure returns (uint) {
    // lockPeriod = second, apr = %
    uint oneYear = 60 * 60 * 24 * 365;
    return ((_amount * _lockPeriod * _apr) / (oneYear * aprUnit * 100));
}
function MinReward(uint _amount, uint _lockPeriod, uint _apr, uint _decreaseRatio) pure returns (uint) {
    // lockPeriod = second, apr = %
    uint oneYear = 60 * 60 * 24 * 365;
    return ((_amount * _lockPeriod * _apr * (1 * rewardErrorUnit - _decreaseRatio)) / (oneYear * aprUnit * rewardErrorUnit * 100));
}
function MaxReward(uint _amount, uint _lockPeriod, uint _apr, uint _increaseRatio) pure returns (uint) {
    // lockPeriod = second, apr = %
    uint oneYear = 60 * 60 * 24 * 365;
    return ((_amount * _lockPeriod * _apr * (1 * rewardErrorUnit + _increaseRatio)) / (oneYear * aprUnit * rewardErrorUnit * 100));
}