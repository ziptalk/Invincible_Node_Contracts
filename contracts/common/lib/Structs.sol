// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

struct StakeInfo{
    address user;
    uint32 originalLeverageRatio;
    uint32 leverageRatio;
    uint128 protocolFee;
    uint128 principal;
    uint128 stakedAmount;
    uint256 lockPeriod;
    uint256 lockStart;
    uint256 lockEnd;
    bool isLent;
}

struct LendInfo{
    address user;
    uint32 nftId;
    uint128 principal;
    uint128 minLendAmount;
    uint128 lentAmount;
}

struct ExchangeRatio{
    uint32 coinToToken;
    uint32 tokenToCoin;
}

struct UnstakeRequest{
    address recipient;
    uint32 requestType; // 0: user, 1: LP, 2: INVI
    uint32 nftId;
    uint128 fee;
    uint128 amount;
}

struct UnstakeRequestLP {
    address recipient;
    uint128 amount;
    uint256 requestTime;
}
