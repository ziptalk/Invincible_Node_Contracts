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
    bool setLpPool;

    //====== modifiers ======//
    /**
     * @dev Throws if called by any account other than the lpPool contract.
     */
    modifier onlyLPPool {
        require(msg.sender == address(lpPoolContract), "ILP: not lpPool contract");
        _;
    }

    //====== initializer ======//
    /**
     * @dev Initializes the contract.
     */
    function initialize() initializer public {
        __ERC20_init(ILP_TOKEN_FULL_NAME, ILP_TOKEN_NAME);
        __Ownable_init();

        totalILPHoldersCount = 0;
        setLpPool = false;
    }

    //====== getter functions ======//

    //======setter functions ======//
    /**
     * @notice Sets the lpPool contract address.
     * @dev can be set only once
     * @param _lpPoolAddress lpPoolAddress
     */
    function setLpPoolAddress(address _lpPoolAddress) onlyOwner external {
        require(setLpPool == false, "ILP: lpPool contract already set");
        lpPoolContract = LiquidityProviderPool(_lpPoolAddress);
        setLpPool = true;
    }

    //====== service functions ======//
    /**
     * @notice Mints Token to target account.
     * @param _account target account to mint Token
     * @param _amount amount to mint
     */
    function mintToken(address _account, uint128 _amount) onlyLPPool external {
        _mint(_account, _amount);
        
        ILPHolders[totalILPHoldersCount++] = _account;
    }

    /**
     * @notice Burns Token from target account.
     * @param _account account to burn token from
     * @param _amount amount to burn token from
     */
    function burnToken(address _account, uint128 _amount) onlyLPPool external  {
        _burn(_account, _amount);
    }

    /**
     * @notice transfer Token to target account
     * @dev overrides previous function
     * @param to receiving address
     * @param amount sending amount
     */
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
    
    /**
     * @notice transfer Token from sender to receiver
     * @dev overrides previous function
     * @param from sender
     * @param to receiver
     * @param amount sending amount
     */
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
