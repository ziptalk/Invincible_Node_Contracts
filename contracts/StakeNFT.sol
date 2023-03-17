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
    string private _name;
    string private _symbol;

    // show which address have which NFT
    mapping (address => uint[]) public NFTOwnership;

    // store all stakeInfos
    mapping (uint => StakeInfo) public stakeInfos;
    

    function initialize() initializer public {
        __ERC721_init("Stake NFT", "SNFT");
        __Ownable_init();
        // set initial state variables
    }

    // only owner can mint NFT
    function mintNFT(StakeInfo memory _stakeInfo) public onlyOwner returns (uint) {
        uint newItemId = _tokenIds.current();
        _mint(_stakeInfo.user, newItemId);

        _stakeInfo.lockStart = block.timestamp;
        _stakeInfo.lockEnd =  _stakeInfo.lockStart + _stakeInfo.lockPeriod;
        stakeInfos[newItemId] = _stakeInfo;

        // update NFT Ownership
        NFTOwnership[_stakeInfo.user].push(newItemId);
       
         _tokenIds.increment();
        return newItemId;
    }

    // only owner can burn NFT
    function burnNFT(uint nftTokenId) public onlyOwner returns (bool) {
        _burn(nftTokenId);

    }

    // override transferFrom function
    function transferFrom(address from, address to, uint256 tokenId) public override {
        //solhint-disable-next-line max-line-length
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: caller is not token owner or approved");

        // switch token ownership
        popValueFromUintArray(NFTOwnership[from], tokenId);
        NFTOwnership[to].push(tokenId);

        _transfer(from, to, tokenId);
    }

    // verify nft ownership
    function verifyOwnership(uint nftTokenId, address owner) public view returns (bool) {
        console.log("here", NFTOwnership[owner].length);
        for(uint i = 0; i < NFTOwnership[owner].length; i++){
            console.log("here", NFTOwnership[owner][i]);
            if(NFTOwnership[owner][i] == nftTokenId) return true;
        }
        return false;
    }

    // get stake info by nft token id
    function getStakeInfo(uint nftTokenId) public view returns (StakeInfo memory) {
        return stakeInfos[nftTokenId];
    }

}
