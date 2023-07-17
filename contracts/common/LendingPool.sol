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
    mapping(uint => LendInfo) public lendInfos;
    mapping(uint => uint) public nftLentTime;

    bool private _locked;
    //====== modifiers ======// 
    modifier nonReentrant() {
        require(!_locked, "Reentrant call detected");
        _locked = true;
        _;
        _locked = false;
    }

    //======initializer======//
    function initialize(address inviTokenAddr) initializer public {
        __Ownable_init();
        inviToken = InviToken(inviTokenAddr);
        maxLendRatio = 95 * LEND_RATIO_UNIT / 100; // 95%
        _locked = false;
    }

    //====== modifiers ======//

    //====== getter functions ======//

    /**
     * @dev Creates and returns the lend information for a given NFT ID.
     * @param _nftId The ID of the NFT.
     * @param _slippage The slippage value.
     * @return lendInfo The lend information.
     */
    function createLendInfo(uint32 _nftId, uint32 _slippage) external view returns (LendInfo memory) {
        StakeInfo memory stakeInfo = stakeNFTContract.getStakeInfo(_nftId);
        uint256 lendAmount = getLendAmount(stakeInfo.principal);
        uint128 minLendAmount = uint128(lendAmount) * (100 * SLIPPAGE_UNIT - _slippage) / (100 * SLIPPAGE_UNIT);
        LendInfo memory lendInfo = LendInfo(stakeInfo.user, _nftId, stakeInfo.principal, minLendAmount, 0);
        return lendInfo;
    }

    /**
     * @dev Retrieves the lend information for a given NFT ID.
     * @param _nftId The ID of the NFT.
     * @return lendInfo The lend information.
     */
    function getLendInfo(uint _nftId) public view returns (LendInfo memory) {
        require(lendInfos[_nftId].user != address(0), "LendingPool: nft id not found");
        return lendInfos[_nftId];
    }

    //====== setter functions ======//

    /**
     * @dev Sets the StakeNFT contract address.
     * @param _stakeNFTContract The address of the StakeNFT contract.
     */
    function setStakeNFTContract(address _stakeNFTContract) external onlyOwner {
        stakeNFTContract = StakeNFT(_stakeNFTContract);
    }

    /**
     * @dev Sets the PriceManager contract address.
     * @param _priceManager The address of the PriceManager contract.
     */
    function setPriceManager(address _priceManager) external onlyOwner {
        priceManager = PriceManager(_priceManager);
    }

    /**
     * @dev Sets the maximum lend ratio.
     * @param _maxLendRatio The maximum lend ratio value.
     */
    function setMaxLendRatio(uint32 _maxLendRatio) external onlyOwner {
        maxLendRatio = _maxLendRatio;
    }

    //====== service functions ======//

    /**
     * @dev Allows users to lend inviTokens by staking NFTs.
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
    }

    /**
     * @dev Allows users to repay the lent inviTokens by unstaking NFTs.
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
    }

    //===== utils functions ======//

    /**
     * @dev Calculates and returns the lent amount based on the principal value of the NFT.
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
        return _amount * maxLendRatio / LEND_RATIO_UNIT;
    }

    /**
     * @dev Verifies the lend information provided by the user.
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
     * @dev Deletes the lend information for a given NFT ID.
     * @param _nftId The ID of the NFT.
     */
    function deleteLendInfo(uint _nftId) private {
        LendInfo memory lendInfo = lendInfos[_nftId];
        require(lendInfo.user != address(0), "LendingPool: nft id not found");
        delete lendInfos[_nftId];
    }
}
