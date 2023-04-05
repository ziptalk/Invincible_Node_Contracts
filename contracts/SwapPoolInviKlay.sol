 // SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interfaces/IERC20.sol";
import "./lib/Unit.sol";
import "./lib/ErrorMessages.sol";
import "hardhat/console.sol";
import "./lib/AddressUtils.sol";

contract SwapPoolInviKlay is Initializable, OwnableUpgradeable{
    //------Contracts and Addresses------//

    IERC20 public inklpToken;
    IERC20 public inviToken;
    
    //------events------//

    //------Variables------//

    mapping(address => uint) public lpLiquidity;
    mapping (address => uint) public lpRewardKlay;
    mapping (address => uint) public lpRewardInvi;
    address[] public lpList;

    uint public totalLiquidityKlay;
    uint public totalLiquidityInvi;
    uint public totalFeesKlay;
    uint public totalFeesInvi;

    uint public inviFees;
    uint public klayFees;


    //======initializer======//

     function initialize(address _inviAddr, address _inklpAddr) initializer public {
        inviToken = IERC20(_inviAddr);
        inklpToken = IERC20(_inklpAddr);
        inviFees = 3;
        klayFees = 3;
        totalLiquidityKlay = 1;
        totalLiquidityInvi = 1;
        totalFeesInvi = 1;
        totalFeesKlay = 1;

        __Ownable_init();
    }

    //======modifier======//


    //======getter functions======//
    function getSwapRate() public view returns (uint) {
        
    }

    function getInviToKlayOutAmount(uint _amountIn) public view returns (uint) {
        uint liquidityMul = totalLiquidityKlay * totalLiquidityInvi;
        return totalLiquidityKlay - liquidityMul / (totalLiquidityInvi + _amountIn);
    }
    function getKlayToInviOutAmount(uint _amountIn) public view returns (uint) {
        uint liquidityMul = totalLiquidityKlay * totalLiquidityInvi;
        return totalLiquidityInvi - liquidityMul / (totalLiquidityKlay + _amountIn);
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
        // calculate amount of tokens to be transferred
        uint256 amountOut = getInviToKlayOutAmount(_amountIn);
        require(amountOut < totalLiquidityKlay, "not enough reserves");
        require(amountOut >= _amountOutMin, ERROR_SWAP_SLIPPAGE);

        // transfer tokens from sender

        require(inviToken.transferFrom(msg.sender, address(this), _amountIn), ERROR_FAIL_SEND_ERC20);

        // get fees
        uint256 fees = (amountOut * klayFees) / SWAP_FEE_UNIT; // 0.3% fee

        totalLiquidityInvi += _amountIn;
        totalLiquidityKlay -= amountOut;
        totalFeesKlay += fees;

        splitRewards(0, fees);

        // transfer Klay to the sender
        (bool success, ) = msg.sender.call{value: amountOut - fees}("");
        require(success, ERROR_FAIL_SEND);
    }

    function swapKlayToInvi(uint _amountOutMin) public payable {
        require(msg.value > 0, ERROR_SWAP_ZERO);

        // calculate amount of tokens to be transferred
        uint256 amountOut = getKlayToInviOutAmount(msg.value);
        require(amountOut < totalLiquidityInvi, "not enough reserves");
        require(amountOut >= _amountOutMin, ERROR_SWAP_SLIPPAGE);

        // get fees
        uint256 fees = (amountOut * inviFees) / SWAP_FEE_UNIT; // 0.3% fee
        totalLiquidityKlay += msg.value;
        totalLiquidityInvi -= amountOut;
        totalFeesInvi += fees;

        splitRewards(1, fees);

        // transfer tokens from sender

        require(inviToken.transfer(msg.sender, amountOut - fees), ERROR_FAIL_SEND_ERC20);
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
        lpLiquidity[msg.sender] += msg.value * expectedInvi;

        // transfer tokens from sender
        require(inviToken.transferFrom(msg.sender, address(this), expectedInvi), ERROR_FAIL_SEND_ERC20);

        // mint LP token
        uint lpAmount = msg.value * expectedInvi;
        inklpToken.mintToken(msg.sender, lpAmount);

        addAddress(lpList, msg.sender);
    }

    function removeLiquidity(uint liquidityTokens, uint minKlayAmount, uint minInviAmount) public {
        require(lpLiquidity[msg.sender] > 0 , "No liquidity to remove");

        // tranfer inklp token from sender
        require(inklpToken.transferFrom(msg.sender, address(this), liquidityTokens), ERROR_FAIL_SEND_ERC20);

        // Calculate the total amount of liquidity held by the contract
        uint totalLiquidity = totalLiquidityKlay * totalLiquidityInvi;

        // Calculate the amounts of Klay and Invi tokens that the user is entitled to withdraw
        uint klayAmount = (liquidityTokens * totalLiquidityKlay) / totalLiquidity;
        uint inviAmount = (liquidityTokens * totalLiquidityInvi) / totalLiquidity;

        // Calculate rewards for the user
        uint klayReward = lpRewardKlay[msg.sender] * liquidityTokens / lpLiquidity[msg.sender];
        uint inviReward = lpRewardInvi[msg.sender] * liquidityTokens / lpLiquidity[msg.sender];

        // Check that the contract has sufficient Klay and Invi tokens to withdraw
        require(address(this).balance >= klayAmount 
        + klayReward, "Insufficient Klay balance in the contract");
        require(inviToken.balanceOf(address(this)) >= inviAmount + inviReward, "Insufficient Invi token balance in the contract");

        // Update the contract's total liquidity and the user's liquidity holdings and rewards
        totalLiquidityKlay -= klayAmount;
        totalLiquidityInvi -= inviAmount;
        lpLiquidity[msg.sender] -= liquidityTokens;
        lpRewardKlay[msg.sender] -= klayReward;
        lpRewardInvi[msg.sender] -= inviReward;


         // Transfer the Klay and Invi tokens to the user
        (bool klaySuccess, ) = msg.sender.call{value: klayAmount + klayReward}("");
        require(klaySuccess, ERROR_FAIL_SEND);
        require(inviToken.transfer(msg.sender, inviAmount + inviReward), ERROR_FAIL_SEND_ERC20);
      

        // Check that the amount of Klay and Invi tokens withdrawn meet the minimum amounts specified by the user
        require(klayAmount >= minKlayAmount, "Klay amount below minimum");
        require(inviAmount >= minInviAmount, "Invi amount below minimum");
    }

    //======utils functions======//

    function splitRewards(uint _type, uint _amount) private {
        for (uint i = 0 ; i < lpList.length; i++) {
            address lp = lpList[i];
            uint lpAmount = lpLiquidity[lp];
            uint totalLpAmount = totalLiquidityKlay * totalLiquidityInvi;
            if (_type == 0) {
                uint klayReward = (_amount * lpAmount) / totalLpAmount;
                lpRewardKlay[lp] += klayReward;
            } else {
                uint inviReward = (_amount * lpAmount) / totalLpAmount;
                lpRewardInvi[lp] += inviReward;
            }
        }
    }
}
