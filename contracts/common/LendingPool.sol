// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./StakeNFT.sol";
import "../interfaces/external/IERC20.sol";
import "./lib/Structs.sol";
import "./lib/Unit.sol";
import "./tokens/InviToken.sol";
import "hardhat/console.sol";
import "./swap/InviSwapPool.sol";

/**
 * @title LendingPool
 * @dev The LendingPool contract allows users to lend inviTokens by staking NFTs.
 */
contract LendingPool is Initializable, OwnableUpgradeable {
    InviToken public inviToken;
    StakeNFT public stakeNFTContract;
    InviSwapPool public inviSwapPool;

    uint32 public maxLendRatio;
    uint32 private _lendRatio;
    uint256 public totalLentAmount;
    bool private _setStakeNFTContract;
    bool private _setInviSwapPoolContract;
    bool private _locked;
    mapping(uint => LendInfo) public lendInfos;
    mapping(uint => uint) public nftLentTime;

    event Lend(address indexed user, uint256 indexed principal, uint256 indexed lentAmount);
    event Repay(address indexed user, uint256 indexed returnAmount);

    //====== modifiers ======// 
    modifier nonReentrant() {
        require(!_locked, "Reentrant call detected");
        _locked = true;
        _;
        _locked = false;
    }

    //======initializer======//
    /**
     * @dev Initializes the contract.
     * @param _inviTokenAddr The address of the InviToken contract.
     */
    function initialize(address _inviTokenAddr) initializer public {
        __Ownable_init();
        inviToken = InviToken(_inviTokenAddr);
        _lendRatio = 90;
        maxLendRatio = _lendRatio * LEND_RATIO_UNIT / 100; // 90%
        _locked = false;
        _setStakeNFTContract = false;
    }

    //====== modifiers ======//

    //====== getter functions ======//
    /**
     * @notice Retrieves the lend information for a given NFT ID.
     * @param _nftId The ID of the NFT.
     * @return lendInfo The lend information.
     */
    function getLendInfo(uint _nftId) public view returns (LendInfo memory) {
        require(lendInfos[_nftId].user != address(0), "LendingPool: nft id not found");
        return lendInfos[_nftId];
    }
    
    /**
     * @notice gets current lend ratio
     * @dev returns maxLendRatio if currentInviSupply is greater than threshold, else returns maxLendRatio * currentInviSupply / threshold
     * @dev threshold is 100000
     * @return current lend ratio
     */
    function getLendRatio() public view returns (uint256) {
        uint256 currentInviSupply = inviToken.balanceOf(address(this));
        uint256 threshold = 100000; 
        if (currentInviSupply < threshold) {
            return maxLendRatio * currentInviSupply / threshold;
        }
        return maxLendRatio;
    }

    /**
     * @notice Calculates and returns the lent amount based on the principal value of the NFT.
     * @param _amount The principal value of the NFT.
     * @return The lent amount.
     */
    function getMaxLendAmount(uint256 _amount) public view returns (uint256) {
        uint256 lendRatio = getLendRatio();
        uint256 nativeValue = inviSwapPool.totalLiquidityInvi();
        uint256 inviValue = inviSwapPool.totalLiquidityNative();
        uint256 lendAmount = _amount * inviValue * lendRatio / LEND_RATIO_UNIT / nativeValue;
        return lendAmount;
    }

    function getMaxLendAmountByNFT(uint32 _nftId) public view returns (uint256) {
        StakeInfo memory stakeInfo = stakeNFTContract.getStakeInfo(_nftId);
        uint256 rewardAmount = stakeNFTContract.rewardAmount(_nftId);
        uint256 principal = stakeInfo.principal + rewardAmount;
        return getMaxLendAmount(principal);
    }

    function getMaxLendAmountWithBoost(uint256 _amount) public view returns (uint256) {
        uint256 maxLendAmount = uint256(getMaxLendAmount(_amount));
        uint256 maxLendAmountWithBoost = maxLendAmount * 100 / _lendRatio;
        return maxLendAmountWithBoost;
    }

    //====== setter functions ======//
    /**
     * @notice Sets the StakeNFT contract address.
     * @dev can be set only once by owner
     * @param _stakeNFTContract The address of the StakeNFT contract.
     */
    function setStakeNFTContract(address _stakeNFTContract) external onlyOwner {
        require(_setStakeNFTContract == false, "LendingPool: stakeNFT contract already set");
        stakeNFTContract = StakeNFT(_stakeNFTContract);
        _setStakeNFTContract = true;
    }

    /**
     * @notice Sets the InviSwapPool contract address.
     * @dev can be set only once by owner
     * @param _inviSwapPool The address of the InviSwapPool contract.
     */
    function setInviSwapPoolContract(address _inviSwapPool) external onlyOwner {
        require(_setInviSwapPoolContract == false, "LendingPool: inviSwapPool contract already set");
        inviSwapPool = InviSwapPool(_inviSwapPool);
        _setInviSwapPoolContract = true;
    }

    /**
     * @notice Sets the maximum lend ratio.
     * @dev can be set only by owner
     * @param _maxLendRatio The maximum lend ratio value.
     */
    function setMaxLendRatio(uint32 _maxLendRatio) external onlyOwner {
        require(_maxLendRatio <= LEND_RATIO_UNIT, "LendingPool: invalid max lend ratio");
        maxLendRatio = _maxLendRatio;
    }

    //====== service functions ======//
    /**
     * @notice lend inviToken by staking NFTs.
     * @param _nftId target nft
     * @param _requestAmount amount to lend
     */
    function lend(uint32 _nftId, uint256 _requestAmount) external nonReentrant {
        require(_requestAmount <= inviToken.balanceOf(address(this)), "LendingPool: insufficient balance");
        StakeInfo memory stakeInfo = stakeNFTContract.getStakeInfo(_nftId);
        require(stakeNFTContract.isOwner(_nftId, msg.sender) == true, "LendingPool: not owner of NFT");
        uint256 rewardAmount = stakeNFTContract.rewardAmount(_nftId);
        uint256 principal = stakeInfo.principal + rewardAmount;
        uint256 maxLendAmount = uint256(getMaxLendAmount(principal));
        uint256 maxLendAmountWithBoost = maxLendAmount * 100 / _lendRatio;
        if (_requestAmount > maxLendAmount) {
            require(maxLendAmountWithBoost >= _requestAmount, "LendingPool: invalid request amount");
            stakeNFTContract.boostLendAmount(_nftId, maxLendAmount, _requestAmount);
        }
        
        // require(_requestAmount <= maxLendAmount, "LendingPool: invalid request amount");

        totalLentAmount += _requestAmount;

        LendInfo memory lendInfo = LendInfo({
            user: stakeInfo.user,  
            principal: principal, 
            lentAmount: _requestAmount,
            nftId: _nftId
        });
        lendInfos[_nftId] = lendInfo;
        stakeNFTContract.setNFTIsLent(lendInfo.nftId, true);
        nftLentTime[_nftId] = block.timestamp;
        inviToken.transfer(lendInfo.user, _requestAmount);

        emit Lend(lendInfo.user, lendInfo.principal, lendInfo.lentAmount);
    }

    /**
     * @notice Allows users to repay the lent inviTokens by unstaking NFTs.
     * @dev Prevents reentrancy attacks.
     * @param _nftId The ID of the NFT.
     */
    function repay(uint _nftId) external nonReentrant {
        require(stakeNFTContract.isOwner(_nftId, msg.sender) == true, "LendingPool: not owner of NFT");
        LendInfo memory lendInfo = lendInfos[_nftId];
        uint256 repayAmount = lendInfo.lentAmount;
        require(lendInfo.user != address(0), "LendingPool: nft id not found");
        require(repayAmount <= inviToken.balanceOf(msg.sender), "LendingPool: insufficient balance");
        inviToken.transferToken(msg.sender, address(this), repayAmount);
        totalLentAmount -= repayAmount; // decrease total lent amount
        stakeNFTContract.setNFTIsLent(lendInfo.nftId, false); // set isLent to false
        nftLentTime[_nftId] = 0; // reset time
        deleteLendInfo(_nftId); // delete lend info

        emit Repay(msg.sender, repayAmount);
    }

    //===== utils functions ======//
    /**
     * @notice Deletes the lend information for a given NFT ID.
     * @param _nftId The ID of the NFT.
     */
    function deleteLendInfo(uint _nftId) private {
        LendInfo memory lendInfo = lendInfos[_nftId];
        require(lendInfo.user != address(0), "LendingPool: nft id not found");
        delete lendInfos[_nftId];
    }
}
