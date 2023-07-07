// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ILiquidStaking {
    function stake() external payable;
    function spreadRewards() external;
    function createUnstakeRequest(uint256 _amount) external;
    function claimUnstakedAmount() external;
    function setClaimableState() external;
    function claim() external;
    function initialStake() external payable;
    function unstakeAll() external;
    function getUnstakeRequestsLength() external view returns (uint);

    // bifrost specific
    function setCandidate(address _candidate) external;

    // klaytn specific
    function totalShares() external view returns (uint256);
    function totalStaking() external view returns (uint256);
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
