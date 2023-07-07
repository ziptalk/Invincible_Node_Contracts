// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBfcLiquidStaking {
    function stake() external payable;
    function spreadRewards() external;
    function createUnstakeRequest(uint256 _amount) external;
    function unstake() external;
    function claimUnstakedAmount() external;
    function setClaimableState() external;
    function claim() external;
    function initialStake() external payable;
    function unstakeAll() external;
    function getUnstakeRequestsLength() external view returns (uint);
    function setCandidate(address _candidate) external;
}
