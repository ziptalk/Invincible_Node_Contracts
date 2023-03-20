// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "./Structs.sol";

function popValueFromUintArray(uint[] storage _arr, uint _value) {
    uint index = _arr.length;
    // find value
    for (uint i = 0 ; i < _arr.length; i++) {
        if (_arr[i] == _value) {
            index = i;
        }
    }
    // if no value
    if (index == _arr.length) {
        return;
    }
    // else remove value
    _arr[index] = _arr[_arr.length - 1];
    _arr.pop();
}

function popIndexFromUnstakeRequests(UnstakeRequest[] storage _arr, uint _index) {
    require(_index < _arr.length, "Index out of bounds");
    for (uint i = _index; i < _arr.length - 1; i++) {
        _arr[i] = _arr[i + 1];
    }
    _arr.pop();
}