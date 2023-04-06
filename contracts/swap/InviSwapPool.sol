 // SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "hardhat/console.sol";
import "./SwapManager.sol";
import "../interfaces/IERC20.sol";
import "../lib/Unit.sol";
import "../lib/ErrorMessages.sol";
import "../lib/AddressUtils.sol";
import "../lib/Math.sol";

contract InviSwapPool is Initializable, OwnableUpgradeable{
    //------Contracts and Addresses------//
    IERC20 public isptToken;
    IERC20 public inviToken;
    SwapManager public swapManager;

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

    uint public inviPrice;
    uint public klayPrice;

    //======initializer======//
     function initialize(address _inviAddr, address _isptAddr) initializer public {
        inviToken = IERC20(_inviAddr);
        isptToken = IERC20(_isptAddr);
        inviFees = 3;
        klayFees = 3;
        totalLiquidityKlay = 1;
        totalLiquidityInvi = 1;
        totalFeesInvi = 1;
        totalFeesKlay = 1;

        __Ownable_init();
    }

    //======modifier======//
    modifier setPrice {
       setInviPrice();
       setKlayPrice();
        _;
    }

    //======getter functions======//
    function getInviToKlayOutAmount(uint _amountIn, uint _maxPriceKlay) public view returns (uint) {
        uint getInvi = getInviPrice();
        uint getKlay = getKlayPrice();
        require(klayPrice <= _maxPriceKlay, "price is too high");

        return _amountIn * getKlay / getInvi;
        
    }
    function getKlayToInviOutAmount(uint _amountIn, uint _maxPriceInvi) public view returns (uint) {
        uint getInvi = getInviPrice();
        uint getKlay = getKlayPrice();
        require(inviPrice <= _maxPriceInvi, "price is too high");

        return _amountIn * getInvi / getKlay;
    }
    function getAddLiquidityInvi(uint _amountIn, uint _maxPriceInvi) public view returns (uint) {
        uint getInvi = getInviPrice();
        uint getKlay = getKlayPrice();
        require(inviPrice <= _maxPriceInvi, "price is too high");

        return _amountIn * getInvi / getKlay;
    }
    function getInviPrice() public view returns (uint) {
        return inviPrice;
    }
    function getKlayPrice() public view returns (uint) {
        return klayPrice;
    }

    //======setter functions======//
    function setSwapManager(address _swapManager) public onlyOwner {
        swapManager = SwapManager(_swapManager);
    }
    function setInviFees(uint _fees) public onlyOwner {
        inviFees = _fees;
    }
    function setKlayFees(uint _fees) public onlyOwner {
        klayFees = _fees;
    }
    function setInviPrice() internal {
        // uncomment later
        inviPrice = swapManager.fetchInviPrice();

        // for test
        // inviPrice = 1 * 10 ** 18;
    }
    function setKlayPrice() internal {
        // 0: mainnet 1: testnet. uncomment later
        klayPrice = swapManager.fetchKlayPrice(1);
        console.log(klayPrice);
        // for test
        // klayPrice = 2 * 10 ** 18; 
    }

    //======service functions======//
    // set price before swap
    function swapInviToKlay(uint _amountIn, uint _amountOutMin, uint _maxPriceKlay) public setPrice {
        // calculate amount of tokens to be transferred
        uint amountOut = getInviToKlayOutAmount(_amountIn, _maxPriceKlay);
        require(amountOut < totalLiquidityKlay, "not enough reserves");
        require(amountOut >= _amountOutMin, ERROR_SWAP_SLIPPAGE);

        // transfer tokens from sender
        require(inviToken.transferFrom(msg.sender, address(this), _amountIn), ERROR_FAIL_SEND_ERC20);

        // get fees
        uint slippage = amountOut * amountOut / totalLiquidityKlay;
        uint fees = ((amountOut - slippage) * klayFees) / SWAP_FEE_UNIT; // 0.3% fee

        totalLiquidityInvi += _amountIn;
        totalLiquidityKlay -= amountOut - slippage;
        totalFeesKlay += fees;

        splitRewards(0, fees);

        // transfer Klay to the sender
        (bool success, ) = msg.sender.call{value: amountOut - slippage - fees}("");
        require(success, ERROR_FAIL_SEND);
    }

    // set price before swap
    function swapKlayToInvi(uint _amountOutMin, uint _maxPriceInvi) public payable setPrice {
        require(msg.value > 0, ERROR_SWAP_ZERO);

        // calculate amount of tokens to be transferred
        uint256 amountOut = getKlayToInviOutAmount(msg.value, _maxPriceInvi);
        require(amountOut < totalLiquidityInvi, ERROR_NOT_ENOUGH_LIQUIDITY);
        require(amountOut >= _amountOutMin, ERROR_SWAP_SLIPPAGE);
        //console.log("amountOut: ", amountOut);

       // get fees
        uint slippage = amountOut * amountOut / totalLiquidityInvi;
        uint fees = ((amountOut - slippage) * inviFees) / SWAP_FEE_UNIT; // 0.3% fee
        // console.log("total liquidity invi: ", totalLiquidityInvi);
        // console.log("slippage: ", slippage);
        // console.log("fees: ", fees);

        totalLiquidityKlay += msg.value;
        totalLiquidityInvi -= amountOut - slippage;
        totalFeesInvi += fees;

        splitRewards(1, fees);

        // transfer tokens from sender
        require(inviToken.transfer(msg.sender, amountOut - slippage - fees), ERROR_FAIL_SEND_ERC20);
    }

    // slippage unit is 0.1%
    function addLiquidity(uint _maxInvi, uint _maxPriceInvi) public payable setPrice {
       
        uint expectedInvi = getAddLiquidityInvi(msg.value, _maxPriceInvi);
        require( expectedInvi <= _maxInvi, ERROR_SWAP_SLIPPAGE);

        // update liquidity
        totalLiquidityKlay += msg.value;
        totalLiquidityInvi += expectedInvi;
        lpLiquidity[msg.sender] += msg.value * expectedInvi;

        // transfer tokens from sender
        require(inviToken.transferFrom(msg.sender, address(this), expectedInvi), ERROR_FAIL_SEND_ERC20);
        addAddress(lpList, msg.sender);

        // mint token
        isptToken.mintToken(msg.sender, msg.value * expectedInvi);
    }

    function removeLiquidity(uint _liquidityTokens, uint _minKlayAmount, uint _minInviAmount) public {
        require(lpLiquidity[msg.sender] > 0 , ERROR_ZERO_LIQUIDITY);

        // burn liquidity Tokens from sender
        isptToken.burnToken(msg.sender, _liquidityTokens);

        // calculate amount of tokens to be transferred
        uint inviAmount = sqrt(_liquidityTokens / totalLiquidityKlay * totalLiquidityInvi);
        uint klayAmount = sqrt(_liquidityTokens / totalLiquidityInvi * totalLiquidityKlay);
        
        // Check that the amount of Klay and Invi tokens withdrawn meet the minimum amounts specified by the user
        require(klayAmount >= _minKlayAmount, ERROR_AMOUNT_BELOW_MIN);
        require(inviAmount >= _minInviAmount, ERROR_AMOUNT_BELOW_MIN);

        // Calculate rewards for the user
        uint klayReward = lpRewardKlay[msg.sender] * _liquidityTokens / lpLiquidity[msg.sender];
        uint inviReward = lpRewardInvi[msg.sender] * _liquidityTokens / lpLiquidity[msg.sender];

        // Check that the contract has sufficient Klay and Invi tokens to withdraw
        require(address(this).balance >= klayAmount 
        + klayReward, ERROR_INSUFFICIENT_BALANCE);
        require(inviToken.balanceOf(address(this)) >= inviAmount + inviReward, ERROR_INSUFFICIENT_BALANCE);

        // Update the contract's total liquidity and the user's liquidity holdings and rewards
        totalLiquidityKlay -= klayAmount;
        totalLiquidityInvi -= inviAmount;
        lpLiquidity[msg.sender] -= _liquidityTokens;
        lpRewardKlay[msg.sender] -= klayReward;
        lpRewardInvi[msg.sender] -= inviReward;


         // Transfer the Klay and Invi tokens to the user
        (bool klaySuccess, ) = msg.sender.call{value: klayAmount + klayReward}("");
        require(klaySuccess, ERROR_FAIL_SEND);
        require(inviToken.transfer(msg.sender, inviAmount + inviReward), ERROR_FAIL_SEND_ERC20);
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
