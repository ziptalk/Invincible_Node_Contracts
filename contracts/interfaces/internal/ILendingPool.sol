// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "../../common/lib/Structs.sol";

interface ILendingPool {
    function createLendInfo(uint _nftId, uint _slippage) external view returns (LendInfo memory);
    function getLendInfo(uint _nftId) external view returns (LendInfo memory);
    function setStakeNFTContract(address _stakeNFTContract) external;
    function setPriceManager(address _priceManager) external;
    function setMaxLendRatio(uint _maxLendRatio) external;
    function lend(LendInfo memory _lendInfo) external;
    function repay(uint _nftId) external;
}
