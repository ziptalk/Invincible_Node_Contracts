// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

interface IBfcInviCore {
    struct StakeInfo {
        address user;
        uint principal;
        uint leverageRatio;
        uint stakedAmount;
        uint lockPeriod;
        uint lockStart;
        uint lockEnd;
        uint protocolFee;
        bool isUnstaked;
    }

    struct UnstakeRequest {
        address recipient;
        uint nftTokenId;
        uint amount;
        uint protocolFee;
        uint requestType; // 0: user, 1: LP, 2: INVI staker
    }

    /**
     * @notice Sets the address of the StakeNFT contract
     * @param _stakeNFTAddr The address of the StakeNFT contract
     */
    function setStakeNFTContract(address _stakeNFTAddr) external;

    /**
     * @notice Sets the address of the BfcLiquidityProviderPool contract
     * @param _lpPoolAddr The address of the BfcLiquidityProviderPool contract
     */
    function setLpPoolContract(address _lpPoolAddr) external;

    /**
     * @notice Sets the address of the BfcInviTokenStake contract
     * @param _inviTokenStakeAddr The address of the BfcInviTokenStake contract
     */
    function setInviTokenStakeContract(address _inviTokenStakeAddr) external;

    /**
     * @notice Sets the address of the stToken contract
     * @param _stTokenAddr The address of the stToken contract
     */
    function setStTokenContract(address _stTokenAddr) external;

    /**
     * @notice Gets the stake information based on the provided parameters
     * @param _account The user's address
     * @param _principal The principal amount being staked
     * @param _leverageRatio The leverage ratio
     * @param _lockPeriod The lock period in seconds
     * @return stakeInfo The stake information
     */
    function getStakeInfo(address _account, uint _principal, uint _leverageRatio, uint _lockPeriod) external view returns (StakeInfo memory);

    /**
     * @notice Gets the expected reward amount for the given stake amount and lock period
     * @param _amount The total stake amount (principal + lent amount)
     * @param _lockPeriod The lock period in seconds
     * @return rewardAmount The expected reward amount
     */
    function getExpectedReward(uint _amount, uint _lockPeriod) external view returns (uint);

    /**
     * @notice Gets the lock period based on the provided leverage ratio
     * @param _leverageRatio The leverage ratio
     * @return lockPeriod The lock period in seconds
     */
    function getLockPeriod(uint _leverageRatio) external view returns (uint);

    /**
     * @notice Gets the protocol fee for the given lent amount and leverage ratio
     * @param _lentAmount The lent amount
     * @param _leverageRatio The leverage ratio
     * @return protocolFee The protocol fee
     */
    function getProtocolFee(uint _lentAmount, uint _leverageRatio) external view returns (uint);

    /**
     * @notice Gets the total liquidity in the LP Pool
     * @return totalLiquidity The total liquidity
     */
    function getTotalLiquidity() external view returns (uint);

    /**
     * @notice Gets the staked amount for the given stake amount and leverage ratio
     * @param _amount The total stake amount (principal + lent amount)
     * @param _leverageRatio The leverage ratio
     * @return stakedAmount The staked amount
     */
    function getStakedAmount(uint _amount, uint _leverageRatio) external pure returns (uint);

    /**
     * @notice Gets the length of the unstake requests queue
     * @return length The length of the unstake requests queue
     */
    function getUnstakeRequestsLength() external view returns (uint);

    /**
     * @notice Gets the total staked amount in the system
     * @return totalStakedAmount The total staked amount
     */
    function getTotalStakedAmount() external view returns (uint);

    /**
     * @notice Stakes the native coin
     * @param _principal The principal amount being staked
     * @param _leverageRatio The leverage ratio
     * @param _lockPeriod The lock period in seconds
     * @param _slippage The slippage percentage
     */
    function stake(uint _principal, uint _leverageRatio, uint _lockPeriod, uint _slippage) external payable;

    /**
     * @notice Repays the NFT and unstakes the funds
     * @param _nftTokenId The ID of the NFT token representing the stake
     */
    function repayNFT(uint _nftTokenId) external;

    /**
     * @notice Distributes STToken rewards to stakers
     */
    function distributeStTokenReward() external;

    /**
     * @notice Stakes the LP tokens (only for lpPool contract)
     */
    function stakeLp() external payable;

    /**
     * @notice Unstakes the LP tokens
     * @param _requestAmount The amount to be unstaked
     */
    function unstakeLp(uint _requestAmount) external;

    /**
     * @notice Sends the unstaked amount to the unstake request applicants
     */
    function sendUnstakedAmount() external;

    /**
     * @notice Claims the unstaked amount for the caller
     */
    function claimUnstaked() external;
}
