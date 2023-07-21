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
import "./lib/Unit.sol";

/**
 * @title StakeNFT
 * @dev The StakeNFT contract enables users to stake and manage Non-Fungible Tokens (NFTs).
 */
contract StakeNFT is Initializable, ERC721Upgradeable, OwnableUpgradeable {
    // using Counters for Counters.Counter;
    // Counters.Counter private _tokenIds;

    //------Contracts and Addresses------//
    address public inviCoreAddress;
    address public lendingPoolAddress;
    address public lpPoolAddress;

    //------Variables------//
    uint128 public totalStakedAmount;
    //------mappings------//
    mapping (uint32 => uint32) public nftTokenIds;
    mapping (address => uint32[]) public NFTOwnership; // show which address have which NFT
    mapping (uint32 => uint128) public rewardAmount;
    mapping (uint32 => StakeInfo) public stakeInfos; // store all stakeInfos

    //------private Variables------//
    string private _name;
    string private _symbol;
    uint32 public _tokenIds;
    
    //====== initializer ======//
    /**
     * @dev Initializes the StakeNFT contract.
     */
    function initialize() initializer public {
        __ERC721_init("Stake NFT", "SNFT");
        __Ownable_init();

        _tokenIds = 1;
    }

    //====== modifiers ======//

    modifier onlyInviCore {
        require(msg.sender == inviCoreAddress, "StakeNFT: msg sender should be invi core");
        _;
    }

    modifier onlyLendingPool {
        require(msg.sender == address(lendingPoolAddress), "StakeNFT: msg sender should be lending pool");
        _;
    }

    modifier onlyLpPool {
        require(msg.sender == address(lpPoolAddress), "StakeNFT: msg sender should be lp pool");
        _;
    }
    
    //====== getter functions ======//

    /**
     * @dev Retrieves the reward amount associated with a given NFT token ID.
     * @param _tokenId The ID of the NFT token.
     * @return The reward amount.
     */
    function getRewardAmount(uint32 _tokenId) public view returns (uint) {
        return rewardAmount[_tokenId];
    }

    /**
     * @dev Retrieves an array of NFT token IDs owned by a specific address.
     * @param _user The address of the user.
     * @return An array of NFT token IDs.
     */
    function getNFTOwnership(address _user) public view returns (uint32[] memory) {
        return NFTOwnership[_user];
    }

    /**
     * @dev Retrieves the stake information associated with a given NFT token ID.
     * @param _nftTokenId The ID of the NFT token.
     * @return The stake information.
     */
    function getStakeInfo(uint32 _nftTokenId) public view returns (StakeInfo memory){
        StakeInfo memory stakeInfo = stakeInfos[_nftTokenId];
        require(stakeInfo.user != address(0), "StakeNFT: stakeInfo does not exist");
        return stakeInfos[_nftTokenId];
    }

    /**
     * @dev Retrieves an array of stake information for all NFTs owned by a specific address.
     * @param _user The address of the user.
     * @return An array of stake information.
     */
    function getAllStakeInfoOfUser(address _user) public view returns (StakeInfo[] memory) {
        uint32[] memory _nftTokenIds = NFTOwnership[_user];
        StakeInfo[] memory stakeInfosOfUser = new StakeInfo[](_nftTokenIds.length);
        for (uint32 i = 0; i < _nftTokenIds.length; i++) {
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
     * @dev Sets the address of the LpPool contract.
     * @param _LpPool The address of the LpPool contract.
     */
    function setLpPoolAddress(address _LpPool) public onlyOwner {
        lpPoolAddress = _LpPool;
    }

    /**
     * @dev Sets the lending status of an NFT.
     * @param _tokenId The ID of the NFT token.
     * @param _isLent The lending status of the NFT.
     */
    function setNFTIsLent(uint32 _tokenId, bool _isLent) public onlyLendingPool {
        stakeInfos[_tokenId].isLent = _isLent;
    }

    //====== service functions ======//
    /**
     * @dev Mints a new NFT and associates it with the provided stake information.
     * @param _stakeInfo The stake information for the NFT.
     * @return The ID of the minted NFT.
     */
    function mintNFT(StakeInfo memory _stakeInfo) public onlyInviCore returns (uint32) {
        uint32 newTokenId = _tokenIds;
        _safeMint(_stakeInfo.user, newTokenId);
        stakeInfos[newTokenId] = _stakeInfo;

        // update info
        NFTOwnership[_stakeInfo.user].push(newTokenId);
        nftTokenIds[newTokenId] = newTokenId;
        rewardAmount[newTokenId] = 0;
        totalStakedAmount += _stakeInfo.stakedAmount;
       
        _tokenIds++;
        return newTokenId;
    }

    /**
     * @dev Burns an existing NFT.
     * @param _nftTokenId The ID of the NFT token to be burned.
     */
    function burnNFT(uint32 _nftTokenId) public onlyInviCore  {
        totalStakedAmount -= stakeInfos[_nftTokenId].stakedAmount;
        delete stakeInfos[_nftTokenId];
        delete nftTokenIds[_nftTokenId];
         _burn(_nftTokenId);
    }

    /**
     * @dev Overrides the `transferFrom` function of ERC721 to allow transferring NFT ownership.
     * @param from The current owner of the NFT.
     * @param to The new owner of the NFT.
     * @param tokenId The ID of the NFT token to be transferred.
     */
    function transferFrom(address from, address to, uint256 tokenId) public override {
        //solhint-disable-next-line max-line-length
        require(_isApprovedOrOwner(msg.sender, tokenId), "ERC721: caller is not token owner or approved");

        // switch token ownership
        popValueFromUintArray(NFTOwnership[from], tokenId);
        uint32 _tokenId = uint32(tokenId);
        NFTOwnership[to].push(_tokenId);
        stakeInfos[_tokenId].user = to;

        _transfer(from, to, tokenId);
    }

    /**
     * @dev Updates the reward amount for all NFTs based on the total reward.
     * @param _totalReward The total reward amount.
     */
    function updateReward(uint128 _totalReward) external onlyInviCore returns(uint128){
        // rewards that belongs to LP
        uint128 lpReward = 0;
        for (uint32 i = 0; i < _tokenIds; i++) {
            uint32 nftId = nftTokenIds[i];
            // if tokenIds not available, skip
            if (nftId == 0) {
                continue;
            }
            // if NFT pass the lock period, the reward will be added to LP
            if (stakeInfos[nftId].lockEnd < block.timestamp) {
                lpReward += _totalReward * stakeInfos[nftId].stakedAmount / totalStakedAmount;
            } else { // otherwise, the reward will be added to the NFT
                rewardAmount[nftId] += _totalReward * stakeInfos[nftId].stakedAmount / totalStakedAmount;
            }
        }
        return lpReward;
    }

    //====== utils functions ======//

    /**
     * @dev Checks if an NFT with a given token ID exists.
     * @param _nftTokenId The ID of the NFT token.
     * @return A boolean indicating whether the NFT exists or not.
     */
    function exists(uint _nftTokenId) public view returns (bool) {
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
    function isUnlock(uint32 _nftTokenId) public view returns (bool) {
        StakeInfo memory stakeInfo = stakeInfos[_nftTokenId];
        return stakeInfo.lockEnd < block.timestamp;
    }

    /**
     * @dev Deletes the stake information associated with a given NFT token ID.
     * @param _nftTokenId The ID of the NFT token.
     */
    function deleteStakeInfo(uint32 _nftTokenId) public onlyInviCore {
        delete stakeInfos[_nftTokenId];
    }

    /**
     * @dev Deletes the ownership of an NFT from a specific address.
     * @param _nftOwner The address of the NFT owner.
     * @param _nftTokenId The ID of the NFT token.
     */
    function deleteNFTOwnership(address _nftOwner, uint32 _nftTokenId) public onlyInviCore {
        // get the index of nftTokenId
        uint _nftTokenIndex = getIndex(NFTOwnership[_nftOwner], _nftTokenId);
        NFTOwnership[_nftOwner][_nftTokenIndex] = NFTOwnership[_nftOwner][NFTOwnership[_nftOwner].length - 1];
        NFTOwnership[_nftOwner].pop();    
    }

    /**
     * @dev Gets the index of a given value in an array.
     * @param _lackAmount The array to be searched.
     */
    function resolveLiquidityIssue(uint128 _lackAmount, uint128 _totalLentAmount) external onlyLpPool {
        for (uint32 i = 0 ; i < _tokenIds; i++) {
            uint32 nftId = nftTokenIds[i];
            if (nftId == 0) continue;
            
            StakeInfo storage stakeInfo = stakeInfos[nftId];

            // if still locked
            if (stakeInfos[nftId].lockEnd > block.timestamp) {
                uint128 _lentAmount = stakeInfo.stakedAmount - stakeInfo.principal;
                uint128 _decreaseAmount = _lackAmount * _lentAmount / _totalLentAmount;
                // update stakedAmount
                stakeInfo.stakedAmount -= _decreaseAmount;

                // update lockTime
                uint256 leftLockPeriod = stakeInfo.lockEnd - block.timestamp;
                require(stakeInfo.stakedAmount >= stakeInfo.principal, "StakeNFT: invalid values");

                // if lent some amount
                if (_lentAmount > 0) {
                    // lock end decrease (updated lentAmount / previous lentAmount)
                    stakeInfo.lockEnd = block.timestamp + leftLockPeriod * (stakeInfo.stakedAmount - stakeInfo.principal) / _lentAmount ;
                    // set minimum lock period 
                    if (stakeInfo.lockEnd - stakeInfo.lockStart < 50 days ) {
                        stakeInfo.lockEnd = stakeInfo.lockStart + 50 days;
                    }
                    // lock Period decrease 
                    stakeInfo.lockPeriod = stakeInfo.lockEnd - stakeInfo.lockStart;
                }
                // update leverageRatio
                uint128 leverageRatio = stakeInfo.stakedAmount * uint128(LEVERAGE_UNIT) / uint128(stakeInfo.principal);
                stakeInfo.leverageRatio = uint32(leverageRatio);
            }
        }
        totalStakedAmount -= _lackAmount;
    }
}
