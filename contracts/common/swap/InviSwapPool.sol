// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "hardhat/console.sol";
import "../PriceManager.sol";
import "../../interfaces/external/IERC20.sol";
import "../lib/Unit.sol";
import "../lib/ErrorMessages.sol";
import "../lib/AddressUtils.sol";
import "../lib/Math.sol";

/**
 * @title InviSwapPool
 * @dev The InviSwapPool contract facilitates swapping and liquidity provision between the InviToken and the native token (e.g., ETH).
 */
contract InviSwapPool is Initializable, OwnableUpgradeable {
    //------Contracts and Addresses------//
    IERC20 public isptToken;
    IERC20 public inviToken;
    PriceManager public priceManager;

    //------events------//

    //------Variables------//
    mapping(address => uint) public lpLiquidity;
    mapping(address => uint) public lpRewardNative;
    mapping(address => uint) public lpRewardInvi;
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
    /**
     * @dev Initializes the InviSwapPool contract.
     * @param _inviAddr The address of the InviToken contract.
     * @param _isptAddr The address of the ISPT (InviSwapPool Token) contract.
     */
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

    //======getter functions======//

    /**
     * @dev Calculates the amount of InviTokens that will be received for a given amount of native token.
     * @param _amountIn The amount of native token.
     * @return The amount of InviTokens that will be received.
     */
    function getInviToNativeOutAmount(uint _amountIn) public view returns (uint) {
        uint currentNativePrice = priceManager.getNativePrice();
        uint currentInviPrice = priceManager.getInviPrice();
        uint amountOut = _amountIn * currentInviPrice / currentNativePrice;
        uint slippage = amountOut * amountOut / totalLiquidityNative;
        return amountOut - slippage; 
    }

    /**
     * @dev Calculates the amount of native token that will be received for a given amount of InviTokens.
     * @param _amountIn The amount of InviTokens.
     * @return The amount of native token that will be received.
     */
    function getNativeToInviOutAmount(uint _amountIn) public view returns (uint) {
        uint currentNativePrice = priceManager.getNativePrice();
        uint currentInviPrice = priceManager.getInviPrice();
        uint amountOut = _amountIn * currentNativePrice / currentInviPrice;
        uint slippage = amountOut * amountOut / totalLiquidityInvi;
        return amountOut - slippage;
    }

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

    /**
     * @dev Sets the address of the PriceManager contract.
     * @param _priceManager The address of the PriceManager contract.
     */
    function setPriceManager(address _priceManager) public onlyOwner {
        priceManager = PriceManager(_priceManager);
    }

    /**
     * @dev Sets the fees in InviTokens for swaps from native token to InviToken.
     * @param _fees The fees in InviTokens.
     */
    function setInviFees(uint _fees) public onlyOwner {
        inviFees = _fees;
    }

    /**
     * @dev Sets the fees in native token for swaps from InviToken to native token.
     * @param _fees The fees in native token.
     */
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
    //...

    //======service functions======//

    /**
     * @dev Swaps InviTokens for native token.
     * @param _amountIn The amount of InviTokens to swap.
     * @param _amountOutMin The minimum amount of native token expected to receive.
     */
    function swapInviToNative(uint _amountIn, uint _amountOutMin) public {
        require(_amountIn < getInviToNativeOutMaxInput(), "exceeds max input amount");
        uint amountOut = getInviToNativeOutAmount(_amountIn);
        uint fees = (amountOut * nativeFees) / SWAP_FEE_UNIT; // 0.3% fee
        require(amountOut < totalLiquidityNative, "not enough reserves");
        require(amountOut - fees >= _amountOutMin, ERROR_SWAP_SLIPPAGE);
        require(inviToken.transferToken(msg.sender, address(this), _amountIn), ERROR_FAIL_SEND_ERC20);
        totalLiquidityInvi += _amountIn;
        totalLiquidityNative -= amountOut - fees;
        totalRewardNative += fees;
        splitRewards(0, fees);
        (bool success, ) = msg.sender.call{value: amountOut - fees}("");
        require(success, ERROR_FAIL_SEND);
    }

    /**
     * @dev Swaps native token for InviTokens.
     * @param _amountOutMin The minimum amount of InviTokens expected to receive.
     */
    function swapNativeToInvi(uint _amountOutMin) public payable {
        require(msg.value < getNativeToInviOutMaxInput(), "exceeds max input amount");
        require(msg.value > 0, ERROR_SWAP_ZERO);
        uint256 amountOut = getNativeToInviOutAmount(msg.value);
        uint fees = (amountOut * inviFees) / SWAP_FEE_UNIT; // 0.3% fee
        require(amountOut < totalLiquidityInvi, ERROR_NOT_ENOUGH_LIQUIDITY);
        require(amountOut - fees >= _amountOutMin, ERROR_SWAP_SLIPPAGE);
        totalLiquidityNative += msg.value;
        totalLiquidityInvi -= amountOut - fees;
        totalRewardInvi += fees;
        splitRewards(1, fees);
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
        require(inviToken.transferToken(msg.sender, address(this), expectedInvi), ERROR_FAIL_SEND_ERC20);
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

    /**
     * @dev Distributes the rewards to liquidity providers.
     * @param _type The type of reward (0 for native token, 1 for InviToken).
     * @param _amount The amount of rewards to distribute.
     */
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
