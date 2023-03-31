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
    uint minReward;
    uint maxReward;
    bool isLent;
}

struct LendInfo{
    address user;
    uint nftId;
    uint principal;
    uint lentAmount;
}

struct ExchangeRatio{
    uint coinToToken;
    uint tokenToCoin;
}

struct UnstakeRequest{
    address recipient;
    uint amount;
    uint fee;
    uint requestType; // 0: user, 1: LP, 2: INVI

}