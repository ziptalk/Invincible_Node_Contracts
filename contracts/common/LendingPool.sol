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
import "./PriceManager.sol";

/**
 * @title LendingPool
 * @dev The LendingPool contract allows users to lend inviTokens by staking NFTs.
 */
contract LendingPool is Initializable, OwnableUpgradeable {
    InviToken public inviToken;
    StakeNFT public stakeNFTContract;
    PriceManager public priceManager;

    uint32 public maxLendRatio;
    uint128 public totalLentAmount;
    bool private _setStakeNFTContract;
    bool private _setPriceManager;
    bool private _locked;
    mapping(uint => LendInfo) public lendInfos;
    mapping(uint => uint) public nftLentTime;

    event Lend(address indexed user, uint128 indexed principal, uint128 indexed lentAmount);
    event Repay(address indexed user, uint128 indexed returnAmount);

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
        maxLendRatio = 90 * LEND_RATIO_UNIT / 100; // 90%
        _locked = false;
        _setStakeNFTContract = false;
        _setPriceManager = false;
    }

    //====== modifiers ======//

    //====== getter functions ======//
    /**
     * @notice Creates and returns the lend information for a given NFT ID.
     * @notice Can lend from the principal and reward amount of the NFT.
     * @param _nftId The ID of the NFT.
     * @param _slippage The slippage value.
     * @return lendInfo The lend information.
     */
    function createLendInfo(uint32 _nftId, uint32 _slippage) external view returns (LendInfo memory) {
        StakeInfo memory stakeInfo = stakeNFTContract.getStakeInfo(_nftId);
        uint128 rewardAmount = stakeNFTContract.rewardAmount(_nftId);
        uint128 principal = stakeInfo.principal + rewardAmount;
        uint256 lendAmount = getLendAmount(principal); // lend from principal and reward amount
        uint128 minLendAmount = uint128(lendAmount) * (100 * SLIPPAGE_UNIT - _slippage) / (100 * SLIPPAGE_UNIT);
        LendInfo memory lendInfo = LendInfo({
            user: stakeInfo.user, 
            nftId: _nftId, 
            principal: principal, 
            minLendAmount: minLendAmount, 
            lentAmount: 0
        });
        return lendInfo;
    }

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
     * @return current lend ratio
     */
    function getLendRatio() public view returns (uint256) {
        uint256 currentInviSupply = inviToken.balanceOf(address(this));
        return currentInviSupply * maxLendRatio / (currentInviSupply + totalLentAmount);
    }

    /**
     * @notice Calculates and returns the lent amount based on the principal value of the NFT.
     * @param _amount The principal value of the NFT.
     * @return The lent amount.
     */
    function getLendAmount(uint128 _amount) public view returns (uint256) {
        //===== Old version =====//
        // uint128 nativePrice = priceManager.getNativePrice();
        // uint128 inviPrice = priceManager.getInviPrice();
        // uint256 totalInviSupply = uint128(inviToken.balanceOf(address(this)));
        // uint256 maxLendAmount = _amount * nativePrice * maxLendRatio / (inviPrice * LEND_RATIO_UNIT);
        // return maxLendAmount * (totalInviSupply - maxLendAmount) / totalInviSupply;

        //===== New version =====//
        uint256 lendRatio = getLendRatio();
        uint256 lendAmount = _amount * lendRatio / LEND_RATIO_UNIT;
        return lendAmount;
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
     * @notice Sets the PriceManager contract address.
     * @dev can be set only once by owner
     * @param _priceManager The address of the PriceManager contract.
     */
    function setPriceManagerAddress(address _priceManager) external onlyOwner {
        require(_setPriceManager == false, "LendingPool: priceManager contract already set");
        priceManager = PriceManager(_priceManager);
        _setPriceManager = true;
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
     * @notice Allows users to lend inviTokens by staking NFTs.
     * @dev Prevents reentrancy attacks.
     * @param _lendInfo The lend information.
     */
    function lend(LendInfo memory _lendInfo) external nonReentrant {
        uint256 lendAmount = _verifyLendInfo(_lendInfo, msg.sender);
        _lendInfo.lentAmount = uint128(lendAmount);
        totalLentAmount += _lendInfo.lentAmount;
        lendInfos[_lendInfo.nftId] = _lendInfo;
        stakeNFTContract.setNFTIsLent(_lendInfo.nftId, true);
        nftLentTime[_lendInfo.nftId] = block.timestamp;
        inviToken.transfer(_lendInfo.user, lendAmount);

        emit Lend(_lendInfo.user, _lendInfo.principal, _lendInfo.lentAmount);
    }

    /**
     * @notice Allows users to repay the lent inviTokens by unstaking NFTs.
     * @dev Prevents reentrancy attacks.
     * @param _nftId The ID of the NFT.
     */
    function repay(uint _nftId) external nonReentrant {
        require(stakeNFTContract.isOwner(_nftId, msg.sender) == true, "LendingPool: not owner of NFT");
        LendInfo memory lendInfo = lendInfos[_nftId];
        require(lendInfo.user != address(0), "LendingPool: nft id not found");
        require(lendInfo.lentAmount <= inviToken.balanceOf(msg.sender), "LendingPool: insufficient balance");
        inviToken.transferToken(msg.sender, address(this), lendInfo.lentAmount);
        totalLentAmount -= lendInfo.lentAmount;
        stakeNFTContract.setNFTIsLent(lendInfo.nftId, false);
        deleteLendInfo(_nftId);

        emit Repay(msg.sender, lendInfo.lentAmount);
    }

    //===== utils functions ======//
    /**
     * @notice Verifies the lend information provided by the user.
     * @param _lendInfo The lend information.
     * @param _user The address of the message sender.
     * @return lendAmount The verified lend amount.
     */
    function _verifyLendInfo(LendInfo memory _lendInfo, address _user) private view returns (uint256) {
        require(_lendInfo.user == _user, "LendingPool: invalid user");
        require(stakeNFTContract.isOwner(_lendInfo.nftId, _lendInfo.user), "LendingPool: not owner of NFT");
        uint256 lendAmount = getLendAmount(_lendInfo.principal);
        require(_lendInfo.minLendAmount <= lendAmount, "LendingPool: invalid min lend amount");
        return lendAmount;
    }

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
