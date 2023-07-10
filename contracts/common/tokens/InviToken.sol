// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../lib/Unit.sol";
import "../lib/ErrorMessages.sol";
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

        regularMintAmount = 10000; // 100 million
        //mintInterval = 30 hours; // testnet: 30 hours
        mintInterval = 10 days; // mainnet: 10 days
        lastMinted = block.timestamp - mintInterval;
        mintAmountChangeInterval = 10 days; // 10 days
        lastMintAmountChange = block.timestamp - mintAmountChangeInterval;
    }

    //====== modifier ======//

    modifier onlyLendingPool {
        require(msg.sender == lendingPoolAddress, "Ownable: caller is not the owner");
        _;
    }

    modifier onlyAllowedContractsToTransfer {
        require(msg.sender == inviTokenStakeAddress || msg.sender == lendingPoolAddress || msg.sender == inviSwapPoolAddress, "Ownable: caller is not the owner");
        _;
    }


    //====== getter functions =======//

    //====== setter functions ======//

    //====== setter functions ======//
    function setLendingPoolAddress(address _lendingPoolAddr) onlyOwner external {
        lendingPoolAddress = _lendingPoolAddr;
    }
    function setLpPoolAddress(address _lpPoolAddr) onlyOwner external {
        lpPoolAddress = _lpPoolAddr;
    }
    function setInviTokenStakeAddress(address _inviTokenStakeAddr) onlyOwner external {
        inviTokenStakeAddress = _inviTokenStakeAddr;
    }
    function setInviSwapPoolAddress(address _inviSwapPoolAddr) onlyOwner external {
        inviSwapPoolAddress = _inviSwapPoolAddr;
    }
    function setMintAmount(uint128 _amount) onlyOwner external {
        require(block.timestamp > lastMintAmountChange + mintAmountChangeInterval, "minting amount can be changed once in 10 days");
        regularMintAmount = _amount;
    }

    //====== service functions ======//

    function regularMinting() external onlyOwner {
        require(block.timestamp > lastMinted + mintInterval, ERROR_MINTING_INTERVAL_NOT_REACHED);
      
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

    function sendInvi(address _receiver, uint128 _amount) external onlyOwner {
        _transfer(address(this), _receiver, _amount);
    }

    function transferToken(address _sender, address _receiver, uint128 _amount) external onlyAllowedContractsToTransfer returns (bool) {
        _transfer(_sender, _receiver, _amount);
        return true;
    }

    // only lendingPool can burn token as needed
    // function mintLentToken(address _account, uint _amount) onlyLendingPool external {_mint(_account, _amount);}
    function burnLentToken(address _account, uint128 _amount) onlyLendingPool external  {
        _burn(_account, _amount);
    } 

    // for test purposes
    function mintToken(address _account, uint128 _amount) onlyOwner external {_mint(_account, _amount);}
    function burnToken(address _account, uint128 _amount) onlyOwner external  {_burn(_account, _amount);}
    // for test purposes

    
}
