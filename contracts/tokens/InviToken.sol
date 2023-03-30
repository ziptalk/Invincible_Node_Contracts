// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

string constant INVI_TOKEN_FULL_NAME = "Invi Token";
string constant INVI_TOKEN_NAME = "INVI";

contract InviToken is Initializable, ERC20Upgradeable, OwnableUpgradeable {
    address public LEND_INVI_TOKEN;

    //====== initializer ======//
    function initialize() initializer public {
        __ERC20_init(INVI_TOKEN_FULL_NAME, INVI_TOKEN_NAME);
        __Ownable_init();
    }

    //====== modifiers ======//
    modifier onlyLendInviToken {
        require(msg.sender == address(LEND_INVI_TOKEN), "msg sender should be lend invi token");
        _;
    }

    //====== setter functions ======//
    function setLendInviToken(address _lendInviToken) onlyOwner external {
        LEND_INVI_TOKEN = _lendInviToken;
    }

    //====== service functions ======//
    function mintToken(address _account, uint _amount) onlyOwner external {
        _mint(_account, _amount);
    }

    function mintLentToken(address _account, uint _amount) onlyLendInviToken external {
        _mint(_account, _amount);
    }

    function burnToken(address _account, uint _amount) onlyOwner external  {
        _burn(_account, _amount);
    }

    function burnLentToken(address _account, uint _amount) onlyLendInviToken external  {
        _burn(_account, _amount);
    }
}
