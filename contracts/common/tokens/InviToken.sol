// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../lib/Unit.sol";
import "hardhat/console.sol";

string constant INVI_TOKEN_FULL_NAME = "Invi Test Token";
string constant INVI_TOKEN_NAME = "INVITEST";

contract InviToken is Initializable, ERC20Upgradeable, OwnableUpgradeable {
    //------ Private Variables ------//
    bool private _setLendingPoolAddress;
    bool private _setInviTokenStakeAddress;
    bool private _setLpPoolAddress;
    bool private _setInviSwapPoolAddress;
    bool private _setInviCoreAddress;

    //------ contract addresses ------//
    address public lendingPoolAddress;
    address public inviTokenStakeAddress;
    address public lpPoolAddress;
    address public inviSwapPoolAddress;
    address public inviCoreAddress;

    //------ Variables ------//
    uint256 public regularMintAmount;
    uint256 public mintInterval; 
    uint256 public lastMinted;
    uint256 public mintAmountChangeInterval;
    uint256 public lastMintAmountChange;
    uint256 public totalBurntAmount;
    uint32 public vestingId;

    //------ Structs ------//
    struct Vesting {
        address vestingAddress;
        uint256 vestingAmount;
        uint256 releaseTime;
        bool released;
    }

    mapping (uint32 => Vesting) public vestings;

    //====== initializer ======//
    /**
     * @notice Initializes the contract.
     */
    function initialize() initializer public {
        __ERC20_init(INVI_TOKEN_FULL_NAME, INVI_TOKEN_NAME);
        __Ownable_init();

        /////////////////////////////////////////////////////////////
        ///// Set this part /////////////////////////////////////////
        /////////////////////////////////////////////////////////////
        regularMintAmount = 100000000; // Test: 10000 / Main: 100 million    
        mintInterval = 10 hours; // testnet: 10 hour,  mainnet: 10 days       
        lastMinted = block.timestamp - mintInterval;     
        mintAmountChangeInterval = 10 days; // 10 days
        lastMintAmountChange = block.timestamp - mintAmountChangeInterval;
        /////////////////////////////////////////////////////////////
        _setLendingPoolAddress = false;
        _setInviTokenStakeAddress = false;
        _setLpPoolAddress = false;
        _setInviSwapPoolAddress = false;
        _setInviCoreAddress = false;

        totalBurntAmount = 0;
    }

    //====== modifier ======//
    modifier onlyLendingPool {
        require(msg.sender == lendingPoolAddress, "Error: not lendingPool contract");
        _;
    }

    modifier onlyInviCore {
        require(msg.sender == inviCoreAddress, "Error: not inviCore contract");
        _;
    }

    modifier onlyAllowedContractsToTransfer {
        require(msg.sender == inviCoreAddress || msg.sender == inviTokenStakeAddress || msg.sender == lendingPoolAddress || msg.sender == inviSwapPoolAddress, "InviToken: Not allowed address");
        _;
    }

    //====== setter functions ======//
    /**
     * @notice set lendingPoolAddress
     * @dev can be set only once by owner
     * @param _lendingPoolAddr lendingPoolAddress
     */
    function setLendingPoolAddress(address _lendingPoolAddr) onlyOwner external {
        require(_setLendingPoolAddress == false, "InviToken: lendingPool contract already set");
        lendingPoolAddress = _lendingPoolAddr;
        _setLendingPoolAddress = true;
    }

    /**
     * @notice set lpPoolAddress
     * @dev can be set only once by owner
     * @param _lpPoolAddr lpPoolAddress
     */
    function setLpPoolAddress(address _lpPoolAddr) onlyOwner external {
        require(_setLpPoolAddress == false, "InviToken: lpPool contract already set");
        lpPoolAddress = _lpPoolAddr;
        _setLpPoolAddress = true;
    }

    /**
     * @notice set inviTokenStakeAddress
     * @dev can be set only once by owner
     * @param _inviTokenStakeAddr inviTokenStakeAddress
     */
    function setInviTokenStakeAddress(address _inviTokenStakeAddr) onlyOwner external {
        require(_setInviTokenStakeAddress == false, "InviToken: inviTokenStake contract already set");
        inviTokenStakeAddress = _inviTokenStakeAddr;
        _setInviTokenStakeAddress = true;
    }

    /**
     * @notice set inviSwapPoolAddress
     * @dev can be set only once by owner
     * @param _inviSwapPoolAddr inviSwapPoolAddress
     */
    function setInviSwapPoolAddress(address _inviSwapPoolAddr) onlyOwner external {
        require(_setInviSwapPoolAddress == false, "InviToken: inviSwapPool contract already set");
        inviSwapPoolAddress = _inviSwapPoolAddr;
        _setInviSwapPoolAddress = true;
    }

    /**
     * @notice set inviCoreAddress
     * @dev can be set only once by owner
     * @param _inviCoreAddr inviCoreAddress
     */
    function setInviCoreAddress(address _inviCoreAddr) onlyOwner external {
        require(_setInviCoreAddress == false, "InviToken: inviCore contract already set");
        inviCoreAddress = _inviCoreAddr;
        _setInviCoreAddress = true;
    }

    //====== service functions ======//
    /**
     * @notice mint token regularly to this and other contracts
     * @notice 20% to lendingPool, 15% to inviTokenStake, 15% to lpPool
     * @dev can be called only by owner
     */
    function regularMinting() external onlyOwner {
        require(block.timestamp > lastMinted + mintInterval, "InviToken: mint interval is not passed");        
      
        uint256 mintAmount = regularMintAmount * INVI_UNIT;
        
        // mint token
        _mint(address(this), mintAmount);
        // set last Minted
        lastMinted = block.timestamp;
    
        // send minted token to lendingPool (20%)
        require(transfer( lendingPoolAddress, mintAmount * 20 / 100));

        // send minted token to inviTokenStake (15%)
        require(transfer(inviTokenStakeAddress, mintAmount * 15 / 100));

        // send minted token to lpPool (15%)
        require(transfer( lpPoolAddress, mintAmount * 15 / 100));
    }

    function addVesting(address _vestingAddress, uint256 _releaseTime, uint256 _amount) external onlyOwner {
        require(_vestingAddress != address(0), "InviToken: receivingAddress is zero address");
        vestingId += 1;
        vestings[vestingId] = Vesting({
            vestingAddress: _vestingAddress,
            releaseTime: _releaseTime,
            vestingAmount: _amount,
            released: false
        });
    }

    function release(uint32 _vestingId) external {
        Vesting memory vesting = vestings[_vestingId];
        require(vesting.vestingAddress != address(0), "InviToken: vestingId is not exist");
        require(vesting.released == false, "InviToken: already released");
        require(block.timestamp >= vesting.releaseTime, "InviToken: not released time");
        require(balanceOf(address(this)) >= vesting.vestingAmount, "InviToken: insufficient balance");
        require(transfer(vesting.vestingAddress, vesting.vestingAmount), "InviToken: transfer failed");
        vestings[_vestingId].released = true;
    }

    function burnToken(address _targetAddress, uint256 _amount) external onlyInviCore {
        _burn(_targetAddress, _amount);
        totalBurntAmount += _amount;
    }

    /**
     * @notice send invi token to receiver (only owner can call)
     * @param _receiver receiver address
     * @param _amount transfer amount
     * @dev can be called only by owner
     */
    function sendInvi(address _receiver, uint256 _amount) external onlyOwner {
        _transfer(address(this), _receiver, _amount);
    }

    /**
     * @notice transfer token used only by allowed contracts
     * @dev can be called only by allowed contracts (inviTokenStake, lendingPool, inviSwapPool)
     * @param _sender sender address
     * @param _receiver receiver address
     * @param _amount transfer amount
     */
    function transferToken(address _sender, address _receiver, uint256 _amount) external onlyAllowedContractsToTransfer returns (bool) {
        _transfer(_sender, _receiver, _amount);
        return true;
    }

    /**
     * @notice burn lent token from lendingPool
     * @dev can be called only by lendingPool
     * @param _account target address
     * @param _amount burn amount
     */
    function burnLentToken(address _account, uint256 _amount) onlyLendingPool external  {
        _burn(_account, _amount);
    } 
}
