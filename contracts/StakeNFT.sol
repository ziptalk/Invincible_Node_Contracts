// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./lib/Structs.sol";

contract StakeNFT is ERC721 {
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
    function mintNFT(StakeInfo memory _stakeInfo) public onlyOwner returns (uint) {
        
        uint newItemId = _tokenIds.current();
        _mint(_stakeInfo.user, newItemId);

        // 임시로 설정
        principal[newItemId] = _stakeInfo.principal;
        lockPeriod[newItemId] = _stakeInfo.lockPeriod;
        lockStart[newItemId] = block.timestamp;
        lockUntil[newItemId] = block.timestamp + _stakeInfo.lockPeriod;
        expectedReward[newItemId] = _stakeInfo.expectedReward;

         _tokenIds.increment();
        return newItemId;
    }
}
