// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./lib/Unit.sol";
import "./lib/ErrorMessages.sol";

string constant INVI_TOKEN_FULL_NAME = "Invi Token";
string constant INVI_TOKEN_NAME = "INVI";

contract InviToken is Initializable, ERC20Upgradeable, OwnableUpgradeable {

    //------ contracts ------//
    address public lendingPool;

    //------ Variables ------//
    // 0.1B
    uint public regularMintAmount = 100000000;
    uint public lastMinted;
    // testnet: 30 hours
    uint public mintInterval = 30 hours;
    // mainnet
    // uint public mintInterval = 30 days;
    bool public firstMint = false;

    address public LEND_INVI_TOKEN;


    //====== initializer ======//
    function initialize() initializer public {
        __ERC20_init(INVI_TOKEN_FULL_NAME, INVI_TOKEN_NAME);
        __Ownable_init();

        // mint for the first time
        _mint(address(this), regularMintAmount * INVI_UNIT);
        lastMinted = block.timestamp;
    }

    //====== modifier ======//

    modifier onlyLendingPool {
        require(msg.sender == lendingPool, "Ownable: caller is not the owner");
        _;
    }

    //====== getter functions =======//

    //====== setter functions ======//
    function setLendingPool(address _lendingPool) external onlyOwner {
        lendingPool = _lendingPool;
    }

    //====== modifiers ======//
    modifier onlyLendingPool {
        require(msg.sender == address(LEND_INVI_TOKEN), "msg sender should be lend invi token");
        _;
    }

    //====== setter functions ======//
    function setLendingPoolAddress(address _LendingPool) onlyOwner external {
        LEND_INVI_TOKEN = _LendingPool;
    }

    //====== service functions ======//

    function regularMinting() external onlyOwner {
        require(block.timestamp > lastMinted + mintInterval, ERROR_MINTING_INTERVAL_NOT_REACHED);
      
        // get the amout of minted token from lendingPool (can be + or -)
        bool isPositive = true;
        uint lendingPoolMintedBurnedAmount = 0;

        uint mintAmount;
        if (isPositive) {
            mintAmount = regularMintAmount * INVI_UNIT + lendingPoolMintedBurnedAmount;
        } else {
            mintAmount = regularMintAmount * INVI_UNIT - lendingPoolMintedBurnedAmount;
        }
        // mint token
        _mint(address(this), mintAmount);
        // set last Minted
        lastMinted = block.timestamp;
    
    }

----
    // only lendingPool can mint and burn token as needed
    function mintToken(address _account, uint _amount) onlyLendingPool external {
        _mint(_account, _amount);
    }
    function burnToken(address _account, uint _amount) onlyLendingPool external  {
----
    function mintLentToken(address _account, uint _amount) onlyLendingPool external {
        _mint(_account, _amount);
    }

    function burnToken(address _account, uint _amount) onlyOwner external  {

        _burn(_account, _amount);
    }

    function burnLentToken(address _account, uint _amount) onlyLendingPool external  {
        _burn(_account, _amount);
    }
}
