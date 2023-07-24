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
    function getMaxLendAmount(uint128 _amount) public view returns (uint256) {
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
     * @notice lend inviToken by staking NFTs.
     * @param _nftId target nft
     * @param _requestAmount amount to lend
     */
    function lend(uint32 _nftId, uint128 _requestAmount) external nonReentrant {
        require(_requestAmount <= inviToken.balanceOf(address(this)), "LendingPool: insufficient balance");
        StakeInfo memory stakeInfo = stakeNFTContract.getStakeInfo(_nftId);
        require(stakeInfo.user == msg.sender, "LendingPool: invalid user");
        uint128 rewardAmount = stakeNFTContract.rewardAmount(_nftId);
        uint128 principal = stakeInfo.principal + rewardAmount;
        uint128 maxLendAmount = uint128(getMaxLendAmount(principal));
        
        require(_requestAmount <= maxLendAmount, "LendingPool: invalid request amount");

        totalLentAmount += _requestAmount;

        LendInfo memory lendInfo = LendInfo({
            user: stakeInfo.user, 
            nftId: _nftId, 
            principal: principal, 
            lentAmount: _requestAmount
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
     * @notice Deletes the lend information for a given NFT ID.
     * @param _nftId The ID of the NFT.
     */
    function deleteLendInfo(uint _nftId) private {
        LendInfo memory lendInfo = lendInfos[_nftId];
        require(lendInfo.user != address(0), "LendingPool: nft id not found");
        delete lendInfos[_nftId];
    }
}
