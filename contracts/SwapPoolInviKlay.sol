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
    IERC20 public invi;

    //------events------//

    //------Variables------//
    mapping(address => uint) public lpLiquidityKlay;
    mapping(address => uint) public lpLiquidityInvi;
    uint public totalLiquidityKlay = 1;
    uint public totalLiquidityInvi = 1;
    uint public totalFeesKlay = 1;
    uint public totalFeesInvi = 1;
    uint public totalAddressNumber = 0;
    uint public inviFees;
    uint public klayFees;


    //======initializer======//
     function initialize(address _inviAddr) initializer public {
        invi = IERC20(_inviAddr);

        inviFees = 3;
        klayFees = 3;

        __Ownable_init();
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
    function setInviFees(uint _fees) public onlyOwner {
        inviFees = _fees;
    }
    function setKlayFees(uint _fees) public onlyOwner {
        klayFees = _fees;
    }
    //======service functions======//
    function swapInviToKlay(uint _amountIn, uint _amountOutMin) public {
        uint inviReserve = invi.balanceOf(address(this)) - totalFeesInvi;
        uint klayReserve = address(this).balance - totalFeesKlay;
       
        // add liquidity provider fees to total liquidity
        uint256 fees = (_amountIn * inviFees) / SWAP_FEE_UNIT; // 0.3% fee
        totalFeesInvi += fees;
        
        // calculate amount of tokens to be transferred
        uint256 amountOut = getInviToKlayOutAmount(_amountIn, fees);
        require(amountOut >= _amountOutMin, ERROR_SWAP_SLIPPAGE);
        
        // transfer tokens from sender
        require(invi.transferFrom(msg.sender, address(this), amountOut), ERROR_FAIL_SEND_ERC20);
        
        // transfer Klay to the sender
        (bool success, ) = msg.sender.call{value: amountOut}("");
        require(success, ERROR_FAIL_SEND);

    }

    function swapKlayToInvi(uint _amountOutMin) public payable {
        require(msg.value > 0, ERROR_SWAP_ZERO);

        // add liquidity provider fees to total liquidity

        uint256 fees = (msg.value * 3) / SWAP_FEE_UNIT; // 0.3% fee

        totalFeesInvi += fees;

        // calculate amount of tokens to be transferred
        uint256 amountOut = getKlayToInviOutAmount(msg.value, fees);
        require(amountOut >= _amountOutMin, ERROR_SWAP_SLIPPAGE);

        // transfer tokens from sender
        require(invi.transfer(msg.sender, amountOut), ERROR_FAIL_SEND_ERC20);
    }

      // slippage unit is 0.1%
    function addLiquidity(uint _amountDesiredInvi, uint _slippage) public payable {
        require(_amountDesiredInvi < totalLiquidityInvi, ERROR_NOT_ENOUGH_LIQUIDITY);

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
        require(invi.transferFrom(msg.sender, address(this), expectedInvi), ERROR_FAIL_SEND_ERC20);
    }

    function removeLiquidity(uint liquidityTokens, uint minKlayAmount, uint minInviAmount) public {
        require(lpLiquidityKlay[msg.sender] > 0 && lpLiquidityInvi[msg.sender] > 0, "No liquidity to remove");

        // Calculate the total amount of liquidity held by the contract
        uint totalLiquidity = totalLiquidityKlay * totalLiquidityInvi;

        // Calculate the user's proportion of liquidity
        uint userLiquidity = (liquidityTokens * totalLiquidity) / totalLiquidityInvi;

        // Calculate the amounts of Klay and Invi tokens that the user is entitled to withdraw
        uint klayAmount = (userLiquidity * totalLiquidityKlay) / totalLiquidity;
        uint inviAmount = (userLiquidity * totalLiquidityInvi) / totalLiquidity;

        // Check that the contract has sufficient Klay and Invi tokens to withdraw
        require(address(this).balance >= klayAmount, "Insufficient Klay balance in the contract");
        require(invi.balanceOf(address(this)) >= inviAmount, "Insufficient Invi token balance in the contract");

        // Transfer the Klay and Invi tokens to the user
        (bool klaySuccess, ) = msg.sender.call{value: klayAmount}("");
        require(klaySuccess, "Failed to send Klay");
        require(invi.transfer(msg.sender, inviAmount), "Failed to send Invi tokens");

        // Update the contract's total liquidity and the user's liquidity holdings
        totalLiquidityKlay -= klayAmount;
        totalLiquidityInvi -= inviAmount;
        lpLiquidityKlay[msg.sender] -= klayAmount;
        lpLiquidityInvi[msg.sender] -= inviAmount;

        // Check that the amount of Klay and Invi tokens withdrawn meet the minimum amounts specified by the user
        require(klayAmount >= minKlayAmount, "Klay amount below minimum");
        require(inviAmount >= minInviAmount, "Invi amount below minimum");
    }

    //======utils functions======//

}
