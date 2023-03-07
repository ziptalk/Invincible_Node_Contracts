// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract StakingNFT is ERC721 {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    address public owner;

    // 임시로 설정
    mapping (uint => uint) public principal; // 원금
    mapping (uint => uint) public lockPeriod; // lock 기간
    mapping (uint => uint) public lockStart;
    mapping (uint => uint) public lockUntil;
    mapping (uint => uint) public expectedReward; // 보상
    
    constructor() ERC721("Stake NFT", "SNFT") {
        owner = msg.sender;
    }

    modifier onlyOwner {
        require(msg.sender == owner, "not authorized");
        _;
    }

    function switchOwner(address _newOwner) public onlyOwner {
        owner = _newOwner;
    }

    // only owner can mint NFT
    function mintNFT(address _recipient, uint _principal, uint _lockPeriod, uint _expectedReward) public onlyOwner returns (uint) {
        
        uint newItemId = _tokenIds.current();
        _mint(_recipient, newItemId);

        // 임시로 설정
        principal[newItemId] = _principal;
        lockPeriod[newItemId] = _lockPeriod;
        lockStart[newItemId] = block.timestamp;
        lockUntil[newItemId] = block.timestamp + _lockPeriod;
        expectedReward[newItemId] = _expectedReward;

         _tokenIds.increment();
        return newItemId;
    }
}