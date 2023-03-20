// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

// general error
string constant ERROR_NOT_OWNER = "not authorized";
string constant ERROR_INSUFFICIENT_BALANCE = "insufficient balance";
string constant ERROR_FAIL_SEND = "failed to send";

// stake info error
string constant ERROR_EXCEED_LENNT_AMOUNT = "exceed the maximum lent amount";
string constant ERROR_INVALID_STAKE_INFO = "invalid stake info";
string constant ERROR_NOT_OWNED_NFT = "not your own nft";
string constant ERROR_TOO_MUCH_LENT = "too much lent amount";
string constant ERROR_NOT_UNLOCKED_NFT = "the nft is still locked";
string constant ERROR_NOT_MATCH_REWARD = "reward is not correct";

// setter error
string constant ERROR_SET_REWARD_PORTION = "lp pool portion + invi stake portion should equal to rewardPortionTotalUnit";
string constant ERROR_NFT_REWARD_CRASH = "initial nft reward should be zero";
string constant ERROR_NFT_REWARD_INVALID_RANGE = "nft reward should be between min reward and max reward";