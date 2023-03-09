// SPDX-License-Identifier: MIT
pragma solidity ^0.8;


import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./lib/Structs.sol";
import "./lib/ArrayUtils.sol";

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

    // override transferFrom function
    function transferFrom(address from, address to, uint256 tokenId) public override {
        //solhint-disable-next-line max-line-length
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: caller is not token owner or approved");

        // switch token ownership
        popValueFromUintArray(NFTOwnership[from], tokenId);
        NFTOwnership[to].push(tokenId);

        _transfer(from, to, tokenId);
    }

}
