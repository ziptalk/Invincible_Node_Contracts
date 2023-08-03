// SPDX-License-Identifier: MIT
pragma solidity ^0.8;
import "./Unit.sol";
import "hardhat/console.sol";

//======User related Logic======//
library Logics {
    // return lock period in seconds
    function LockPeriod(uint32 _leverageRatio)internal pure returns (uint32) {
        uint32 day = 24 * 60 * 60;
        uint32 c = 10; // coefficient
        uint32 e = 3; // exponent
        uint32 const = 50; // constant
        uint32 onlyForTestConstant =1; // for test: 200 / 24 * 60 * 600
        uint256 lockPeriod = (c * uint256(_leverageRatio) ** e / uint256(LEVERAGE_UNIT) ** e + const) * day / onlyForTestConstant;
        // apply testnetConstant for only testnet
        return uint32(lockPeriod);

        // for mainnet
        // return (c * uint256(_leverageRatio) ** e / uint256(LEVERAGE_UNIT) ** e + const) * day;
    }
    function ProtocolFee(uint256 _lentAmount, uint32 _leverageRatio, uint256 _totalLiquidity)internal pure returns (uint256) {
        uint32 c = 360; //coefficient
        uint32 minFee = 2 * PROTOCOL_FEE_UNIT;
        return (c * _lentAmount * _leverageRatio / (_totalLiquidity * LEVERAGE_UNIT)) * PROTOCOL_FEE_UNIT+ minFee;
    }
    function ExpectedReward(uint256 _amount, uint256 _lockPeriod, uint32 _apr)internal pure returns (uint256) {
        // lockPeriod = second, apr = %
        uint256 oneYear = 60 * 60 * 24 * 365;
        uint256 expectedReward = (_amount * _lockPeriod * _apr) / (oneYear * APR_UNIT * 100);
        return expectedReward;
    }

    function StakedAmount(uint256 _principal, uint32 _leverageRatio)internal pure returns (uint256) {
        return _principal * _leverageRatio / LEVERAGE_UNIT;
    }
}