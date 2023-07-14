// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/external/IERC20.sol";
import "./lib/AddressUtils.sol";
import "./lib/Logics.sol";
import "./lib/Unit.sol";
import "./InviCore.sol";
import "./StakeNFT.sol";
import "./lib/Structs.sol";
import "./lib/ArrayUtils.sol";
import "./tokens/ILPToken.sol";

/**
 * @title LiquidityProviderPool
 * @dev A contract for managing a liquidity provider pool.
 */
contract LiquidityProviderPool is Initializable, OwnableUpgradeable {
    //------Contracts and Addresses------//
    ILPToken public iLP;
    IERC20 public inviToken;
    InviCore public inviCoreContract;
    StakeNFT public stakeNFT;

    //------ mappings ------//
    mapping(address => uint128) public stakedAmount;
    mapping(address => uint128) public nativeRewardAmount;
    mapping(address => uint128) public inviRewardAmount;
    mapping(address => uint128) public totalInviRewardAmountByAddress;
    mapping(address => uint128) public totalNativeRewardAmountByAddress;
    mapping(address => uint128) public claimableUnstakeAmount;
    mapping(address => uint128) public unstakeRequestAmount;
    mapping(uint => UnstakeRequestLP) public unstakeRequests;

    //------variables------//
    uint32 public liquidityAllowableRatio;
    
    uint32 public unstakeRequestsRear;
    uint32 public unstakeRequestsFront;

    uint128 public unstakedAmount;
    uint128 public totalStakedAmount;
    uint128 public totalLentAmount;
    uint128 public totalNativeRewardAmount;
    uint128 public totalInviRewardAmount;
    uint128 public totalClaimableInviAmount;

    uint256 public lastNativeRewardDistributeTime;
    uint256 public inviRewardInterval;
    uint256 public inviReceiveInterval;
    uint256 public lastInviRewardedTime;
    uint256 public lastSplitUnstakedAmountTime;

    //------events------//
    event Stake(uint amount);

    //====== modifiers ======//
    modifier onlyInviCore {
        require(msg.sender == address(inviCoreContract), "LpPool: msg sender should be invi core");
        _;
    }

    //====== initializer ======//
    /**
     * @dev initialize the contract
     * @param _iLPAddr ilpToken address
     * @param _inviTokenAddr inviToken address
     */
    function initialize(address _iLPAddr, address _inviTokenAddr) public initializer {
        __Ownable_init();
        iLP = ILPToken(_iLPAddr);
        inviToken = IERC20(_inviTokenAddr);
        liquidityAllowableRatio = LIQUIDITY_ALLOWABLE_RATIO_UNIT * 1;

        inviRewardInterval = 1 hours; // testnet : 1 hours
        // inviRewardInterval = 1 days; // mainnet : 1 days

        inviReceiveInterval = 30 hours; // testnet : 30 hours
        // inviReceiveInterval = 90 days; // mainnet : 90 days

        lastInviRewardedTime = block.timestamp - inviRewardInterval;

        unstakeRequestsFront = 0;
        unstakeRequestsRear = 0;
    }

    //====== getter functions ======//
    /**
     * @dev Get the reward amount for the caller's address.
     * @return The amount of native reward and INVI reward.
     */
    function getRewardAmount() public view returns (uint, uint) {
        return (nativeRewardAmount[msg.sender], inviRewardAmount[msg.sender]);
    }

    /**
     * @dev Get the total liquidity available in the pool.
     * @return The total liquidity amount.
     */
    function getTotalLiquidity() public view returns (uint128) {
        return (totalStakedAmount - totalLentAmount);
    }

     /**
     * @dev Get the maximum amount that can be lent based on the allowable ratio.
     * @return The maximum lent amount.
     */
    function getMaxLentAmount() public view returns (uint128) {
        return (getTotalLiquidity() * liquidityAllowableRatio) / (100 * LIQUIDITY_ALLOWABLE_RATIO_UNIT);
    }

    //====== setter functions ======//
     /**
     * @dev Set the InviCore contract address.
     * @param _inviCore The address of the InviCore contract.
     */
    function setInviCoreContract(address payable _inviCore) external onlyOwner {
        inviCoreContract = InviCore(_inviCore);
    }

    /**
     * @dev Set the StakeNFT contract address.
     * @param _stakeNFT The address of the StakeNFT contract.
     */
    function setStakeNFTContract(address _stakeNFT) external onlyOwner {
        stakeNFT = StakeNFT(_stakeNFT);
    }

    /**
     * @dev Set the liquidity allowable ratio.
     * @param _liquidityAllowableRatio The new liquidity allowable ratio.
     */
    function setLiquidityAllowableRatio(uint32 _liquidityAllowableRatio) public onlyOwner {
        liquidityAllowableRatio = _liquidityAllowableRatio;
    }

    /**
     * @dev Set the total lent amount by the InviCore contract.
     * @param _totalLentAmount The new total lent amount.
     */
    function setTotalLentAmount(uint128 _totalLentAmount) public onlyInviCore {
        totalLentAmount = _totalLentAmount;
    }

     /**
     * @dev Set the total staked amount by the InviCore contract.
     * @param _totalStakedAmount The new total staked amount.
     */
    function setTotalStakedAmount(uint128 _totalStakedAmount) public onlyInviCore {
        totalStakedAmount = _totalStakedAmount;
    }

    //====== service functions ======//
    /**
     * @dev Stake Native Coin to the LP Pool.
     */
    function stake() external payable {
        uint128 stakeAmount = uint128(msg.value);
        // update stake amount
        stakedAmount[msg.sender] += stakeAmount;
        totalStakedAmount += stakeAmount;

        // mint and tranfer ILP to sender
        iLP.mintToken(msg.sender, stakeAmount);
    
        // request inviCore
        inviCoreContract.stakeLp{value: stakeAmount}();
    }

     /**
     * @dev Unstake from the LP Pool.
     * @param _amount The amount to unstake.
     */
    function unstake(uint128 _amount) external {
        require(stakedAmount[msg.sender] >= _amount &&  _amount > 0, "LpPool: Improper request amount");
        
        // update stake amount
        stakedAmount[msg.sender] -= _amount;
        totalStakedAmount -= _amount;

        // check if totalStakedAmount is below totalLentAmount
        if (totalStakedAmount < totalLentAmount) {
           uint128 excessAmount = totalLentAmount - totalStakedAmount;

            // request liquidity issue resolve to stakeNFT
           stakeNFT.resolveLiquidityIssue(excessAmount, totalLentAmount);
           totalLentAmount = totalStakedAmount;
        }

        // burn ILP
        iLP.burnToken(msg.sender, _amount);

        // request inviCore
        inviCoreContract.unstakeLp(_amount);
        

        // create unstake request
        UnstakeRequestLP memory unstakeRequest = UnstakeRequestLP({
            recipient: msg.sender,
            amount: _amount,
            requestTime: block.timestamp
        });
        // update unstake request
        unstakeRequests[unstakeRequestsRear++] = unstakeRequest;
    }

    /**
     * @dev Receive unstaked amount from the InviCore contract.
     */
    function receiveUnstaked() external payable onlyInviCore {
        unstakedAmount += uint128(msg.value);
    }

    /**
     * @dev Send the unstaked amount to the unstake request recipients.
     */
    function splitUnstakedAmount() external {
        // require contract balance to be above totalNativeRewardAmount
        require(address(this).balance >= totalNativeRewardAmount, "LpPool: Insufficient contract balance");

        // require unstake request to be exist
        require(unstakeRequestsFront != unstakeRequestsRear, "LpPool: No unstake requests");

        uint32 front = unstakeRequestsFront;
        uint32 rear = unstakeRequestsRear;
        for (uint32 i=front; i< rear; i++) {
            UnstakeRequestLP storage request = unstakeRequests[i];
            if (request.amount > unstakedAmount) {
                break;
            }
            // update claimable amount
            claimableUnstakeAmount[request.recipient] += request.amount;

            // update unstaked amount
            unstakedAmount -= request.amount;

            // remove unstake request
            delete unstakeRequests[unstakeRequestsFront++];
        }

        lastSplitUnstakedAmountTime = block.timestamp;
    }

    /**
     * @dev Claim the claimable unstaked amount.
     */
    function claimUnstaked() external {
        require(address(this).balance >= claimableUnstakeAmount[msg.sender], "LpPool: Insufficient claimable amount");
        require(claimableUnstakeAmount[msg.sender] > 0, "LpPool: No claimable amount");
        uint128 amount = claimableUnstakeAmount[msg.sender];
        claimableUnstakeAmount[msg.sender] = 0;

        (bool send, ) = msg.sender.call{value: amount}("");
        require(send, "Transfer failed");
    }
    
    /**
     * @dev Distribute native rewards to LP holders.
     */
    function distributeNativeReward() external payable onlyInviCore{
        for (uint32 i = 0; i < iLP.totalILPHoldersCount(); i++) {
            address account = iLP.ILPHolders(i);
            uint128 rewardAmount = (uint128(msg.value) * stakedAmount[account] / totalStakedAmount);

            // update reward amount
            nativeRewardAmount[account] += rewardAmount;
            totalNativeRewardAmount += rewardAmount;
            totalNativeRewardAmountByAddress[account] += rewardAmount;
        }

        lastNativeRewardDistributeTime = block.timestamp;
    }

    /**
     * @dev Distribute INVI token rewards to LP holders.
     */
    function distributeInviTokenReward() external {
        require(block.timestamp  >= inviRewardInterval + lastInviRewardedTime, "LpPool: Invi reward interval not passed");
        uint128 totalInviToken = uint128( inviToken.balanceOf(address(this)));
        require(totalInviToken  > 1000000 + totalClaimableInviAmount, "LpPool: Insufficient invi token to distribute");
        uint128 intervalVar = uint128(inviReceiveInterval) / uint128(inviRewardInterval);
        uint256 rewardTotal = (totalInviToken - totalClaimableInviAmount) / intervalVar;
        uint128 holderNumber = iLP.totalILPHoldersCount();
        for (uint128 i = 0; i < holderNumber; i++) {
            address account = iLP.ILPHolders(i);
            if (stakedAmount[account] == 0) continue;
            uint256 rewardAmount = rewardTotal * stakedAmount[account] / totalStakedAmount ;
           
            // update rewards
            inviRewardAmount[account] += uint128(rewardAmount);
            totalInviRewardAmount += uint128(rewardAmount);
            totalClaimableInviAmount += uint128(rewardAmount);
            totalInviRewardAmountByAddress[account] += uint128(rewardAmount);
        }

        lastInviRewardedTime = block.timestamp;
    }
    
    /**
     * @dev Claim the INVI token rewards.
     */
    function claimInviReward() external {
        require(inviRewardAmount[msg.sender] > address(this).balance, "LpPool: Insufficient claimable amount");
        uint128 rewardAmount = inviRewardAmount[msg.sender];
        inviRewardAmount[msg.sender] = 0;
        totalClaimableInviAmount -= rewardAmount;
        uint32 inviSlippage = 1000;
        // send invi token to account
        require(inviToken.transfer(msg.sender, rewardAmount - inviSlippage), "LpPool: Transfer failed");
    }

    /**
     * @dev Claim the native coin rewards.
     */
    function claimNativeReward() external {
        require(nativeRewardAmount[msg.sender] > address(this).balance, "LpPool: Insufficient claimable amount");
        uint128 rewardAmount = nativeRewardAmount[msg.sender];
        nativeRewardAmount[msg.sender] = 0;

        // send native coin to account
        (bool sent, ) = msg.sender.call{value: rewardAmount}("");
        require(sent, "LpPool: Transfer failed");
    }

    
    //====== utils functions ======//
 
}