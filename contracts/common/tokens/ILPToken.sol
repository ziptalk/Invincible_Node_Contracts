// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../lib/AddressUtils.sol";
import "../LiquidityProviderPool.sol";

string constant ILP_TOKEN_FULL_NAME = "Invi Liquidity Provider Token";
string constant ILP_TOKEN_NAME = "ILPTest";

contract ILPToken is Initializable, ERC20Upgradeable, OwnableUpgradeable {
    //------Contracts and Addresses------//
    LiquidityProviderPool public lpPoolContract;
    mapping(uint256 => address) public ILPHolders;
    uint256 public totalILPHoldersCount;
    bool _setLpPoolContract;

    //====== modifiers ======//
    /**
     * @notice Throws if called by any account other than the lpPool contract.
     */
    modifier onlyLPPool {
        require(msg.sender == address(lpPoolContract), "ILP: not lpPool contract");
        _;
    }

    //====== initializer ======//
    /**
     * @notice Initializes the contract.
     */
    function initialize() initializer public {
        __ERC20_init(ILP_TOKEN_FULL_NAME, ILP_TOKEN_NAME);
        __Ownable_init();

        totalILPHoldersCount = 0;
        _setLpPoolContract = false;
    }

    //====== getter functions ======//

    //======setter functions ======//
    /**
     * @notice Sets the lpPool contract address.
     * @dev can be set only once by owner
     * @param _lpPoolAddress lpPoolAddress
     */
    function setLpPoolAddress(address _lpPoolAddress) onlyOwner external {
        require(_setLpPoolContract == false, "ILP: lpPool contract already set");
        lpPoolContract = LiquidityProviderPool(_lpPoolAddress);
        _setLpPoolContract = true;
    }

    //====== service functions ======//
    /**
     * @notice Mints Token to target account.
     * @dev can be called only by lpPool contract
     * @param _account target account to mint Token
     * @param _amount amount to mint
     */
    function mintToken(address _account, uint256 _amount) onlyLPPool external {
        _mint(_account, _amount);
        
        bool exist = false;
        // if duplicated ILP holder
        for (uint256 i = 0; i < totalILPHoldersCount; i++) {
            if (ILPHolders[i] == _account) {
                exist = true;
            }
        }
        // else update ILPHolderList 
        if (!exist) {
            ILPHolders[totalILPHoldersCount++] = _account;
        }
    }

    /**
     * @notice Burns Token from target account.
     * @param _account account to burn token from
     * @param _amount amount to burn token from
     */
    function burnToken(address _account, uint256 _amount) onlyLPPool external  {
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
        for (uint256 i = 0; i < totalILPHoldersCount; i++) {
            if (ILPHolders[i] == to) {
                exist = true;
            }
        }
        // else update ILPHolderList 
        if (!exist) {
            ILPHolders[totalILPHoldersCount++] = to;
        }
        require(lpPoolContract.getStakedAmount(_owner) >= amount, "ILP: insufficient staked amount");
        lpPoolContract.setStakedAmount(msg.sender, lpPoolContract.getStakedAmount(msg.sender) - uint256(amount));
        lpPoolContract.setStakedAmount(to, lpPoolContract.getStakedAmount(to) + uint256(amount));
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
        for (uint256 i = 0; i < totalILPHoldersCount; i++) {
            if (ILPHolders[i] == to) {
                exist = true;
            }
        }
        // else update ILPHolderList 
        if (!exist) {
            ILPHolders[totalILPHoldersCount++] = to;
        }
        require(lpPoolContract.getStakedAmount(from) >= amount, "ILP: insufficient staked amount");
        lpPoolContract.setStakedAmount(from, lpPoolContract.getStakedAmount(from) - uint256(amount));
        lpPoolContract.setStakedAmount(to, lpPoolContract.getStakedAmount(to) + uint256(amount));
        return true;
    }
}
