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
    bool private _setLpPoolContract;

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
     * @notice Override the transfer function to prevent token transfers.
     * @param recipient Recipient of the tokens.
     * @param amount Amount of tokens to transfer.
     */
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        revert("ILP: Transfers are disabled");
    }

    /**
     * @notice Override the transferFrom function to prevent token transfers.
     * @param sender The address which you want to send tokens from.
     * @param recipient Recipient of the tokens.
     * @param amount Amount of tokens to transfer.
     */
    function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool) {
        revert("ILP: Transfers are disabled");
    }

}
