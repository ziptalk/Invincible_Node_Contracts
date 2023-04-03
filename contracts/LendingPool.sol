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


contract LendingPool is Initializable, OwnableUpgradeable {
    InviToken public inviToken;
    StakeNFT public stakeNFTContract;

    uint public lendRatio;
    uint public totalLentAmount;
    mapping (address => LendInfo[]) public lendInfos;
    
    
    //======initializer======//
    function initialize(address _inviTokenAddr,address _stakeNFTAddr) initializer public {
        inviToken = InviToken(_inviTokenAddr);
        stakeNFTContract = StakeNFT(_stakeNFTAddr);
        lendRatio = 8 * LEND_RATIO_UNIT / 10 ;
        __Ownable_init();
    }

    //====== modifiers ======//
    
    //====== getter functions ======//
    function getLentAmount(uint _amount) public view returns (uint) {
        uint swapRatio = 8 * SWAP_RATIO_UNIT / 10 ;
        return _amount * swapRatio * lendRatio / (SWAP_RATIO_UNIT * LEND_RATIO_UNIT);
    }

    function createLendInfo(uint _nftId) public view returns (LendInfo memory) {
        StakeInfo memory stakeInfo = stakeNFTContract.getStakeInfo(_nftId);
        uint lentAmount = getLentAmount(stakeInfo.principal);

        LendInfo memory lendInfo = LendInfo(stakeInfo.user, _nftId, stakeInfo.principal, lentAmount);
        return lendInfo;
    }

    //====== setter functions ======//
    function setLendRatio(uint _lendRatio) public onlyOwner{
        lendRatio = _lendRatio;
    }


    //====== service functions ======//

    // lend inviToken by staking NFT
    function lend(LendInfo memory _lendInfo) public {
        _verifyLendInfo(_lendInfo, msg.sender);

        // update info
        totalLentAmount += _lendInfo.lentAmount;
        lendInfos[_lendInfo.user].push(_lendInfo);
        stakeNFTContract.setNFTIsLent(_lendInfo.nftId, true);

        // transfer inviToken
        inviToken.mintLentToken(_lendInfo.user, _lendInfo.lentAmount);
    }

    function repay(uint _index) public {
        require(_index < lendInfos[msg.sender].length, "index is out of range");
        LendInfo memory lendInfo = getLendInfo(msg.sender, _index);
        require(lendInfo.lentAmount > inviToken.balanceOf(msg.sender), ERROR_INSUFFICIENT_BALANCE);

        // update info
        totalLentAmount -= lendInfo.lentAmount;
        stakeNFTContract.setNFTIsLent(lendInfo.nftId, false);
        deleteLendInfo(msg.sender, _index);

        // transfer inviToken
        inviToken.transferFrom(msg.sender, address(this), lendInfo.lentAmount);
    }

    //===== utils functions ======//

    // verify lendInfo
    function _verifyLendInfo(LendInfo memory _lendInfo, address _msgSender) private {
        require(_lendInfo.user == _msgSender, ERROR_INVALID_LEND_INFO);
        require(stakeNFTContract.isOwner(_lendInfo.nftId, _lendInfo.user), ERROR_INVALID_LEND_INFO);
        require(_lendInfo.lentAmount == getLentAmount(_lendInfo.principal), ERROR_INVALID_LEND_INFO);
    }

    // return the lendInof by index
    function getLendInfo(address user, uint index) public view returns (LendInfo memory){
        require(index < lendInfos[user].length, "index is out of range");
        return lendInfos[user][index];
    }

    // delete the lendInfo by nftTokenId
    function deleteLendInfo(address user, uint index) private returns (bool){
        require(index < lendInfos[user].length, "index is out of range");

        for(uint i = index; i < lendInfos[user].length - 1; i++){
            lendInfos[user][i] = lendInfos[user][i + 1];
        }

        lendInfos[user].pop();
    }
}
