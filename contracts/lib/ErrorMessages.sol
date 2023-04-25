// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

// general error
string constant ERROR_NOT_OWNER = "not authorized";
string constant ERROR_INSUFFICIENT_BALANCE = "insufficient balance";
string constant ERROR_FAIL_SEND = "failed to send";
string constant ERROR_FAIL_SEND_ERC20 = "failed to send erc20 token";

// stake info error
string constant ERROR_EXCEED_LENT_AMOUNT = "exceed the maximum lent amount";
string constant ERROR_INVALID_STAKE_INFO = "invalid stake info";
string constant ERROR_NOT_OWNED_NFT = "not your own nft";
string constant ERROR_TOO_MUCH_LENT = "too much lent amount";
string constant ERROR_NOT_UNLOCKED_NFT = "the nft is still locked";
string constant ERROR_NOT_MATCH_REWARD = "reward is not correct";

// lend info error
string constant ERROR_INVALID_LEND_INFO = "invalid lend info";
string constant ERROR_NOT_FOUND_LEND_INFO = "not found lend info";

// setter error
string constant ERROR_SET_REWARD_PORTION = "lp pool portion + invi stake portion should equal to rewardPortionTotalUnit";
string constant ERROR_NFT_REWARD_CRASH = "initial nft reward should be zero";
string constant ERROR_NFT_REWARD_INVALID_RANGE = "nft reward should be between min reward and max reward";

// swap error
string constant ERROR_SWAP_SLIPPAGE = "swap slippage is too high";
string constant ERROR_ADD_LIQUIDITY_SLIPPAGE = "add liqudity slippage is too high";
string constant ERROR_REMOVE_LIQUIDITY_SLIPPAGE = "remove liqudity slippage is too high";
string constant ERROR_NOT_ENOUGH_LIQUIDITY = "not enough liquidity";
string constant ERROR_SWAP_ZERO = "swap amount should be greater than zero";
string constant ERROR_ZERO_LIQUIDITY = "zero liquidity";
string constant ERROR_AMOUNT_BELOW_MIN = "amount below minimum";
string constant ERROR_SWAP_RATIO_TOO_HIGH = "swap ratio is too high";
string constant ERROR_ZERO_FEES = "zero fees";

// nft
string constant ERROR_NOT_NFT_OWNER = "not nft owner";


// minting error
string constant ERROR_MINTING_INTERVAL_NOT_REACHED = "minting interval not reached";