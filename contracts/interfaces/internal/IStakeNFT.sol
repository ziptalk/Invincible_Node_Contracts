// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "../../common/lib/Structs.sol";

interface IStakeNFT {
    function getRewardAmount(uint _tokenId) external view returns (uint);
    function getNFTOwnership(address _user) external view returns (uint[] memory);
    function getStakeInfo(uint _nftTokenId) external view returns (StakeInfo memory);
    function getAllStakeInfoOfUser(address _user) external view returns (StakeInfo[] memory);
    function setInviCoreAddress(address _inviCore) external;
    function setLendingPoolAddress(address _LendingPool) external;
    function setTotalStakedAmount(uint _totalStakedAmount) external;
    function setNFTIsLent(uint _tokenId, bool _isLent) external;
    function mintNFT(StakeInfo memory _stakeInfo) external returns (uint);
    function burnNFT(uint nftTokenId) external;
    function updateReward(uint _totalReward) external;
    function isExisted(uint _nftTokenId) external view returns (bool);
    function isOwner(uint _nftTokenId, address _owner) external view returns (bool);
    function isUnlock(uint _nftTokenId) external view returns (bool);
    function deleteStakeInfo(uint _nftTokenId) external;
    function deleteNFTOwnership(address _nftOwner, uint _nftTokenId) external;
}
