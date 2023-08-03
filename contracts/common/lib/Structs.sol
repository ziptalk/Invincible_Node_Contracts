// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

struct StakeInfo{
    address user;
    uint256 lockPeriod;
    uint256 lockStart;
    uint256 lockEnd;
    uint256 protocolFee;
    uint256 principal;
    uint256 stakedAmount;
    uint32 originalLeverageRatio;
    uint32 leverageRatio;
    bool isLent;
}

struct LendInfo{
    address user;
    uint256 principal;
    uint256 lentAmount;
    uint32 nftId;
}

struct ExchangeRatio{
    uint32 coinToToken;
    uint32 tokenToCoin;
}

struct UnstakeRequest{
    address recipient;
    uint256 fee;
    uint256 amount;
    uint32 requestType; // 0: user, 1: LP, 2: INVI
    uint32 nftId;
}

struct UnstakeRequestLP {
    address recipient;
    uint256 requestTime;
    uint256 amount;
}
