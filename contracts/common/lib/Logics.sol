// SPDX-License-Identifier: MIT
pragma solidity ^0.8;
import "./Unit.sol";
import "hardhat/console.sol";

//======User related Logic======//

// return lock period in seconds
function LockPeriod(uint32 _leverageRatio) pure returns (uint256) {
    uint32 day = 24 * 60 * 60;
    uint32 c = 10; // coefficient
    uint32 e = 3; // exponent
    uint32 const = 50; // constant
    // uint testnetConstant = 24 * 60;
    uint32 onlyForTestConstant = 24 * 60 * 600;
    
    // apply testnetConstant for only testnet
    return (c * uint128(_leverageRatio) ** e / uint128(LEVERAGE_UNIT) ** e + const) * day / onlyForTestConstant;

    // for mainnet
    // return (c * uint128(_leverageRatio) ** e / uint128(LEVERAGE_UNIT) ** e + const) * day;
}
function ProtocolFee(uint128 _lentAmount, uint32 _leverageRatio, uint128 _totalLiquidity) pure returns (uint128) {
    uint32 c = 360; //coefficient
    uint32 minFee = 2 * PROTOCOL_FEE_UNIT;
    return (c * _lentAmount * _leverageRatio / (_totalLiquidity * LEVERAGE_UNIT)) * PROTOCOL_FEE_UNIT+ minFee;
}
function ExpectedReward(uint128 _amount, uint256 _lockPeriod, uint32 _apr) pure returns (uint) {
    // lockPeriod = second, apr = %
    uint128 oneYear = 60 * 60 * 24 * 365;
    return ((_amount * _lockPeriod * _apr) / (oneYear * APR_UNIT * 100));
}

function StakedAmount(uint128 _principal, uint32 _leverageRatio) pure returns (uint128) {
    return _principal * _leverageRatio / LEVERAGE_UNIT;
}