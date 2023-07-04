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
    // uint testnetConstant = 24 * 60;
    uint onlyForTestConstant = 24 * 60 * 600;
    
    // apply testnetConstant for only testnet
    return (c * (_leverageRatio ** e) / (LEVERAGE_UNIT ** e) + const) * day / onlyForTestConstant;

    // for mainnet
    //return (c * (_leverageRatio ** e) / (LEVERAGE_UNIT ** e) + const) * day;
}
function ProtocolFee(uint _lentAmount, uint _leverageRatio, uint _totalLiquidity) pure returns (uint) {
    uint c = 360; //coefficient
    uint minFee = 2 * PROTOCOL_FEE_UNIT;
    return (c * _lentAmount * _leverageRatio / (_totalLiquidity * LEVERAGE_UNIT)) * PROTOCOL_FEE_UNIT+ minFee;
}
function ExpectedReward(uint _amount, uint _lockPeriod, uint _apr) pure returns (uint) {
    // lockPeriod = second, apr = %
    uint oneYear = 60 * 60 * 24 * 365;
    return ((_amount * _lockPeriod * _apr) / (oneYear * APR_UNIT * 100));
}

function StakedAmount(uint _principal, uint _leverageRatio) pure returns (uint) {
    return _principal * _leverageRatio / LEVERAGE_UNIT;
}