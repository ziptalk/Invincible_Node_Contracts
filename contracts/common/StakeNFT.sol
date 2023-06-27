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

/**
 * @title StakeNFT
 * @dev The StakeNFT contract enables users to stake and manage Non-Fungible Tokens (NFTs).
 */
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

    /**
     * @dev Initializes the StakeNFT contract.
     */
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

    /**
     * @dev Retrieves the reward amount associated with a given NFT token ID.
     * @param _tokenId The ID of the NFT token.
     * @return The reward amount.
     */
    function getRewardAmount(uint _tokenId) public view returns (uint) {
        return rewardAmount[_tokenId];
    }

    /**
     * @dev Retrieves an array of NFT token IDs owned by a specific address.
     * @param _user The address of the user.
     * @return An array of NFT token IDs.
     */
    function getNFTOwnership(address _user) public view returns (uint[] memory) {
        return NFTOwnership[_user];
    }

    /**
     * @dev Retrieves the stake information associated with a given NFT token ID.
     * @param _nftTokenId The ID of the NFT token.
     * @return The stake information.
     */
    function getStakeInfo(uint _nftTokenId) public view returns (StakeInfo memory){
        StakeInfo memory stakeInfo = stakeInfos[_nftTokenId];
        require(stakeInfo.user != address(0), "stakeInfo does not exist");
        return stakeInfos[_nftTokenId];
    }

    /**
     * @dev Retrieves an array of stake information for all NFTs owned by a specific address.
     * @param _user The address of the user.
     * @return An array of stake information.
     */
    function getAllStakeInfoOfUser(address _user) public view returns (StakeInfo[] memory) {
        uint[] memory _nftTokenIds = NFTOwnership[_user];
        StakeInfo[] memory stakeInfosOfUser = new StakeInfo[](_nftTokenIds.length);
        for (uint i = 0; i < _nftTokenIds.length; i++) {
            stakeInfosOfUser[i] = stakeInfos[_nftTokenIds[i]];
        }
        return stakeInfosOfUser;
    }

    //====== setter functions ======//

    /**
     * @dev Sets the address of the InviCore contract.
     * @param _inviCore The address of the InviCore contract.
     */
    function setInviCoreAddress(address _inviCore) public onlyOwner {
        inviCoreAddress = _inviCore;
    }

    /**
     * @dev Sets the address of the LendingPool contract.
     * @param _LendingPool The address of the LendingPool contract.
     */
    function setLendingPoolAddress(address _LendingPool) public onlyOwner {
        lendingPoolAddress = _LendingPool;
    }

    /**
     * @dev Sets the total staked amount.
     * @param _totalStakedAmount The total staked amount.
     */
    function setTotalStakedAmount(uint _totalStakedAmount) public onlyInviCore {
        totalStakedAmount = _totalStakedAmount;
    }

    /**
     * @dev Sets the lending status of an NFT.
     * @param _tokenId The ID of the NFT token.
     * @param _isLent The lending status of the NFT.
     */
    function setNFTIsLent(uint _tokenId, bool _isLent) public onlyLendingPool {
        stakeInfos[_tokenId].isLent = _isLent;
    }

    //====== service functions ======//

    /**
     * @dev Mints a new NFT and associates it with the provided stake information.
     * @param _stakeInfo The stake information for the NFT.
     * @return The ID of the minted NFT.
     */
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

    /**
     * @dev Burns an existing NFT.
     * @param nftTokenId The ID of the NFT token to be burned.
     */
    function burnNFT(uint nftTokenId) public onlyInviCore  {
        _burn(nftTokenId);
    }

    /**
     * @dev Overrides the `transferFrom` function of ERC721 to allow transferring NFT ownership.
     * @param from The current owner of the NFT.
     * @param to The new owner of the NFT.
     * @param tokenId The ID of the NFT token to be transferred.
     */
    function transferFrom(address from, address to, uint256 tokenId) public override {
        //solhint-disable-next-line max-line-length
        require(_isApprovedOrOwner(from, tokenId), "ERC721: caller is not token owner or approved");

        // switch token ownership
        popValueFromUintArray(NFTOwnership[from], tokenId);
        NFTOwnership[to].push(tokenId);

        _transfer(from, to, tokenId);
    }

    /**
     * @dev Updates the reward amount for all NFTs based on the total reward.
     * @param _totalReward The total reward amount.
     */
    function updateReward(uint _totalReward) external onlyInviCore{
        for (uint256 i = 0; i < nftTokenIds.length; i++) {
            
            uint nftId = nftTokenIds[i];
            rewardAmount[nftId] += _totalReward * stakeInfos[nftId].stakedAmount / totalStakedAmount;
        }
    }

    //====== utils functions ======//

    /**
     * @dev Checks if an NFT with a given token ID exists.
     * @param _nftTokenId The ID of the NFT token.
     * @return A boolean indicating whether the NFT exists or not.
     */
    function isExisted(uint _nftTokenId) public view returns (bool) {
        return _exists(_nftTokenId);
    }


    /**
     * @dev Checks if an address is the owner of an NFT with a given token ID.
     * @param _nftTokenId The ID of the NFT token.
     * @param _owner The address to be checked.
     * @return A boolean indicating whether the address is the owner of the NFT or not.
     */
    function isOwner(uint _nftTokenId, address _owner) public view returns (bool) {
        return _owner == ownerOf(_nftTokenId);
    }

    /**
     * @dev Checks if an NFT with a given token ID is unlocked.
     * @param _nftTokenId The ID of the NFT token.
     * @return A boolean indicating whether the NFT is unlocked or not.
     */
    function isUnlock(uint _nftTokenId) public view returns (bool) {
        StakeInfo memory stakeInfo = stakeInfos[_nftTokenId];
        return stakeInfo.lockEnd < block.timestamp;
    }

    /**
     * @dev Deletes the stake information associated with a given NFT token ID.
     * @param _nftTokenId The ID of the NFT token.
     */
    function deleteStakeInfo(uint _nftTokenId) public onlyInviCore {
        stakeInfos[_nftTokenId].user = address(0);
    }

    /**
     * @dev Deletes the ownership of an NFT from a specific address.
     * @param _nftOwner The address of the NFT owner.
     * @param _nftTokenId The ID of the NFT token.
     */
    function deleteNFTOwnership(address _nftOwner, uint _nftTokenId) public onlyInviCore {
        // get the index of nftTokenId
        uint _nftTokenIndex = getIndex(NFTOwnership[_nftOwner], _nftTokenId);
        // set the nftTokenId to dummyId
        NFTOwnership[_nftOwner][_nftTokenIndex] = NFTOwnership[_nftOwner][NFTOwnership[_nftOwner].length - 1];
        NFTOwnership[_nftOwner].pop();    
    }
}
