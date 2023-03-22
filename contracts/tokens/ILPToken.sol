// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../lib/AddressUtils.sol";

string constant ILP_TOKEN_FULL_NAME = "Invi Liquidity Provider Token";
string constant ILP_TOKEN_NAME = "ILP";


contract ILPToken is Initializable, ERC20Upgradeable, OwnableUpgradeable {
    //------Contracts and Addresses------//
    // track ILP Holder list
    address[] public ILPHolders;

    //====== initializer ======//
    function initialize() initializer public {
        __ERC20_init(ILP_TOKEN_FULL_NAME, ILP_TOKEN_NAME);
        __Ownable_init();
    }

    //====== getter functions ======//
    function getILPHolders() external view returns (address[] memory){
        return ILPHolders;
    }

    //======setter functions ======//

    //====== service functions ======//
    function mintToken(address _account, uint _amount) onlyOwner external {
        _mint(_account, _amount);
        
         // update ILPHolderList
        addAddress(ILPHolders, _account);
    }

    function burnToken(address _account, uint _amount) onlyOwner external  {
        _burn(_account, _amount);
    }

     function transfer(address to, uint256 amount) public override returns (bool) {
        address owner = _msgSender();
        _transfer(owner, to, amount);

        // update ILPHolderList 
        addAddress(ILPHolders, to);

        return true;
    }

    function transferFrom(address from,address to,uint256 amount) public override returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);

        // update ILPHolderList
        addAddress(ILPHolders, to);
        return true;
    }
}
