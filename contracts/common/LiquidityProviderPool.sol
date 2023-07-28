// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/external/IERC20.sol";
import "./lib/AddressUtils.sol";
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
    uint128 public minStakeAmount;
    uint128 public totalStakedAmount;
    uint128 public totalLentAmount;
    uint128 public totalNativeRewardAmount;
    uint128 public totalInviRewardAmount;
    uint128 public totalClaimableInviAmount;
    uint128 public totalClaimableUnstakeAmount;

    uint256 public lastNativeRewardDistributeTime;
    uint256 public inviRewardInterval;
    uint256 public inviReceiveInterval;
    uint256 public lastInviRewardedTime;
    uint256 public lastSplitUnstakedAmountTime;
    uint256 public totalUnstakeRequestAmount;

    //------events------//
    event Stake(address indexed user, uint128 indexed amount);
    event Unstake(address indexed user, uint128 indexed amount);

    bool private _locked;
    //====== modifiers ======// 
    modifier nonReentrant() {
        require(!_locked, "Reentrant call detected");
        _locked = true;
        _;
        _locked = false;
    }
    modifier onlyInviCore {
        require(msg.sender == address(inviCoreContract), "LpPool: msg sender should be invi core");
        _;
    }

    modifier onlyILPToken {
        require(msg.sender == address(iLP), "LpPool: msg sender should be iLP");
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
        minStakeAmount = 10**16; // 0.01

        _locked = false;
    }

    //====== getter functions ======//
    /**
     * @notice Get the reward amount for the caller's address.
     * @return The amount of native reward and INVI reward.
     */
    function getRewardAmount() public view returns (uint, uint) {
        return (nativeRewardAmount[msg.sender], inviRewardAmount[msg.sender]);
    }

    /**
     * @notice Get the total liquidity available in the pool.
     * @return The total liquidity amount.
     */
    function getTotalLiquidity() public view returns (uint128) {
        return (totalStakedAmount - totalLentAmount);
    }

    function getTotalStakedAmount() public view returns (uint128) {
        return totalStakedAmount;
    }

     /**
     * @notice Get the maximum amount that can be lent based on the allowable ratio.
     * @return The maximum lent amount.
     */
    function getMaxLentAmount() public view returns (uint128) {
        uint256 totalLiquidity = getTotalLiquidity();
        uint256 result = (totalLiquidity**2 * liquidityAllowableRatio) / (totalStakedAmount * 100 * LIQUIDITY_ALLOWABLE_RATIO_UNIT);
        return uint128(result);
    }

    /**
     * @notice Get the total unstaked amount.
     * @return The total unstaked amount.
     */
    function getStakedAmount(address _addr) public view returns (uint128) {
        return stakedAmount[_addr];
    }

    //====== setter functions ======//
     /**
     * @notice Set the InviCore contract address.
     * @dev This function is called by the owner.
     * @param _inviCore The address of the InviCore contract.
     */
    function setInviCoreContract(address payable _inviCore) external onlyOwner {
        inviCoreContract = InviCore(_inviCore);
    }

    /**
     * @notice Set the StakeNFT contract address.
     * @dev This function is called by the owner.
     * @param _stakeNFT The address of the StakeNFT contract.
     */
    function setStakeNFTContract(address _stakeNFT) external onlyOwner {
        stakeNFT = StakeNFT(_stakeNFT);
    }

    /**
     * @notice Set the liquidity allowable ratio.
     * @dev This function is called by the owner.
     * @param _liquidityAllowableRatio The new liquidity allowable ratio.
     */
    function setLiquidityAllowableRatio(uint32 _liquidityAllowableRatio) external onlyOwner {
        liquidityAllowableRatio = _liquidityAllowableRatio;
    }

    /**
     * @notice Set the total lent amount by the InviCore contract.
     * @dev This function is called by the InviCore contract.
     * @param _totalLentAmount The new total lent amount.
     */
    function setTotalLentAmount(uint128 _totalLentAmount) external onlyInviCore {
        totalLentAmount = _totalLentAmount;
    }

    /**
     * @notice Set the total unstaked amount by the InviCore contract.
     * @dev This function is called by the ILP Token contract.
     * @param _amount The new total unstaked amount.
     */
    function setStakedAmount(address _target, uint128 _amount) external onlyILPToken {
        stakedAmount[_target] = _amount;
    }

    /**
     * @notice Set the minimum stake amount
     * @dev This function is called by the owner.
     * @param _minStakeAmount The new minimum stake amount.
     */
    function setMinStakeAmount(uint128 _minStakeAmount) external onlyOwner {
        minStakeAmount = _minStakeAmount;
    }

    //====== service functions ======//
    /**
     * @notice Stake Native Coin to the LP Pool.
     * @dev Prevents reentrancy attack
     */
    function stake() external payable nonReentrant {
        require(msg.value >= minStakeAmount, "LpPool: amount should be greater than minStakeAmount");
        uint128 stakeAmount = uint128(msg.value);
        // update stake amount
        stakedAmount[msg.sender] += stakeAmount;
        totalStakedAmount += stakeAmount;

        // mint and tranfer ILP to sender
        iLP.mintToken(msg.sender, stakeAmount);
    
        // request inviCore
        inviCoreContract.stakeLp{value: stakeAmount}();

        emit Stake(msg.sender, stakeAmount);
    }

     /**
     * @notice Unstake from the LP Pool.
     * @dev Prevents reentrancy attack
     * @param _amount The amount to unstake.
     */
    function unstake(uint128 _amount) external nonReentrant {
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
        totalUnstakeRequestAmount += _amount;

        emit Unstake (msg.sender, _amount);
    }

    /**
     * @notice Receive unstaked amount from the InviCore contract.
     * @dev This function is called by the InviCore contract.
     */
    function receiveUnstaked() external payable onlyInviCore {
        unstakedAmount += uint128(msg.value);
        console.log("sending ", msg.value, " to lp Pool");
        // split unstaked amount if meets the condition
        if (address(this).balance >= totalNativeRewardAmount && unstakeRequestsFront != unstakeRequestsRear) {
            splitUnstakedAmount();
        }
    }

    /**
     * @notice Send the unstaked amount to the unstake request recipients.
     * @dev Prevents reentrancy attack
     */
    function splitUnstakedAmount() public nonReentrant {
        // require contract balance to be above totalNativeRewardAmount
        require(address(this).balance >= totalNativeRewardAmount, "LpPool: Insufficient contract balance");

        // require unstake request to be exist
        require(unstakeRequestsFront != unstakeRequestsRear, "LpPool: No unstake requests");

        uint32 front = unstakeRequestsFront;
        uint32 rear = unstakeRequestsRear;
        for (uint32 i=front; i< rear;) {
            UnstakeRequestLP storage request = unstakeRequests[i];
            console.log("lp pool balance: ", address(this).balance);
            console.log("request amount : ", request.amount);
            console.log("unstaked Amount: ", unstakedAmount);
            if (request.amount > unstakedAmount) {
                break;
            }
            // update claimable amount
            claimableUnstakeAmount[request.recipient] += request.amount;
            totalClaimableUnstakeAmount += request.amount;
            console.log("claimable amount: ", claimableUnstakeAmount[request.recipient]);

            // update unstaked amount
            unstakedAmount -= request.amount;

            // update total unstake request amount
            totalUnstakeRequestAmount -= request.amount;

            // remove unstake request
            delete unstakeRequests[unstakeRequestsFront++];

            unchecked {i++;}
        }

        lastSplitUnstakedAmountTime = block.timestamp;
    }

    /**
     * @notice Claim the claimable unstaked amount.
     * @dev Prevents reentrancy attack
     */
    function claimUnstaked() external nonReentrant {
        require(address(this).balance >= claimableUnstakeAmount[msg.sender], "LpPool: Insufficient claimable amount");
        require(claimableUnstakeAmount[msg.sender] > 0, "LpPool: No claimable amount");
        uint128 amount = claimableUnstakeAmount[msg.sender];
        // update values
        claimableUnstakeAmount[msg.sender] = 0;
        totalClaimableUnstakeAmount -= amount;

        (bool send, ) = msg.sender.call{value: amount}("");
        require(send, "Transfer failed");
    }
    
    /**
     * @notice Distribute native rewards to LP holders.
     * @dev This function is called by the InviCore contract.
     */
    function distributeNativeReward() external payable onlyInviCore {
        require(totalStakedAmount > 0, "LpPool: No staked amount");
        uint128 totalILPHoldersCount = iLP.totalILPHoldersCount();
        for (uint128 i = 0; i < totalILPHoldersCount;) {
            address account = iLP.ILPHolders(i);
            console.log("account: ", account);
            uint256 rewardAmount = msg.value * stakedAmount[account] / totalStakedAmount;
            
            console.log("total value: ", msg.value);
            console.log("staked amount: ", stakedAmount[account]);
            console.log("total staked amount: ", totalStakedAmount);
            console.log("reward: ", rewardAmount);
            // update reward amount
            nativeRewardAmount[account] += uint128(rewardAmount);
            totalNativeRewardAmount +=  uint128(rewardAmount);
            totalNativeRewardAmountByAddress[account] += uint128(rewardAmount);

            unchecked {i++;}
        }

        lastNativeRewardDistributeTime = block.timestamp;
    }

    /**
     * @notice Distribute INVI token rewards to LP holders.
     * @dev Prevents reentrancy attack
     */
    function distributeInviTokenReward() external nonReentrant {
        require(block.timestamp  >= inviRewardInterval + lastInviRewardedTime, "LpPool: Invi reward interval not passed");
        uint128 totalInviToken = uint128( inviToken.balanceOf(address(this)));
        console.log("total invi token: ", totalInviToken);
        require(totalInviToken  > 1000000 + totalClaimableInviAmount, "LpPool: Insufficient invi token to distribute");
        uint128 intervalVar = uint128(inviReceiveInterval) / uint128(inviRewardInterval);
        uint256 rewardTotal = totalInviToken / intervalVar;
        uint128 holderNumber = iLP.totalILPHoldersCount();
        console.log("holderNumber", holderNumber);
        for (uint128 i = 0; i < holderNumber;) {
            address account = iLP.ILPHolders(i);
            if (stakedAmount[account] == 0) continue;
            uint256 rewardAmount = rewardTotal * stakedAmount[account] / totalStakedAmount ;
           
            // update rewards
            inviRewardAmount[account] += uint128(rewardAmount);
            totalInviRewardAmount += uint128(rewardAmount);
            totalClaimableInviAmount += uint128(rewardAmount);
            totalInviRewardAmountByAddress[account] += uint128(rewardAmount);

            unchecked {i++;}
        }

        lastInviRewardedTime = block.timestamp;
    }
    
    /**
     * @notice Claim the native coin rewards.
     * @dev Prevents reentrancy attack
     */
    function claimNativeReward() external nonReentrant {
        require(nativeRewardAmount[msg.sender] > 0, "LpPool: No claimable amount");
        require(address(this).balance >= nativeRewardAmount[msg.sender], "LpPool: Insufficient claimable amount");
        uint128 rewardAmount = nativeRewardAmount[msg.sender];
        nativeRewardAmount[msg.sender] = 0;
        totalNativeRewardAmount -= rewardAmount;

        // send native coin to account
        (bool sent, ) = msg.sender.call{value: rewardAmount}("");
        require(sent, "LpPool: Transfer failed");
    }

    /**
     * @notice Claim the INVI token rewards.
     * @dev Prevents reentrancy attack
     */
    function claimInviReward() external nonReentrant {
        require(inviRewardAmount[msg.sender] > 0, "LpPool: No claimable amount");
        require(inviToken.balanceOf(address(this)) > inviRewardAmount[msg.sender], "LpPool: Insufficient claimable amount");
        uint128 rewardAmount = inviRewardAmount[msg.sender];
        inviRewardAmount[msg.sender] = 0;
        totalClaimableInviAmount -= rewardAmount;
        // send invi token to account
        require(inviToken.transfer(msg.sender, rewardAmount), "LpPool: Transfer failed");
    }
    
    //====== utils functions ======//
 
}