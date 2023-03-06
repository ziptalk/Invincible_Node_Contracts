// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

string constant ILP_TOKEN_FULL_NAME = "Invi Liquidity Provider Token";
string constant ILP_TOKEN_NAME = "ILP";

contract ILPToken is ERC20 {

    address public owner;

    constructor() ERC20(ILP_TOKEN_FULL_NAME, ILP_TOKEN_NAME) {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not authorized");
        _;
    }

    function setOwner(address _account) onlyOwner external {
        owner = _account;
    }
    
    function mintToken(address _account, uint _amount) onlyOwner external {
        _mint(_account, _amount);
    }

    function burnToken(address _account, uint _amount) onlyOwner external  {
        _burn(_account, _amount);
    }
}
