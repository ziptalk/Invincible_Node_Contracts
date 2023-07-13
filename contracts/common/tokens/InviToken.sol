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
    //------ contracts ------//
    address public lendingPoolAddress;
    address public inviTokenStakeAddress;
    address public lpPoolAddress;
    address public inviSwapPoolAddress;

    //------ Variables ------//
    uint128 public regularMintAmount;
    uint256 public mintInterval; 
    uint256 public lastMinted;
    uint256 public mintAmountChangeInterval;
    uint256 public lastMintAmountChange;

    //====== initializer ======//
    function initialize() initializer public {
        __ERC20_init(INVI_TOKEN_FULL_NAME, INVI_TOKEN_NAME);
        __Ownable_init();

        /////////////////////////////////////////////////////////////
        ///// Set this part /////////////////////////////////////////
        /////////////////////////////////////////////////////////////
        lastMinted = block.timestamp - mintInterval;      ///////////
        regularMintAmount = 100000000; // 100 million     ///////////
        mintInterval = 1 hours; // testnet: 1 hour,  mainnet: 10 days       
        /////////////////////////////////////////////////////////////

        mintAmountChangeInterval = 10 days; // 10 days
        lastMintAmountChange = block.timestamp - mintAmountChangeInterval;
    }

    //====== modifier ======//
    modifier onlyLendingPool {
        require(msg.sender == lendingPoolAddress, "Error: not lendingPool contract");
        _;
    }

    modifier onlyAllowedContractsToTransfer {
        require(msg.sender == inviTokenStakeAddress || msg.sender == lendingPoolAddress || msg.sender == inviSwapPoolAddress, "InviToken: Not allowed address");
        _;
    }

    //====== setter functions ======//
    /**
     * @dev set lendingPoolAddress
     * @param _lendingPoolAddr lendingPoolAddress
     */
    function setLendingPoolAddress(address _lendingPoolAddr) onlyOwner external {
        lendingPoolAddress = _lendingPoolAddr;
    }

    /**
     * @dev set lpPoolAddress
     * @param _lpPoolAddr lpPoolAddress
     */
    function setLpPoolAddress(address _lpPoolAddr) onlyOwner external {
        lpPoolAddress = _lpPoolAddr;
    }

    /**
     * @dev set inviTokenStakeAddress
     * @param _inviTokenStakeAddr inviTokenStakeAddress
     */
    function setInviTokenStakeAddress(address _inviTokenStakeAddr) onlyOwner external {
        inviTokenStakeAddress = _inviTokenStakeAddr;
    }

    /**
     * @dev set inviSwapPoolAddress
     * @param _inviSwapPoolAddr inviSwapPoolAddress
     */
    function setInviSwapPoolAddress(address _inviSwapPoolAddr) onlyOwner external {
        inviSwapPoolAddress = _inviSwapPoolAddr;
    }

    /**
     * @dev set mint amount
     * @param _amount mint amount
     */
    function setMintAmount(uint128 _amount) onlyOwner external {
        require(block.timestamp > lastMintAmountChange + mintAmountChangeInterval, "InviToken: mint amount cannot be changed now");
        regularMintAmount = _amount;
    }

    //====== service functions ======//
    /**
     * @dev mint token regularly to this and other contracts
     * @notice 20% to lendingPool, 15% to inviTokenStake, 15% to lpPool
     */
    function regularMinting() external onlyOwner {
        require(block.timestamp > lastMinted + mintInterval, "InviToken: mint interval is not passed");
      
        uint128 mintAmount = regularMintAmount * INVI_UNIT;
        
        // mint token
        _mint(address(this), mintAmount);
        // set last Minted
        lastMinted = block.timestamp;

        // send minted token to lendingPool (20%)
        _transfer(address(this), lendingPoolAddress, mintAmount * 20 / 100);

        // send minted token to inviTokenStake (15%)
        _transfer(address(this),inviTokenStakeAddress, mintAmount * 15 / 100);

        // send minted token to lpPool (15%)
        _transfer(address(this), lpPoolAddress, mintAmount * 15 / 100);
    }

    /**
     * @dev send invi token to receiver (only owner can call)
     * @param _receiver receiver address
     * @param _amount transfer amount
     */
    function sendInvi(address _receiver, uint128 _amount) external onlyOwner {
        _transfer(address(this), _receiver, _amount);
    }

    /**
     * @dev transfer token used only by allowed contracts
     * @param _sender sender address
     * @param _receiver receiver address
     * @param _amount transfer amount
     */
    function transferToken(address _sender, address _receiver, uint128 _amount) external onlyAllowedContractsToTransfer returns (bool) {
        _transfer(_sender, _receiver, _amount);
        return true;
    }

    /**
     * @dev burn lent token from lendingPool
     * @param _account target address
     * @param _amount burn amount
     */
    function burnLentToken(address _account, uint128 _amount) onlyLendingPool external  {
        _burn(_account, _amount);
    } 
}
