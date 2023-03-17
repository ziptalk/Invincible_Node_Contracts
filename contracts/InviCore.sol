// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./StakeNFT.sol";
import "./lib/Structs.sol";
import "./lib/ErrorMessages.sol";
import "hardhat/console.sol";
import "./LiquidityProviderPool.sol";
import "./lib/Logics.sol";
import "./lib/Unit.sol";

contract InviCore is Initializable, OwnableUpgradeable {

    StakeNFT public stakeNFTContract;
    LiquidityProviderPool public lpPoolContract;
    address public stakeManager;
    
    // reward related
    uint public stakingAPR;
    uint private decreaseRatio;
    uint private increaseRatio;

    // stake status
    uint public totalUserStakedAmount;
    mapping(address => uint) public userStakedAmount;

    // variable
    uint public slippage;

    function initialize(address _stakeManager, address _stakeNFTAddr, address _lpPoolAddr) initializer public {
        stakeManager = _stakeManager;
        stakeNFTContract = StakeNFT(_stakeNFTAddr);
        lpPoolContract = LiquidityProviderPool(_lpPoolAddr);
        decreaseRatio = 10 * rewardErrorUnit;
        increaseRatio = 5 * rewardErrorUnit;
        stakingAPR = 10;
        __Ownable_init();
    }

    //====== modifier functions ======//
    modifier onlySTM {
        require(msg.sender == stakeManager, "msg sender should be stake manager");
        _;
    }

    //====== getter functions ======//
    function getStakeInfo(uint _principal, uint _leverageRatio) public view returns(StakeInfo memory)  {
        uint lockPeriod = _getLockPeriod(_leverageRatio);
        uint lentAmount = _principal * (_leverageRatio - 1 * leverageUnit) / leverageUnit;

        uint protocolFee = _getProtocolFee(lentAmount, _leverageRatio);
        uint lockStart = block.timestamp;
        uint lockEnd = block.timestamp + lockPeriod;
        uint minReward = _getMinReward(_principal + lentAmount, lockPeriod);
        uint maxReward = _getMaxReward(_principal + lentAmount, lockPeriod);

        StakeInfo memory stakeInfo = StakeInfo(msg.sender, _principal, _leverageRatio, lockPeriod, lockStart, lockEnd, protocolFee, minReward, maxReward);
        
        return stakeInfo;
    }

    // return expected reward(_amount == principal + lentAmount)
    function getExpectedReward(uint _amount, uint _lockPeriod) public view returns (uint) {
        return ExpectedReward(_amount, _lockPeriod, stakingAPR);
    }

    // return lock period by amount & leverage ratio
    function _getLockPeriod(uint _leverageRatio) private pure returns (uint) {
        return LockPeriod(_leverageRatio);
    }

    // return protocol fee by amount & leverage ratio
    function _getProtocolFee(uint _lentAmount, uint _leverageRatio) private view returns (uint) {
        uint totalLiquidity = lpPoolContract.getTotalLiquidity();
        return ProtocolFee(_lentAmount, _leverageRatio, totalLiquidity);
    }
    
    // return minimum Reward
    function _getMinReward(uint _amount, uint _lockPeriod) private view returns (uint) {
        return MinReward(_amount, _lockPeriod, stakingAPR, decreaseRatio);
    }

    // return maximum Reward
    function _getMaxReward(uint _amount, uint _lockPeriod) private view returns (uint) {
        return MaxReward(_amount, _lockPeriod, stakingAPR, increaseRatio);
    }

    // return total Liquidity from LP Pool
    function _getTotalLiquidity() private view returns (uint) {
        return lpPoolContract.getTotalLiquidity();
    }

    //====== setter functions ======//

    // set staking ARP function
    function setStakingAPR(uint _stakingAPR) external onlyOwner {
        stakingAPR = _stakingAPR;
    }

    // set decrease ratio for min reward
    function setDecreaseRatio(uint _decreaseRatio) external onlyOwner {
        decreaseRatio = _decreaseRatio;
    }

    // set increase ratio from max reward
    function setIncreaseRatio(uint _increaseRatio) external onlyOwner {
        increaseRatio = _increaseRatio;
    }

    // set sliipage function
    function setSlippage(uint _slippage) external onlyOwner {
        slippage = _slippage;
    }

    // set exchange ratio function
    function _setExchangeRatio() private {

    }



    //====== service functions ======//
    
    // stake native coin
    function stake(StakeInfo memory _stakeInfo, uint _slippage) external payable{

        // verify given stakeInfo
        _verifyStakeInfo(_stakeInfo, _slippage, msg.value);

        // mint StakeNFT Token by stake info
        uint nftTokenId = stakeNFTContract.mintNFT(_stakeInfo);

        //update stakeAmount info
        uint lentAmount = _stakeInfo.principal * (_stakeInfo.leverageRatio - 1);
        uint totalLentAmount = lpPoolContract.totalLentAmount() + lentAmount;
        lpPoolContract.updateTotalLentAmount(totalLentAmount);
        totalUserStakedAmount += _stakeInfo.principal + lentAmount;

        // send principal to STM
        (bool sent, ) = stakeManager.call{value : _stakeInfo.principal }("");
        require(sent, ERROR_FAIL_SEND);
    }

    // unStake native coin
    function repayNFT(uint nftTokenId) external {
        // verify NFT ownership
        require(stakeNFTContract.verifyOwnership(nftTokenId, msg.sender), ERROR_NOT_OWNED_NFT);

        // get stakeInfo by nftTokenId
        StakeInfo memory stakeInfo = stakeNFTContract.getStakeInfo(nftTokenId);

        console.log(stakeInfo.user);
    }

    // split reward
    function splitRewards(uint _amount) external onlySTM {
        // lpPoolContract.distributeReward();
    }
    
    //====== utils function ======//

    // verify stakeInfo is proper
    function _verifyStakeInfo(StakeInfo memory _stakeInfo, uint _slippage, uint _sendAmount) private view {
        // verify principal amount
        require(_stakeInfo.principal == _sendAmount, ERROR_INVALID_STAKE_INFO);

        // verify lockPeriod
        uint lockPeriod = _getLockPeriod(_stakeInfo.leverageRatio);
        require(_stakeInfo.lockPeriod == lockPeriod, ERROR_INVALID_STAKE_INFO);

        // verify lentAmount
        uint lentAmount = _stakeInfo.principal * (_stakeInfo.leverageRatio * leverageUnit - 1 * leverageUnit) / leverageUnit;
        require(lentAmount <= lpPoolContract.getMaxLentAmount(), ERROR_TOO_MUCH_LENT);

        // verify min/max reward
        uint amount = _stakeInfo.principal * _stakeInfo.leverageRatio;
        uint minReward = MinReward(amount, _stakeInfo.lockPeriod, stakingAPR, decreaseRatio);
        uint maxReward = MaxReward(amount, _stakeInfo.lockPeriod, stakingAPR, increaseRatio);
        require(minReward == _stakeInfo.minReward, ERROR_INVALID_STAKE_INFO);
        require(maxReward == _stakeInfo.maxReward, ERROR_INVALID_STAKE_INFO);        

        // verify protocol fee
        uint minProtocolFee = _stakeInfo.protocolFee * (1 * slippageUnit - _slippage * slippageUnit) / slippageUnit;
        uint maxProtocolFee = _stakeInfo.protocolFee * (1 * slippageUnit + _slippage * slippageUnit) / slippageUnit;
        uint protocolFee = _getProtocolFee(lentAmount, _stakeInfo.leverageRatio);
        require(minProtocolFee <= protocolFee, ERROR_INVALID_STAKE_INFO);
        require(maxProtocolFee >= protocolFee, ERROR_INVALID_STAKE_INFO);
    }
}