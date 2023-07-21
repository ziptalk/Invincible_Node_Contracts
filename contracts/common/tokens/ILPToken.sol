// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../lib/AddressUtils.sol";
import "../LiquidityProviderPool.sol";

string constant ILP_TOKEN_FULL_NAME = "Invi Liquidity Provider Token";
string constant ILP_TOKEN_NAME = "ILP";


contract ILPToken is Initializable, ERC20Upgradeable, OwnableUpgradeable {
    //------Contracts and Addresses------//
    LiquidityProviderPool public lpPoolContract;
    uint128 public totalILPHoldersCount;
    mapping(uint128 => address) public ILPHolders;

    //====== initializer ======//
    function initialize() initializer public {
        __ERC20_init(ILP_TOKEN_FULL_NAME, ILP_TOKEN_NAME);
        __Ownable_init();

        totalILPHoldersCount = 0;
    }

    modifier onlyLPPool {
        require(msg.sender == address(lpPoolContract), "ILP: not lpPool contract");
        _;
    }

    //====== getter functions ======//

    //======setter functions ======//
    function setLpPoolAddress(address _lpPoolAddress) onlyOwner external {
        lpPoolContract = LiquidityProviderPool(_lpPoolAddress);
    }

    //====== service functions ======//
    function mintToken(address _account, uint128 _amount) onlyLPPool external {
        _mint(_account, _amount);
        
        ILPHolders[totalILPHoldersCount++] = _account;
    }

    function burnToken(address _account, uint128 _amount) onlyLPPool external  {
        _burn(_account, _amount);
    }

     function transfer(address to, uint256 amount) public override returns (bool) {
        address _owner = _msgSender();
        _transfer(_owner, to, amount);
        
        bool exist = false;
        // if duplicated ILP holder
        for (uint128 i = 0; i < totalILPHoldersCount; i++) {
            if (ILPHolders[i] == to) {
                exist = true;
            }
        }
        // else update ILPHolderList 
        if (!exist) {
            ILPHolders[totalILPHoldersCount++] = to;
        }
        require(lpPoolContract.getStakedAmount(_owner) >= amount, "ILP: insufficient staked amount");
        lpPoolContract.setStakedAmount(msg.sender, lpPoolContract.getStakedAmount(msg.sender) - uint128(amount));
        lpPoolContract.setStakedAmount(to, lpPoolContract.getStakedAmount(to) + uint128(amount));
        return true;
    }

    function transferFrom(address from,address to,uint256 amount) public override returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        
        bool exist = false;
        // if duplicated ILP holder
        for (uint128 i = 0; i < totalILPHoldersCount; i++) {
            if (ILPHolders[i] == to) {
                exist = true;
            }
        }
        // else update ILPHolderList 
        if (!exist) {
            ILPHolders[totalILPHoldersCount++] = to;
        }
        require(lpPoolContract.getStakedAmount(from) >= amount, "ILP: insufficient staked amount");
        lpPoolContract.setStakedAmount(from, lpPoolContract.getStakedAmount(from) - uint128(amount));
        lpPoolContract.setStakedAmount(to, lpPoolContract.getStakedAmount(to) + uint128(amount));
        return true;
    }
}
