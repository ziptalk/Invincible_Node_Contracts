// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

string constant TOKEN_FULL_NAME = "St Token Test";
string constant TOKEN_NAME = "STToken";

// ==================================================== //
//==================for test purpose ================== //
// ==================================================== //
contract StToken is Initializable, ERC20Upgradeable, OwnableUpgradeable {
    uint256 public claimableAmount;
    //====== initializer ======//
    function initialize() initializer public {
        __ERC20_init(TOKEN_FULL_NAME, TOKEN_NAME);
        __Ownable_init();
    }

    //====== service functions ======//
    function mintToken(address _account, uint _amount) public {
        _mint(_account, _amount);
    }

    function burnToken(address _account, uint _amount) public {
        _burn(_account, _amount);
    }

    function stake() external payable  {
        uint _amount = msg.value;
        _mint(msg.sender, _amount); 
    }

    function unstake(uint _amount) external {
        _burn(msg.sender, _amount);
        claimableAmount += _amount;
    }

    function claim(address _requester) external {
        uint _amount = claimableAmount;
        claimableAmount = 0;
        (bool send, ) = _requester.call{value: _amount}("");
        require(send, "Failed to send Ether");
    }

    // test function to give rewards to inviCore
    function spreadRewards(address _inviCore) external payable {
        // 받은 coin 만큼 stToken을 inviCore에 민팅 
        _mint(_inviCore, msg.value);
    }
}
