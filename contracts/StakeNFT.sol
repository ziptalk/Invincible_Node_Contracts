// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./lib/Structs.sol";
import "./lib/ArrayUtils.sol";
import "hardhat/console.sol";


contract StakeNFT is Initializable, ERC721Upgradeable, OwnableUpgradeable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    //------Contracts and Addresses------//
    address public INVI_CORE;

    //------mappings------//
    // show which address have which NFT
    mapping (address => uint[]) public NFTOwnership;
    mapping (uint => uint) public rewardAmount;
    // store all stakeInfos
    mapping (uint => StakeInfo) public stakeInfos;

    //------public Variables------//
    uint public totalStakedAmount;
    uint[] public nftTokenIds;

    //------private Variables------//
    string private _name;
    string private _symbol;
    
    //====== initializer ======//
    function initialize() initializer public {
        __ERC721_init("Stake NFT", "SNFT");
        __Ownable_init();
        // set initial state variables
    }

    //====== modifiers ======//
    modifier onlyInviCore {
        require(msg.sender == INVI_CORE, "msg sender should be invi core");
        _;
    }
    
    //====== getter functions ======//

    function getRewardAmount(uint _tokenId) public view returns (uint) {
        return rewardAmount[_tokenId];
    }

    //====== setter functions ======//

    function setInviCoreAddress(address _inviCore) public onlyOwner {
        INVI_CORE = _inviCore;
    }

    function setTotalStakedAmount(uint _totalStakedAmount) public onlyInviCore {
        totalStakedAmount = _totalStakedAmount;
    }

    //====== service functions ======//

    // only owner can mint NFT
    function mintNFT(StakeInfo memory _stakeInfo) public onlyInviCore returns (uint) {
        uint newTokenId = _tokenIds.current();
        _mint(_stakeInfo.user, newTokenId);

        _stakeInfo.lockStart = block.timestamp;
        _stakeInfo.lockEnd =  _stakeInfo.lockStart + _stakeInfo.lockPeriod;
        stakeInfos[newTokenId] = _stakeInfo;

        // update info
        NFTOwnership[_stakeInfo.user].push(newTokenId);
        nftTokenIds.push(newTokenId);
        rewardAmount[newTokenId] = 0;
        totalStakedAmount += _stakeInfo.stakedAmount;
       
        _tokenIds.increment();
        return newTokenId;
    }

    // only owner can burn NFT
    function burnNFT(uint nftTokenId) public onlyInviCore returns (bool) {
        _burn(nftTokenId);
    }

    // override transferFrom function
    function transferFrom(address from, address to, uint256 tokenId) public override {
        //solhint-disable-next-line max-line-length
        require(_isApprovedOrOwner(from, tokenId), "ERC721: caller is not token owner or approved");

        // switch token ownership
        popValueFromUintArray(NFTOwnership[from], tokenId);
        NFTOwnership[to].push(tokenId);

        _transfer(from, to, tokenId);
    }

    function updateReward(uint _totalReward) external onlyInviCore{
        for (uint256 i = 0; i < nftTokenIds.length; i++) {
            
            uint nftId = nftTokenIds[i];
            rewardAmount[nftId] += _totalReward * stakeInfos[nftId].stakedAmount / totalStakedAmount;
        }
    }

    // return the nft is existed
    function isExisted(uint nftTokenId) public view returns (bool) {
        return _exists(nftTokenId);
    }


    // return the address is nft owner
    function isOwner(uint nftTokenId, address owner) public view returns (bool) {
        return owner == ownerOf(nftTokenId);
    }

    // return the nft is unlocked
    function isUnlock(uint nftTokenId) public view returns (bool) {
        StakeInfo memory stakeInfo = stakeInfos[nftTokenId];
        return stakeInfo.lockEnd < block.timestamp;
    }

    // return the stakeInfo by nftTokenId
    function getStakeInfo(uint nftTokenId) public view returns (StakeInfo memory){
        StakeInfo memory stakeInfo = stakeInfos[nftTokenId];
        require(stakeInfo.user != address(0), "stakeInfo is not exist");
        return stakeInfos[nftTokenId];
    }

    // delete the stakeInfo by nftTokenId
    function deleteStakeInfo(uint nftTokenId) public returns (bool){
        stakeInfos[nftTokenId].user = address(0);
    }
}
