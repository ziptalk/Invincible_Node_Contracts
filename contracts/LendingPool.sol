// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./StakeNFT.sol";
import "./interfaces/IERC20.sol";
import "./lib/Structs.sol";
import "./lib/ErrorMessages.sol";
import "./lib/Unit.sol";
import "./tokens/InviToken.sol";
import "hardhat/console.sol";
import "./lib/ErrorMessages.sol";
import "./PriceManager.sol";


contract LendingPool is Initializable, OwnableUpgradeable {
    InviToken public inviToken;
    StakeNFT public stakeNFTContract;
    PriceManager public priceManager;


    //uint public swapRatio; //invi <-> networkToken swapRatio
    uint public maxLendRatio;
    uint public totalLentAmount;
    mapping (uint => LendInfo) public lendInfos;
    
    
    //======initializer======//
    function initialize(address inviTokenAddr) initializer public {
        __Ownable_init();
        inviToken = InviToken(inviTokenAddr);
        maxLendRatio = 8 * LEND_RATIO_UNIT / 10 ; // 0.8
    }

    //====== modifiers ======//
    
    //====== getter functions ======//

    function createLendInfo(uint _nftId, uint _lendRatio, uint _slippage) public view returns (LendInfo memory) {
        require(_lendRatio <= maxLendRatio, ERROR_SWAP_RATIO_TOO_HIGH);
        StakeInfo memory stakeInfo = stakeNFTContract.getStakeInfo(_nftId); // get nft principal value
        console.log(stakeInfo.principal);
        uint lendAmount = getLendAmount(stakeInfo.principal, _lendRatio); // get lent amount by principal
        console.log(lendAmount);
        uint minLendAmount = lendAmount * (100 * SLIPPAGE_UNIT - _slippage) / (100 * SLIPPAGE_UNIT); // get minLendAmount by slippage
        console.log(minLendAmount);
        LendInfo memory lendInfo = LendInfo(stakeInfo.user, _nftId, stakeInfo.principal, _lendRatio, minLendAmount, 0 );
        return lendInfo;
    }

    function getLendInfo(uint _nftId) public view returns (LendInfo memory) {
        require(lendInfos[_nftId].user != address(0), ERROR_NOT_FOUND_LEND_INFO);
        return lendInfos[_nftId];
    }

    //====== setter functions ======//

    function setStakeNFTContract(address _stakeNFTContract) public onlyOwner {
        stakeNFTContract = StakeNFT(_stakeNFTContract);
    }

    function setPriceManager (address _priceManager) public onlyOwner {
        priceManager = PriceManager(_priceManager);
    }

    function setMaxLendRatio(uint _maxLendRatio) public onlyOwner{
        maxLendRatio = _maxLendRatio;
    }


    //====== service functions ======//

    // lend inviToken by staking NFT
    function lend(LendInfo memory _lendInfo) public {
        // verify lendInfo
        uint lendAmount = _verifyLendInfo(_lendInfo, msg.sender);
        _lendInfo.lentAmount = lendAmount;

        // update info
        totalLentAmount += _lendInfo.lentAmount;
        lendInfos[_lendInfo.nftId] = _lendInfo;
        stakeNFTContract.setNFTIsLent(_lendInfo.nftId, true);

        // transfer inviToken
        inviToken.transfer(_lendInfo.user, lendAmount);
    }

    function repay(uint nftId) public {
        require(stakeNFTContract.isOwner(nftId, msg.sender) == true, ERROR_NOT_NFT_OWNER);
        LendInfo memory lendInfo = lendInfos[nftId];
        require(lendInfo.user != address(0), ERROR_NOT_FOUND_LEND_INFO);
        require(lendInfo.lentAmount <= inviToken.balanceOf(msg.sender), ERROR_INSUFFICIENT_BALANCE);

        // transfer inviToken
        inviToken.transferFrom(msg.sender, address(this), lendInfo.lentAmount);

        // update info
        totalLentAmount -= lendInfo.lentAmount;
        stakeNFTContract.setNFTIsLent(lendInfo.nftId, false);
        deleteLendInfo(nftId);
    }

    //===== utils functions ======//

    // get the lent amount
    function getLendAmount(uint _amount, uint _lendRatio) private view returns (uint) {
        uint klayPrice = priceManager.getKlayPrice();
        uint inviPrice = priceManager.getInviPrice();
        console.log(klayPrice, inviPrice, _lendRatio);
        console.log(_amount * _lendRatio * klayPrice / (inviPrice *  LEND_RATIO_UNIT));
        return _amount * _lendRatio * klayPrice / (inviPrice * LEND_RATIO_UNIT);
    }

    // verify lendInfo
    function _verifyLendInfo(LendInfo memory _lendInfo, address _msgSender) private view returns ( uint ) {
        require(_lendInfo.user == _msgSender, ERROR_INVALID_LEND_INFO);
        require(stakeNFTContract.isOwner(_lendInfo.nftId, _lendInfo.user), ERROR_INVALID_LEND_INFO);
        require(_lendInfo.lendRatio <= maxLendRatio, ERROR_INVALID_LEND_INFO);
        uint lendAmount = getLendAmount(_lendInfo.principal, _lendInfo.lendRatio);
        require(_lendInfo.minLendAmount <=  lendAmount, ERROR_INVALID_LEND_INFO);
        return lendAmount;
    }

    // delete the lendInfo by nftTokenId
    function deleteLendInfo(uint nftId) private {
        LendInfo memory lendInfo = lendInfos[nftId];
        require(lendInfo.user != address(0), ERROR_NOT_FOUND_LEND_INFO);
        delete lendInfos[nftId];
    }
}