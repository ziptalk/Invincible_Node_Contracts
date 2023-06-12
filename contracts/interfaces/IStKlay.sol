// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.9;

interface IStKlay {
    function totalShares() external view returns (uint256);
    function totalStaking() external view returns (uint256);
    function stake() external payable;
    function stakeFor(address recipient) external payable;
    function unstake(uint256 amount) external;
    function claim(address user) external;
    function increaseTotalStaking(uint256 amount) external;
    function getSharesByKlay(uint256 amount) external view returns (uint256);
    function getKlayByShares(uint256 amount) external view returns (uint256);
    function balanceOf(address user) external view returns (uint256);
    function sharesOf(address user) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}
