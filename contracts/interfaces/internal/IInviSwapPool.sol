// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IInviSwapPool {
    function getInviToNativeOutAmount(uint _amountIn) external view returns (uint);
    function getNativeToInviOutAmount(uint _amountIn) external view returns (uint);
    function getNativeToInviOutMaxInput() external view returns (uint);
    function getInviToNativeOutMaxInput() external view returns (uint);
    function getAddLiquidityInvi(uint _amountIn) external view returns (uint);
    function getAddLiquidityNative(uint _amountIn) external view returns (uint);
    function getInviPrice() external view returns (uint);
    function getNativePrice() external view returns (uint);
    function getExpectedAmountsOutRemoveLiquidity(uint _liquidityTokensAmount) external view returns (uint inviAmount, uint nativeAmount);
    function swapInviToNative(uint _amountIn, uint _amountOutMin) external;
    function swapNativeToInvi(uint _amountOutMin) external payable;
    function addLiquidity(uint _expectedAmountInInvi, uint _slippage) external payable;
    function removeLiquidity(uint _liquidityTokensAmount, uint _expectedInviAmount, uint _expectedNativeAmount, uint _slippage) external;
    function withdrawFees() external;
}
