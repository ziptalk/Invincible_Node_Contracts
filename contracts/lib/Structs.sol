// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

struct StakeInfo{
    address user;
    uint principal;
    uint leverageRatio;
    uint lockPeriod;
    uint protocolFee;
    uint expectedReward;
}

struct ExchangeRatio{
    uint coinToToken;
    uint tokenToCoin;
}