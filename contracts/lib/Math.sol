// SPDX-License-Identifier: MIT
pragma solidity ^0.8;


function sqrt(uint256 y) pure returns (uint256) {
        uint256 z = (y + 1) / 2;
        uint256 x = y;
        while (z < x) {
            x = z;
            z = (y / z + z) / 2;
        }
        return x;
    }