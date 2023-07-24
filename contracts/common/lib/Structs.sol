// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

struct StakeInfo{
    address user;
    uint256 lockPeriod;
    uint256 lockStart;
    uint256 lockEnd;
    uint128 protocolFee;
    uint128 principal;
    uint128 stakedAmount;
    uint32 originalLeverageRatio;
    uint32 leverageRatio;
    bool isLent;
}

struct LendInfo{
    address user;
    uint128 principal;
    uint128 lentAmount;
    uint32 nftId;
}

struct ExchangeRatio{
    uint32 coinToToken;
    uint32 tokenToCoin;
}

struct UnstakeRequest{
    address recipient;
    uint128 fee;
    uint128 amount;
    uint32 requestType; // 0: user, 1: LP, 2: INVI
    uint32 nftId;
}

struct UnstakeRequestLP {
    address recipient;
    uint256 requestTime;
    uint128 amount;
}
