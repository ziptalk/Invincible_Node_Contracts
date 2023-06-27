// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IInviSwapPool {
    // Getter Functions
    function getInviToNativeOutAmount(uint _amountIn) external view returns (uint);
    function getNativeToInviOutAmount(uint _amountIn) external view returns (uint);
    function getInviToNativeOutMaxInput() external view returns (uint);
    function getNativeToInviOutMaxInput() external view returns (uint);
    
    // Setter Functions
    function setPriceManager(address _priceManager) external;
    function setInviFees(uint _fees) external;
    function setNativeFees(uint _fees) external;
    
    // Service Functions
    function swapInviToNative(uint _amountIn, uint _amountOutMin) external;
    function swapNativeToInvi(uint _amountOutMin) external payable;
    function withdrawFees() external;
}
