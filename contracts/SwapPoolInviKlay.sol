 // SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interfaces/IERC20.sol";
import "./lib/Unit.sol";
import "./lib/ErrorMessages.sol";
import "hardhat/console.sol";

contract SwapPoolInviKlay is Initializable, OwnableUpgradeable{
    //------Contracts and Addresses------//
    IERC20 public inviToken;

    //------events------//

    //------Variables------//
    mapping(address => uint) public lpLiquidityKlay;
    mapping(address => uint) public lpLiquidityInvi;
    uint public totalLiquidityKlay;
    uint public totalLiquidityInvi;
    uint public totalFeesKlay;
    uint public totalFeesInvi;
    uint public totalAddressNumber;
    uint public inviFees;
    uint public klayFees;


    //======initializer======//
     function initialize(address _inviTokenAddr) initializer public {
        __Ownable_init();
        inviToken = IERC20(_inviTokenAddr);

        inviFees = 3 * SWAP_FEE_UNIT;
        klayFees = 3 * SWAP_FEE_UNIT;
        totalLiquidityKlay = 1;
        totalLiquidityInvi = 1;
        totalFeesInvi = 1;
        totalFeesKlay = 1;
        totalAddressNumber = 0;
    }

    //======modifier======//


    //======getter functions======//
    function getSwapRate() public view returns (uint) {
        
    }

    function getInviToKlayOutAmount(uint _amountIn, uint _fees) public view returns (uint) {
        uint liquidityMul = totalLiquidityKlay * totalLiquidityInvi;
        return totalLiquidityKlay - liquidityMul / (totalLiquidityInvi + _amountIn - _fees);
    }
    function getKlayToInviOutAmount(uint _amountIn, uint _fees) public view returns (uint) {
        uint liquidityMul = totalLiquidityKlay * totalLiquidityInvi;
        return totalLiquidityInvi - liquidityMul / (totalLiquidityKlay + _amountIn - _fees);
    }
    function getAddLiquidityInvi(uint _amountKlay) public view returns (uint) {
        return _amountKlay * totalLiquidityInvi / totalLiquidityKlay;
    }

    //======setter functions======//

    //======service functions======//
    function swapInviToKlay(uint _amountIn, uint _amountOutMin) public {
       
        // add liquidity provider fees to total liquidity
        uint256 fees = (_amountIn * 3) / 1000; // 0.3% fee
        totalFeesInvi += fees;
        
        // calculate amount of tokens to be transferred
        uint256 amountOut = getInviToKlayOutAmount(_amountIn, fees);
        require(amountOut >= _amountOutMin, ERROR_SWAP_SLIPPAGE);
        
        // transfer tokens from sender
        require(inviToken.transferFrom(msg.sender, address(this), amountOut), ERROR_FAIL_SEND_ERC20);
        
        // transfer Klay to the sender
        (bool success, ) = msg.sender.call{value: amountOut}("");
        require(success, ERROR_FAIL_SEND);

    }

    function swapKlayToInvi(uint _amountOutMin) public payable {
        require(msg.value > 0, "require klay");

        // add liquidity provider fees to total liquidity

        uint256 fees = (msg.value * 3) / SWAP_FEE_UNIT; // 0.3% fee

        totalFeesInvi += fees;

        // calculate amount of tokens to be transferred
        uint256 amountOut = getKlayToInviOutAmount(msg.value, fees);
        require(amountOut >= _amountOutMin, "Slippage too high");

        // transfer tokens from sender
        require(inviToken.transfer(msg.sender, amountOut), ERROR_FAIL_SEND_ERC20);
    }

      // slippage unit is 0.1%
    function addLiquidity(uint _amountDesiredInvi, uint _slippage) public payable {

        uint minInvi = _amountDesiredInvi - _amountDesiredInvi * _slippage / SLIPPAGE_UNIT;
        uint maxInvi = _amountDesiredInvi + _amountDesiredInvi * _slippage / SLIPPAGE_UNIT;

        uint expectedInvi = getAddLiquidityInvi(msg.value);
        require(expectedInvi >= minInvi && expectedInvi <= maxInvi, ERROR_SWAP_SLIPPAGE);

        // update liquidity
        totalLiquidityKlay += msg.value;
        totalLiquidityInvi += expectedInvi;
        lpLiquidityKlay[msg.sender] += msg.value;
        lpLiquidityInvi[msg.sender] += expectedInvi;

        // transfer tokens from sender
        require(inviToken.transferFrom(msg.sender, address(this), expectedInvi), ERROR_FAIL_SEND_ERC20);
    }

    function removeLiquidity(uint _amountRe, uint _amountNa) public {
        
    }

    //======utils functions======//

}
