// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../lib/Unit.sol";
import "../lib/ErrorMessages.sol";

string constant INKLP_TOKEN_FULL_NAME = "Invi Klay Swap LP Token";
string constant INKLP_TOKEN_NAME = "INKLP";

contract INKLPToken is Initializable, ERC20Upgradeable, OwnableUpgradeable {

    //------ contracts ------//
    address public INVI_KLAY_SWAP_POOL;

    //------ Variables ------//
  


    //====== initializer ======//
    function initialize() initializer public {
        __ERC20_init(INKLP_TOKEN_FULL_NAME, INKLP_TOKEN_NAME);
        __Ownable_init();
    }


    //====== modifiers ======//
    modifier onlyInviKlaySwapPool {
        require(msg.sender == address(INVI_KLAY_SWAP_POOL), "msg sender should be invi klay swap pool");
        _;
    }
    //====== setter functions ======//
    function setInviKlaySwapPool(address _inviKlaySwapPool) external onlyOwner {
        INVI_KLAY_SWAP_POOL = _inviKlaySwapPool;
    }

    //====== service functions ======//


    function mintToken(address _account, uint _amount) onlyInviKlaySwapPool external {
        _mint(_account, _amount);
    }
    function burnToken(address _account, uint _amount) onlyInviKlaySwapPool external  {
        _burn(_account, _amount);
    }

}
