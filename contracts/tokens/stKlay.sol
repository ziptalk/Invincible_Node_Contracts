// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

string constant TOKEN_FULL_NAME = "Stklay Token";
string constant TOKEN_NAME = "STKLAY";

contract StKlay is Initializable, ERC20Upgradeable, OwnableUpgradeable {

    function initialize() initializer public {
        __ERC20_init(TOKEN_FULL_NAME, TOKEN_NAME);
        __Ownable_init();
    }

    function mintToken(address _account, uint _amount) onlyOwner external {
        _mint(_account, _amount);
    }

    function burnToken(address _account, uint _amount) onlyOwner external  {
        _burn(_account, _amount);
    }
}
