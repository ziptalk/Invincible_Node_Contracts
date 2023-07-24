// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../interfaces/external/IERC20.sol";
import "../interfaces/external/IConcentratedLiquidityPool.sol";
import "./lib/Unit.sol";
import "./lib/AddressUtils.sol";
import "./lib/Math.sol";

/**
 * @title PriceManager
 * @dev The PriceManager contract manages the prices of InviToken and the native token (e.g., ETH).
 */
contract PriceManager is Initializable, OwnableUpgradeable {
    //------Variables------//
    uint128 public inviPrice;
    uint128 public nativePrice;

    //======initializer======//
    /**
     * @dev Initializes the PriceManager contract.
     */
    function initialize() initializer public {
        inviPrice = 10**18;
        nativePrice = 10**18;
        __Ownable_init();
    }

    //======getter functions======//
    /**
     * @notice Returns the current price of InviToken.
     * @return The price of InviToken.
     */
    function getInviPrice() public view returns (uint128) {
        return inviPrice;
    }
   
    /**
     * @notice Returns the current price of the native token.
     * @return The price of the native token.
     */
    function getNativePrice() public view returns (uint128) {
        return nativePrice;
    }

    //======setter functions======//
    /**
     * @notice Sets the price of InviToken.
     * @param _price The new price of InviToken.
     */
    function setInviPrice(uint128 _price) public onlyOwner {
        inviPrice = _price;
    }
   
    /**
     * @notice Sets the price of the native token.
     * @param _price The new price of the native token.
     */
    function setNativePrice(uint128 _price) public onlyOwner {
        nativePrice = _price;
    }
}
