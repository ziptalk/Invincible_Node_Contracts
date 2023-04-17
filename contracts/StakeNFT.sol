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

    //------Contracts and Addresses------//
    address public nftFactoryAddress;

    //------mappings------//
   
    //------public Variables------//
    StakeInfo public stakeInfo;
    uint tokenId;
    uint public rewardAmount;

    //------private Variables------//
    string private _name;
    string private _symbol;
    
    //====== initializer ======//
    function initialize(StakeInfo memory _stakeInfo, uint _tokenId) initializer public {
        __ERC721_init("Stake NFT", "SNFT");
        __Ownable_init();
        _stakeInfo.lockStart = block.timestamp;
        _stakeInfo.lockEnd =  _stakeInfo.lockStart + _stakeInfo.lockPeriod;
        stakeInfo = _stakeInfo;
        nftFactoryAddress = msg.sender;
        tokenId = _tokenId;
    }

    //====== modifiers ======//

    // set up on initialize
    modifier onlyNftFactory {
        require(msg.sender == address(nftFactoryAddress), "msg sender should be nft factory");
        _;
    }
    
    //====== getter functions ======//


    //====== setter functions ======//

    //====== service functions ======//

    function addReward(uint _reward) external onlyNftFactory{
        rewardAmount += _reward;
    }

    function burn (uint _tokenId) public onlyNftFactory {
        require(_exists(_tokenId), "ERC721: token does not exist");
        require(_isApprovedOrOwner(_msgSender(), _tokenId), "ERC721: caller is not owner nor approved");
        _burn(_tokenId);
    }

    //====== utils functions ======//
    // return the address is nft owner
    function isOwner(address _owner) public view returns (bool) {
        return _owner == ownerOf(0);
    }

    // check if the nft is unlocked
    function isUnlocked(uint nftTokenId) public view returns (bool) {
        return stakeInfo.lockEnd < block.timestamp;
    }

    // return the stakeInfo
    function getStakeInfo() public view returns (StakeInfo memory){
        return stakeInfo;
    }
}
