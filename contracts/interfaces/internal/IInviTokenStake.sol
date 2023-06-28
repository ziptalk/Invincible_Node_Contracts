// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

interface IBfcInviTokenStake {
    /**
     * @notice get unstake end time of address
     * @param  _address The address of the staker
     */
    function getUnstakeTime(address _address) external view returns (uint);

    /**
     * @notice Sets the address of the InviCore contract
     * @param _inviCoreAddr The address of the InviCore contract
     */
    function setInviCoreAddress(address _inviCoreAddr) external;

    /**
     * @notice Sets the address of the InviToken contract
     * @param _inviTokenAddr The address of the InviToken contract
     */
    function setInviTokenAddress(address _inviTokenAddr) external;

    /**
     * @notice Stakes the specified amount of InviToken
     * @param _stakeAmount The amount of InviToken to stake
     */
    function stake(uint _stakeAmount) external;

    /**
     * @notice Requests to unstake the specified amount of InviToken
     * @param _unstakeAmount The amount of InviToken to unstake
     */
    function requestUnstake(uint _unstakeAmount) external;

    /**
     * @notice Cancels the unstake request and restores the staked amount
     */
    function cancelUnstake() external;

    /**
     * @notice Claims the unstaked InviToken
     */
    function claimUnstaked() external;

    /**
     * @notice Updates the native coin reward for the stakers
     */
    function updateNativeReward() external payable;

    /**
     * @notice Updates the InviToken reward for the stakers
     */
    function updateInviTokenReward() external;

    /**
     * @notice Claims the native coin reward for the caller
     */
    function claimNativeReward() external;

    /**
     * @notice Claims the InviToken reward for the caller
     */
    function claimInviReward() external;
}
