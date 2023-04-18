// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./lib/Structs.sol";
import "./lib/ArrayUtils.sol";
import "hardhat/console.sol";
import "./LendingPool.sol";
import "./StakeNFT.sol";


contract StakeNFTFactory is Initializable, OwnableUpgradeable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    //------Contracts and Addresses------//
    address public inviCoreAddress;
    address public lendingPoolAddress;
    
    //------mappings------//
    // store all stakeInfos
    mapping (uint => StakeInfo) public stakeInfos;
    // tokenId -> tokenAddress
    mapping (uint => address) public nftAddresses;


    //------public Variables------//
    uint public totalStakedAmount;
    uint[] public nftTokenIds;

    //------private Variables------//
    string private _name;
    string private _symbol;
    
    //====== initializer ======//
    function initialize() initializer public {
        __Ownable_init();
    }

    //====== modifiers ======//
    modifier onlyInviCore {
        require(msg.sender == inviCoreAddress, "msg sender should be invi core");
        _;
    }

    modifier onlyLendingPool {
        require(msg.sender == address(lendingPoolAddress), "msg sender should be lending pool");
        _;
    }
    
    //====== getter functions ======//
    // return the stakeInfo by nftTokenId
    function getStakeInfo(uint nftTokenId) public view returns (StakeInfo memory){
        StakeInfo memory stakeInfo = stakeInfos[nftTokenId];
        require(stakeInfo.user != address(0), "stakeInfo does not exist");
        return stakeInfos[nftTokenId];
    }

  function getUserNFTs(address _user) public view returns (uint[] memory) {
    uint counter = 0;
    for (uint i = 0; i < _tokenIds.current(); i++) {
        StakeNFT nft = StakeNFT(nftAddresses[i]);
        if (nft.getUser() == _user) {
            counter++;
        }
    }
    uint[] memory userNFTs = new uint[](counter);
    counter = 0;
    for (uint i = 0; i < _tokenIds.current(); i++) {
        StakeNFT nft = StakeNFT(nftAddresses[i]);
        if (nft.getUser() == _user) {
            userNFTs[counter] = nft.getTokenId();
            counter++;
        }
    }
    return userNFTs;
}

    function getRewardAmount(uint _nftTokenId) public view returns (uint) {
        StakeNFT nft = StakeNFT(nftAddresses[_nftTokenId]);
        return nft.getRewardAmount();
    }
    
    //====== setter functions ======//

    function setInviCoreAddress(address _inviCore) public onlyOwner {
        inviCoreAddress = _inviCore;
    }

    function setLendingPoolAddress(address _LendingPool) public onlyOwner {
        lendingPoolAddress = _LendingPool;
    }

    function setTotalStakedAmount(uint _totalStakedAmount) public onlyInviCore {
        totalStakedAmount = _totalStakedAmount;
    }

    function setNFTIsLent(uint _tokenId, bool _isLent) public onlyLendingPool {
        stakeInfos[_tokenId].isLent = _isLent;
        address nftAddress = nftAddresses[_tokenId];
        StakeNFT stakeNFT = StakeNFT(nftAddress);
        stakeNFT.setNFTIsLent(_isLent);
    }

    //====== service functions ======//

    // function to create a new NFT on user request
    function mintNFT(StakeInfo memory _stakeInfo) public onlyInviCore returns (uint) {
        uint newTokenId = _tokenIds.current();
        _tokenIds.increment();
        
        // set lock period
         _stakeInfo.lockStart = block.timestamp;
         _stakeInfo.lockEnd =  _stakeInfo.lockStart + _stakeInfo.lockPeriod;

         // create new NFT
        StakeNFT nft = new StakeNFT();
        nft.initialize(_stakeInfo, newTokenId);
        console.log("nft address: ", address(nft));

        // mint nft with tokenId
        nft.mint(_stakeInfo.user);

        // update info
        nftTokenIds.push(newTokenId);
        totalStakedAmount += _stakeInfo.stakedAmount;
        nftAddresses[newTokenId] = address(nft);
        stakeInfos[newTokenId] = _stakeInfo;

        return newTokenId;
    }

    function burnNFT(uint _tokenId) public onlyInviCore {
        StakeNFT nft = StakeNFT(nftAddresses[_tokenId]);
        // burn nft
        nft.burn(_tokenId);
        // update info
        totalStakedAmount -= stakeInfos[_tokenId].stakedAmount;
         // delete stakeInfo
        deleteStakeInfo(_tokenId);
        // delete nftAddress
        delete nftAddresses[_tokenId];
        // delete nftTokenId
        popValueFromUintArray(nftTokenIds, _tokenId);
    }

    function updateReward(uint _totalReward) external onlyInviCore{
        for (uint256 i = 0; i < nftTokenIds.length; i++) {
            StakeNFT nft = StakeNFT(nftAddresses[nftTokenIds[i]]);
            nft.addReward(_totalReward * nft.getStakedAmount() / totalStakedAmount);
        }
    }


    //======utils======//
    // check if nft exists
    function exists(uint nftTokenId) public view returns (bool) {
        // check if NFT exists by checking if it has a stakeInfo associated with it
        return stakeInfos[nftTokenId].user != address(0);
    }

    // check if the nft is unlocked
    function isUnlocked(uint nftTokenId) public view returns (bool) {
        StakeInfo memory stakeInfo = stakeInfos[nftTokenId];
        return stakeInfo.lockEnd < block.timestamp;
    }

    // delete the stakeInfo by nftTokenId
    function deleteStakeInfo(uint nftTokenId) private {
        stakeInfos[nftTokenId].user = address(0);
    }

    function isOwner(uint nftTokenId, address _owner) public view returns (bool) {
        StakeNFT nft = StakeNFT(nftAddresses[nftTokenId]);
        return nft.isOwner(_owner);
    }
}