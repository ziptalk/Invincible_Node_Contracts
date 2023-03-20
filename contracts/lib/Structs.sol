// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

struct StakeInfo{
    address user;
    uint principal;
    uint leverageRatio;
    uint lockPeriod;
    uint lockStart;
    uint lockEnd;
    uint protocolFee;
    uint minReward;
    uint maxReward;
}

struct ExchangeRatio{
    uint coinToToken;
    uint tokenToCoin;
}

struct UnstakeRequest{
    address recipient;
    uint amount;
    uint fee;
}