 // SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "hardhat/console.sol";
import "../PriceManager.sol";
import "../interfaces/IERC20.sol";
import "../lib/Unit.sol";
import "../lib/ErrorMessages.sol";
import "../lib/AddressUtils.sol";
import "../lib/Math.sol";

contract InviSwapPool is Initializable, OwnableUpgradeable{
    //------Contracts and Addresses------//
    IERC20 public isptToken;
    IERC20 public inviToken;
    PriceManager public priceManager;

    //------events------//

    //------Variables------//
    mapping(address => uint) public lpLiquidity;
    mapping (address => uint) public lpRewardNative;
    mapping (address => uint) public lpRewardInvi;
    address[] public lpList;

    uint public totalLiquidityNative;
    uint public totalLiquidityInvi;
    uint public totalRewardNative;
    uint public totalRewardInvi;

    uint public inviFees;
    uint public nativeFees;

    uint public inviPrice;
    uint public nativePrice;

    //======initializer======//
     function initialize(address _inviAddr, address _isptAddr) initializer public {
        inviToken = IERC20(_inviAddr);
        isptToken = IERC20(_isptAddr);
        inviFees = 3;
        nativeFees = 3;
        totalLiquidityNative = 1;
        totalLiquidityInvi = 1;
        totalRewardInvi = 1;
        totalRewardNative = 1;

        __Ownable_init();
    }

    //======modifier======//
    // modifier setPrice {
    //    setInviPrice();
    //    setNativePrice();
    //     _;
    // }

    //======getter functions======//
    function getInviToNativeOutAmount(uint _amountIn) public view returns (uint) {
        uint currentNativePrice = priceManager.getNativePrice();
        uint currentInviPrice = priceManager.getInviPrice();
        // get amount out
        uint amountOut = _amountIn * currentInviPrice / currentNativePrice;
        // get slippage
        uint slippage = amountOut * amountOut / totalLiquidityNative;
      
        return amountOut - slippage; 
    }
    function getNativeToInviOutAmount(uint _amountIn) public view returns (uint) {
        uint currentNativePrice = priceManager.getNativePrice();
        uint currentInviPrice = priceManager.getInviPrice();
         // get amount out
        uint amountOut = _amountIn * currentNativePrice / currentInviPrice;
        // get slippage
        uint slippage = amountOut * amountOut / totalLiquidityInvi;

        console.log("amountOut: ", amountOut);
        console.log("slippage: ", slippage);
 
        return  amountOut - slippage;
    }

    // upgrades
    function getNativeToInviOutMaxInput() public view returns (uint) {
        uint currentNativePrice = priceManager.getNativePrice();
        uint currentInviPrice = priceManager.getInviPrice();
        
        return totalLiquidityInvi * currentInviPrice / (2*currentNativePrice);
    }
    function getInviToNativeOutMaxInput() public view returns (uint) {
        uint currentNativePrice = priceManager.getNativePrice();
        uint currentInviPrice = priceManager.getInviPrice();
        
        return totalLiquidityNative * currentNativePrice / (2*currentInviPrice);
    }


    function getAddLiquidityInvi(uint _amountIn) public view returns (uint) {
        uint currentNativePrice = priceManager.getNativePrice();
        uint currentInviPrice = priceManager.getInviPrice();
        return _amountIn * currentNativePrice / currentInviPrice;
    }
    function getAddLiquidityNative(uint _amountIn) public view returns (uint) {
        uint currentNativePrice = priceManager.getNativePrice();
        uint currentInviPrice = priceManager.getInviPrice();
        return _amountIn * currentInviPrice / currentNativePrice;
    }
    function getInviPrice() public view returns (uint) {
        return inviPrice;
    }
    function getNativePrice() public view returns (uint) {
        return nativePrice;
    }
    function getExpectedAmountsOutRemoveLiquidity(uint _liquidityTokensAmount) public view returns (uint inviAmount, uint NativeAmount) {
        uint expectedInvi = sqrt(_liquidityTokensAmount**2 / totalLiquidityNative * totalLiquidityInvi);
        uint expectedNative = sqrt(_liquidityTokensAmount**2 / totalLiquidityInvi * totalLiquidityNative);
        return (expectedInvi, expectedNative);
    }

    //======setter functions======//
    function setPriceManager(address _priceManager) public onlyOwner {
        priceManager = PriceManager(_priceManager);
    }
    function setInviFees(uint _fees) public onlyOwner {
        inviFees = _fees;
    }
    function setNativeFees(uint _fees) public onlyOwner {
        nativeFees = _fees;
    }
    function setInviPrice() internal {
        // uncomment later
        inviPrice = priceManager.getInviPrice();

        // for test
        // inviPrice = 1 * 10 ** 18;
    }
    function setNativePrice() internal {
        // 0: mainnet 1: testnet. uncomment later
        nativePrice = priceManager.getNativePrice();
        // for test
        // NativePrice = 2 * 10 ** 18; 
    }

    //======service functions======//
    // set price before swap
    function swapInviToNative(uint _amountIn, uint _amountOutMin) public {
        require(_amountIn < getInviToNativeOutMaxInput(), "exceeds max input amount");
        // calculate amount of tokens to be transferred
        uint amountOut = getInviToNativeOutAmount(_amountIn);
        
        uint fees = (amountOut * nativeFees) / SWAP_FEE_UNIT; // 0.3% fee

        require(amountOut < totalLiquidityNative, "not enough reserves");
        require(amountOut - fees >= _amountOutMin, ERROR_SWAP_SLIPPAGE);

        // transfer tokens from sender
        require(inviToken.transferFrom(msg.sender, address(this), _amountIn), ERROR_FAIL_SEND_ERC20);

        totalLiquidityInvi += _amountIn;
        totalLiquidityNative -= amountOut-fees;
        totalRewardNative += fees;
        console.log("fees: ", fees);

        splitRewards(0, fees);

        // transfer Native to the sender
        (bool success, ) = msg.sender.call{value: amountOut - fees}("");
        require(success, ERROR_FAIL_SEND);
    }

    // set price before swap
    function swapNativeToInvi(uint _amountOutMin) public payable {
        require(msg.value < getNativeToInviOutMaxInput(), "exceeds max input amount");
        require(msg.value > 0, ERROR_SWAP_ZERO);

        // calculate amount of tokens to be transferred
        uint256 amountOut = getNativeToInviOutAmount(msg.value);
        uint fees = (amountOut * inviFees) / SWAP_FEE_UNIT; // 0.3% fee
        require(amountOut < totalLiquidityInvi, ERROR_NOT_ENOUGH_LIQUIDITY);
        require(amountOut - fees >= _amountOutMin, ERROR_SWAP_SLIPPAGE);
        //console.log("amountOut: ", amountOut);

        // console.log("total liquidity invi: ", totalLiquidityInvi);
        // console.log("slippage: ", slippage);
        // console.log("fees: ", fees);

        totalLiquidityNative += msg.value;
        totalLiquidityInvi -= amountOut - fees;
        totalRewardInvi += fees;
        console.log("fees: ", fees);

        splitRewards(1, fees);

        // transfer tokens from sender
        require(inviToken.transfer(msg.sender, amountOut - fees), ERROR_FAIL_SEND_ERC20);
    }

    // slippage unit is 0.1%
    function addLiquidity(uint _expectedAmountInInvi, uint _slippage) public payable {
       
        uint expectedInvi = getAddLiquidityInvi(msg.value);
        // require( expectedInvi <= _maxInvi, ERROR_SWAP_SLIPPAGE);
        uint expectedAmountInInviMin = _expectedAmountInInvi * (100*SLIPPAGE_UNIT - _slippage) / (100*SLIPPAGE_UNIT);
        uint expectedAmountInInviMax = _expectedAmountInInvi * (100*SLIPPAGE_UNIT + _slippage)  / (100*SLIPPAGE_UNIT);
        require(expectedInvi >= expectedAmountInInviMin && expectedInvi <= expectedAmountInInviMax , ERROR_ADD_LIQUIDITY_SLIPPAGE);

        // update liquidity
        totalLiquidityNative += msg.value;
        totalLiquidityInvi += expectedInvi;

        lpLiquidity[msg.sender] += msg.value * expectedInvi;

        // transfer tokens from sender
        require(inviToken.transferFrom(msg.sender, address(this), expectedInvi), ERROR_FAIL_SEND_ERC20);
        addAddress(lpList, msg.sender);

        // mint token
        isptToken.mintToken(msg.sender, sqrt(msg.value * expectedInvi));
    }

    function removeLiquidity(uint _liquidityTokensAmount, uint _expectedInviAmount, uint _expectedNativeAmount, uint _slippage) public {
        require(lpLiquidity[msg.sender] > 0 , ERROR_ZERO_LIQUIDITY);
 
        // burn liquidity Tokens from sender
        isptToken.burnToken(msg.sender, _liquidityTokensAmount);

        // calculate amount of tokens to be transferred
        uint inviAmount = sqrt(_liquidityTokensAmount**2 / totalLiquidityNative * totalLiquidityInvi);
        uint nativeAmount = sqrt(_liquidityTokensAmount**2 / totalLiquidityInvi * totalLiquidityNative);

        uint expectedNativeAmountMin = _expectedNativeAmount * (100*SLIPPAGE_UNIT - _slippage) / (SLIPPAGE_UNIT*100);
        uint expectedNativeAmountMax = _expectedNativeAmount * (100*SLIPPAGE_UNIT + _slippage) / (SLIPPAGE_UNIT*100);
        uint expectedInviAmountMin = _expectedInviAmount * (100*SLIPPAGE_UNIT - _slippage) / (SLIPPAGE_UNIT*100);
        uint expectedInviAmountMax = _expectedInviAmount * (100*SLIPPAGE_UNIT + _slippage) / (SLIPPAGE_UNIT*100);
        console.log("expectedNativeAmountMin: ", expectedNativeAmountMin);
        console.log("expectedNativeAmountMax: ", expectedNativeAmountMax);
        console.log("expectedInviAmountMin: ", expectedInviAmountMin);
        console.log("expectedInviAmountMax: ", expectedInviAmountMax);
        console.log("actualNativeAmount: ", nativeAmount);
        console.log("actualinviAmount: ", inviAmount);
        require(nativeAmount >= expectedNativeAmountMin && nativeAmount <= expectedNativeAmountMax, ERROR_REMOVE_LIQUIDITY_SLIPPAGE);
        require(inviAmount >= expectedInviAmountMin && inviAmount <= expectedInviAmountMax, ERROR_REMOVE_LIQUIDITY_SLIPPAGE);

        // // Calculate rewards for the user
        // uint NativeReward = lpRewardNative[msg.sender] * _liquidityTokensAmount / lpLiquidity[msg.sender];
        // uint inviReward = lpRewardInvi[msg.sender] * _liquidityTokensAmount / lpLiquidity[msg.sender];

        // Check that the contract has sufficient Native and Invi tokens to withdraw
        require(address(this).balance >= nativeAmount , ERROR_INSUFFICIENT_BALANCE);
        require(inviToken.balanceOf(address(this)) >= inviAmount, ERROR_INSUFFICIENT_BALANCE);

        // Update the contract's total liquidity and the user's liquidity holdings and rewards
        totalLiquidityNative -= nativeAmount;
        totalLiquidityInvi -= inviAmount;
        lpLiquidity[msg.sender] -= _liquidityTokensAmount;

        console.log("totalLiquidityNative: ", totalLiquidityNative);
        console.log("totalLiquidityInvi: ", totalLiquidityInvi);
        // lpRewardNative[msg.sender] -= NativeReward;
        // lpRewardInvi[msg.sender] -= inviReward;

         // Transfer the Native and Invi tokens to the user
        (bool NativeSuccess, ) = msg.sender.call{value: nativeAmount}("");
        require(NativeSuccess, ERROR_FAIL_SEND);
        require(inviToken.transfer(msg.sender, inviAmount), ERROR_FAIL_SEND_ERC20);
    }

    function withdrawFees() public {
        require(lpRewardInvi[msg.sender] > 0 || lpRewardNative[msg.sender] > 0, ERROR_ZERO_FEES);
        uint inviReward = lpRewardInvi[msg.sender];
        uint nativeReward = lpRewardNative[msg.sender];
        if (inviReward > 0 ) {
            totalRewardInvi -= inviReward;
            lpRewardInvi[msg.sender] = 0;
            require(inviToken.transfer(msg.sender, inviReward), ERROR_FAIL_SEND_ERC20);

        }
        if (nativeReward > 0) {
            totalRewardNative -= nativeReward;
            lpRewardNative[msg.sender] = 0;
            (bool NativeSuccess, ) = msg.sender.call{value: nativeReward}("");
            require(NativeSuccess, ERROR_FAIL_SEND);
        }
    }

    //======utils functions======//

    function splitRewards(uint _type, uint _amount) private {
        for (uint i = 0 ; i < lpList.length; i++) {
            address lp = lpList[i];
            uint lpAmount = lpLiquidity[lp];
            uint totalLpAmount = totalLiquidityNative * totalLiquidityInvi;
            if (_type == 0) {
                uint nativeReward = (_amount * lpAmount) / totalLpAmount;
                lpRewardNative[lp] += nativeReward;
                console.log("NativeReward", nativeReward);
            } else {
                uint inviReward = (_amount * lpAmount) / totalLpAmount;
                lpRewardInvi[lp] += inviReward;
                console.log("InviReward", inviReward);
            }
        }
    }
}
