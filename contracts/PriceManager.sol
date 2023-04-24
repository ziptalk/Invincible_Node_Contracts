 // SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "hardhat/console.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IConcentratedLiquidityPool.sol";
import "./lib/Unit.sol";
import "./lib/ErrorMessages.sol";
import "./lib/AddressUtils.sol";
import "./lib/Math.sol";

address constant PANGEA_SWAP_ADDRESS = 0xbF2873B030e8Cf45daeA9dac20BAf20205B75ACE;
// testnet 0xbF2873B030e8Cf45daeA9dac20BAf20205B75ACE
// mainnet 0xeEE272973cf2cA4c5EBf946e601272a3215412a0

contract PriceManager is Initializable, OwnableUpgradeable {
    //------Contracts and Addresses------//
    IConcentratedLiquidityPool pangeaSwapPool;

    //------events------//

    //------Variables------//

    uint public inviPrice;
    uint public klayPrice;

    //======initializer======//

     function initialize() initializer public {
        //pangeaSwapPool = IConcentratedLiquidityPool(PANGEA_SWAP_ADDRESS);
        inviPrice = 10**18;
        klayPrice = 10**18;
        __Ownable_init();
    }

    //======modifier======//

    //======getter functions======//

    function getInviPrice() public view returns (uint) {
        return inviPrice;
    }
   
    function getKlayPrice() public view returns (uint) {
        return klayPrice;
    }

    //======setter functions======//

    function setInviPrice(uint _price) public onlyOwner {
        inviPrice = _price;
    }
   
    function setKlayPrice(uint _price) public onlyOwner {
        klayPrice = _price;
    }

    //======service functions======//
    // function fetchKlayPrice(uint _option) public view returns (uint) {
    //     // uncomment later
    //     // (uint160 klay, int24 tick) = pangeaSwapPool.getPriceAndNearestTicks();
    //     // console.log("klay", klay);

    //     uint parseKlay;
    //     if (_option == 0) {
    //         // parse klay in mainnet
    //         // parseKlay = (klay / 2 ** 96) ** 2;
    //     } 
    //     else {
    //         // parse klay in testnet 
    //         parseKlay = klayPrice;
    //     }

    //     return parseKlay;
    // }

    // function fetchInviPrice() public view returns (uint) {
    //     return inviPrice;
    // }
    
    //======utils functions======//

    
}
