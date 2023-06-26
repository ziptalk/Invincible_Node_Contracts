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


contract StakeNFT is Initializable, ERC721Upgradeable, OwnableUpgradeable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    //------Contracts and Addresses------//
    address public inviCoreAddress;
    address public lendingPoolAddress;

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

    //------Upgrades------//
    uint public dummyId;
    
    //====== initializer ======//
    function initialize() initializer public {
        __ERC721_init("Stake NFT", "SNFT");
        __Ownable_init();

        dummyId = 10 **18;
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
    function getRewardAmount(uint _tokenId) public view returns (uint) {
        return rewardAmount[_tokenId];
    }

    function getNFTOwnership(address _user) public view returns (uint[] memory) {
        return NFTOwnership[_user];
    }

    // return the stakeInfo by nftTokenId
    function getStakeInfo(uint _nftTokenId) public view returns (StakeInfo memory){
        StakeInfo memory stakeInfo = stakeInfos[_nftTokenId];
        require(stakeInfo.user != address(0), "stakeInfo does not exist");
        return stakeInfos[_nftTokenId];
    }

    function getAllStakeInfoOfUser(address _user) public view returns (StakeInfo[] memory) {
        uint[] memory _nftTokenIds = NFTOwnership[_user];
        StakeInfo[] memory stakeInfosOfUser = new StakeInfo[](_nftTokenIds.length);
        for (uint i = 0; i < _nftTokenIds.length; i++) {
            stakeInfosOfUser[i] = stakeInfos[_nftTokenIds[i]];
        }
        return stakeInfosOfUser;
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
    function burnNFT(uint nftTokenId) public onlyInviCore  {
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

    //====== utils functions ======//

    // return the nft is existed
    function isExisted(uint _nftTokenId) public view returns (bool) {
        return _exists(_nftTokenId);
    }


    // return the address is nft owner
    function isOwner(uint _nftTokenId, address _owner) public view returns (bool) {
        return _owner == ownerOf(_nftTokenId);
    }

    // return the nft is unlocked
    function isUnlock(uint _nftTokenId) public view returns (bool) {
        StakeInfo memory stakeInfo = stakeInfos[_nftTokenId];
        return stakeInfo.lockEnd < block.timestamp;
    }

    // delete the stakeInfo by nftTokenId
    function deleteStakeInfo(uint _nftTokenId) public onlyInviCore {
        stakeInfos[_nftTokenId].user = address(0);
    }

    function deleteNFTOwnership(address _nftOwner, uint _nftTokenId) public onlyInviCore {
        // get the index of nftTokenId
        uint _nftTokenIndex = getIndex(NFTOwnership[_nftOwner], _nftTokenId);
        // set the nftTokenId to dummyId
        NFTOwnership[_nftOwner][_nftTokenIndex] = NFTOwnership[_nftOwner][NFTOwnership[_nftOwner].length - 1];
        NFTOwnership[_nftOwner].pop();    
    }
}
