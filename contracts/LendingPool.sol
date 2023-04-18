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


contract LendingPool is Initializable, OwnableUpgradeable {
    InviToken public inviToken;
    StakeNFT public stakeNFTContract;

    uint public swapRatio; //invi <-> networkToken swapRatio
    uint public maxLendRatio;
    uint public totalLentAmount;
    mapping (uint => LendInfo) public lendInfos;
    
    
    //======initializer======//
    function initialize(address inviTokenAddr) initializer public {
        __Ownable_init();
        inviToken = InviToken(inviTokenAddr);
        swapRatio = 9 * SWAP_RATIO_UNIT / 10; // 0.9
        maxLendRatio = 8 * LEND_RATIO_UNIT / 10 ; // 0.8
    }

    //====== modifiers ======//
    
    //====== getter functions ======//

    function createLendInfo(uint _nftId, uint _lendRatio) public view returns (LendInfo memory) {
        require(_lendRatio <= maxLendRatio, ERROR_SWAP_RATIO_TOO_HIGH);
        StakeInfo memory stakeInfo = stakeNFTContract.getStakeInfo(_nftId); // get nft principal value
        
        uint lentAmount = getLentAmount(stakeInfo.principal, _lendRatio); // get lent amount by principal

        LendInfo memory lendInfo = LendInfo(stakeInfo.user, _nftId, stakeInfo.principal, lentAmount, _lendRatio);
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

    function setMaxLendRatio(uint _maxLendRatio) public onlyOwner{
        maxLendRatio = _maxLendRatio;
    }

    function setSwapRatio(uint _swapRatio) public onlyOwner{
        swapRatio = _swapRatio;
    }


    //====== service functions ======//

    // lend inviToken by staking NFT
    function lend(LendInfo memory _lendInfo) public {
        _verifyLendInfo(_lendInfo, msg.sender);

        // update info
        totalLentAmount += _lendInfo.lentAmount;
        lendInfos[_lendInfo.nftId] = _lendInfo;
        stakeNFTContract.setNFTIsLent(_lendInfo.nftId, true);

        // transfer inviToken
        inviToken.mintLentToken(_lendInfo.user, _lendInfo.lentAmount);
    }

    function repay(uint nftId) public {
        require(stakeNFTContract.isOwner(nftId, msg.sender) == true, ERROR_NOT_NFT_OWNER);
        LendInfo memory lendInfo = lendInfos[nftId];
        require(lendInfo.user != address(0), ERROR_NOT_FOUND_LEND_INFO);
        require(lendInfo.lentAmount <= inviToken.balanceOf(msg.sender), ERROR_INSUFFICIENT_BALANCE);

        // update info
        totalLentAmount -= lendInfo.lentAmount;
        stakeNFTContract.setNFTIsLent(lendInfo.nftId, false);
        deleteLendInfo(nftId);

        // transfer inviToken
        inviToken.transferFrom(msg.sender, address(this), lendInfo.lentAmount);
    }

    //===== utils functions ======//

    // get the lent amount
    function getLentAmount(uint _amount, uint _lendRatio) private view returns (uint) {
        return _amount * _lendRatio * swapRatio / (SWAP_RATIO_UNIT * LEND_RATIO_UNIT);
    }

    // verify lendInfo
    function _verifyLendInfo(LendInfo memory _lendInfo, address _msgSender) private {
        require(_lendInfo.user == _msgSender, ERROR_INVALID_LEND_INFO);
        require(stakeNFTContract.isOwner(_lendInfo.nftId, _lendInfo.user), ERROR_INVALID_LEND_INFO);
        require(_lendInfo.lentAmount == getLentAmount(_lendInfo.principal, _lendInfo.lendRatio), ERROR_INVALID_LEND_INFO);
    }

    // delete the lendInfo by nftTokenId
    function deleteLendInfo(uint nftId) private returns (bool){
        LendInfo memory lendInfo = lendInfos[nftId];
        require(lendInfo.user != address(0), ERROR_NOT_FOUND_LEND_INFO);
        delete lendInfos[nftId];
    }
}