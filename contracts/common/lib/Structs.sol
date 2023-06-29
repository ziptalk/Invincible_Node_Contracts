// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

struct StakeInfo{
    address user;
    uint principal;
    uint leverageRatio;
    uint stakedAmount;
    uint lockPeriod;
    uint lockStart;
    uint lockEnd;
    uint protocolFee;
    bool isLent;
}

struct LendInfo{
    address user;
    uint nftId;
    uint principal;
    uint minLendAmount;
    uint lentAmount;
}

struct ExchangeRatio{
    uint coinToToken;
    uint tokenToCoin;
}

struct UnstakeRequest{
    address recipient;
    uint nftId;
    uint amount;
    uint fee;
    uint requestType; // 0: user, 1: LP, 2: INVI
}

struct UnstakeRequestLP {
    address recipient;
    uint amount;
    uint requestTime;
}