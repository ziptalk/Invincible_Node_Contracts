// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPriceManager {
    function getInviPrice() external view returns (uint);
    function getNativePrice() external view returns (uint);
    function setInviPrice(uint _price) external;
    function setNativePrice(uint _price) external;
}
