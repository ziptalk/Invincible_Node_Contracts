// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../lib/Unit.sol";
import "../lib/ErrorMessages.sol";
import "hardhat/console.sol";

string constant INVI_TOKEN_FULL_NAME = "Invi Token";
string constant INVI_TOKEN_NAME = "INVI";

contract InviToken is Initializable, ERC20Upgradeable, OwnableUpgradeable {

    //------ contracts ------//
    address public lendingPoolAddress;
    address public inviTokenStakeAddress;
    address public lpPoolAddress;

    //------ Variables ------//
    uint public regularMintAmount;
    uint public mintInterval; 
    uint public lastMinted;

    //====== initializer ======//
    function initialize() initializer public {
        __ERC20_init(INVI_TOKEN_FULL_NAME, INVI_TOKEN_NAME);
        __Ownable_init();

        regularMintAmount = 100000000; // 100 million
        mintInterval = 30 hours; // testnet: 30 hours
        lastMinted = block.timestamp - mintInterval;

    }

    //====== modifier ======//

    modifier onlyLendingPool {
        require(msg.sender == lendingPoolAddress, "Ownable: caller is not the owner");
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

    //====== service functions ======//

    function regularMinting() external onlyOwner {
        require(block.timestamp > lastMinted + mintInterval, ERROR_MINTING_INTERVAL_NOT_REACHED);
      
        uint mintAmount = regularMintAmount * INVI_UNIT;
        
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

    function sendInvi(address _receiver, uint _amount) external onlyOwner {
        transfer(_receiver, _amount);
    }

    // only lendingPool can burn token as needed
    // function mintLentToken(address _account, uint _amount) onlyLendingPool external {_mint(_account, _amount);}
    function burnLentToken(address _account, uint _amount) onlyLendingPool external  {
        _burn(_account, _amount);
    } 

    // for test purposes
    function mintToken(address _account, uint _amount) onlyOwner external {_mint(_account, _amount);}
    function burnToken(address _account, uint _amount) onlyOwner external  {_burn(_account, _amount);}
}
