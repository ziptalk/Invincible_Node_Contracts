// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

interface ILiquidityProviderPool {
    /**
     * @notice Sets the address of the InviCore contract
     * @param _inviCore The address of the InviCore contract
     */
    function setInviCoreContract(address payable _inviCore) external;

    /**
     * @notice Sets the allowable liquidity ratio
     * @param _liquidityAllowableRatio The allowable liquidity ratio
     */
    function setLiquidityAllowableRatio(uint _liquidityAllowableRatio) external;

    /**
     * @notice Sets the total lent amount by the InviCore contract
     * @param _totalLentAmount The total lent amount
     */
    function setTotalLentAmount(uint _totalLentAmount) external;

    /**
     * @notice Sets the total staked amount by the InviCore contract
     * @param _totalStakedAmount The total staked amount
     */
    function setTotalStakedAmount(uint _totalStakedAmount) external;

    /**
     * @notice Gets the reward amounts (native coin and Invi token) for the caller
     * @return nativeRewardAmount The native coin reward amount
     * @return inviRewardAmount The Invi token reward amount
     */
    function getRewardAmount() external view returns (uint nativeRewardAmount, uint inviRewardAmount);

    /**
     * @notice Gets the total liquidity in the LP Pool
     * @return totalLiquidity The total liquidity
     */
    function getTotalLiquidity() external view returns (uint totalLiquidity);

    /**
     * @notice Gets the maximum lent amount based on the allowable liquidity ratio
     * @return maxLentAmount The maximum lent amount
     */
    function getMaxLentAmount() external view returns (uint maxLentAmount);

    /**
     * @notice Stakes Native Coin to the LP Pool
     */
    function stake() external payable;

    /**
     * @notice Unstakes the specified amount from the LP Pool
     * @param _amount The amount to unstake
     */
    function unstake(uint _amount) external;

    /**
     * @notice Claims Invi token rewards for the caller
     */
    function claimInviReward() external;

    /**
     * @notice Claims native coin rewards for the caller
     */
    function claimNativeReward() external;

    /**
     * @notice Distributes native coin rewards to ILP holders
     */
    function distributeNativeReward() external payable;

    /**
     * @notice Distributes Invi token rewards to ILP holders
     */
    function distributeInviTokenReward() external;
}
