// SPDX-License-Identifier: MIT
pragma solidity ^0.8;
import "./Unit.sol";
import "hardhat/console.sol";

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
function MinReward(uint _amount, uint _lockPeriod, uint _apr, uint _decreaseRatio) view returns (uint) {
    // lockPeriod = second, apr = %
    uint oneYear = 60 * 60 * 24 * 365;
    return ((_amount * _lockPeriod * _apr * (100 * rewardErrorUnit - _decreaseRatio)) / (oneYear * aprUnit * rewardErrorUnit * 100));
}
function MaxReward(uint _amount, uint _lockPeriod, uint _apr, uint _increaseRatio) pure returns (uint) {
    // lockPeriod = second, apr = %
    uint oneYear = 60 * 60 * 24 * 365;
    return ((_amount * _lockPeriod * _apr * (100 * rewardErrorUnit + _increaseRatio)) / (oneYear * aprUnit * rewardErrorUnit * 100));
}

function StakedAmount(uint _principal, uint _leverageRatio) pure returns (uint) {
    return _principal * _leverageRatio / leverageUnit;
}