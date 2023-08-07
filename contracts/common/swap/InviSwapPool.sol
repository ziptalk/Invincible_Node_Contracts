// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "hardhat/console.sol";
import "../../interfaces/external/IERC20.sol";
import "../lib/Unit.sol";
import "../lib/AddressUtils.sol";
import "../lib/Math.sol";

/**
 * @title InviSwapPool
 * @dev The InviSwapPool contract facilitates swapping and liquidity provision between the InviToken and the native token (e.g., ETH).
 */
contract InviSwapPool is Initializable, OwnableUpgradeable {
    using Math for uint256;
    //------Contracts and Addresses------//
    IERC20 public inviToken;

    //------events------//

    //------Variables------//
    mapping(address => uint256) public lpRewardNative;
    mapping(address => uint256) public lpRewardInvi;
    mapping(address => uint256) public lpScore;
    mapping(uint32 => address) public lpList;

    uint32 public lpCount;
    uint256 public totalLiquidityNative;
    uint256 public totalLiquidityInvi;
    uint256 public totalRewardNative;
    uint256 public totalRewardInvi;
    uint256 public totalLpScore;

    uint public inviFees;
    uint public nativeFees;

    //======initializer======//
    /**
     * @dev Initializes the InviSwapPool contract.
     * @param _inviAddr The address of the InviToken contract.
     */
    function initialize(address _inviAddr) initializer public {
        inviToken = IERC20(_inviAddr);
        inviFees = 5;
        nativeFees = 5;
        lpCount = 0;
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
        uint256 currentInviLiquidity = totalLiquidityInvi;
        uint256 currentNativeLiquidity = totalLiquidityNative;
        uint256 amountOut = _amountIn * currentNativeLiquidity / currentInviLiquidity;
        return amountOut; 
    }

    /**
     * @dev Calculates the amount of native token that will be received for a given amount of InviTokens.
     * @param _amountIn The amount of InviTokens.
     * @return The amount of native token that will be received.
     */
    function getNativeToInviOutAmount(uint256 _amountIn) public view returns (uint256) {
        uint256 currentInviLiquidity = totalLiquidityInvi;
        uint256 currentNativeLiquidity = totalLiquidityNative;
        uint256 amountOut = _amountIn * currentInviLiquidity / currentNativeLiquidity;
        return amountOut;
    }

    function getNativeToInviOutMaxInput() public view returns (uint) {
        uint256 currentInviLiquidity = totalLiquidityInvi;
        uint256 currentNativeLiquidity = totalLiquidityNative;
        
        return totalLiquidityInvi * currentNativeLiquidity / (2*currentInviLiquidity);
    }
    function getInviToNativeOutMaxInput() public view returns (uint) {
        uint256 currentInviLiquidity = totalLiquidityInvi;
        uint256 currentNativeLiquidity = totalLiquidityNative;
        return totalLiquidityNative * currentInviLiquidity / (2*currentNativeLiquidity);
    }

    function getAddLiquidityInvi(uint256 _amountIn) public view returns (uint256) {
        return _amountIn * totalLiquidityNative / totalLiquidityInvi;
    }
    function getAddLiquidityNative(uint _amountIn) public view returns (uint256) {
        return _amountIn * totalLiquidityInvi / totalLiquidityNative;
    }
    function getExpectedAmountsOutRemoveLiquidity(uint256 _liquidityAmount) public view returns (uint256 inviAmount, uint256 nativeAmount) {
        uint256 totalScore = totalLpScore;
        uint256 expectedInvi = _liquidityAmount * totalLiquidityInvi / totalScore;
        uint256 expectedNative = _liquidityAmount * totalLiquidityNative / totalScore;
        return (expectedInvi, expectedNative);
    }

    //======setter functions======//
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

    //======service functions======//
    /**
     * @dev Swaps InviTokens for native token.
     * @param _amountIn The amount of InviTokens to swap.
     * @param _amountOutMin The minimum amount of native token expected to receive.
     */
    function swapInviToNative(uint256 _amountIn, uint _amountOutMin) public {
        require(totalLiquidityNative <= address(this).balance + 10, "Test logic2");
        require(_amountIn < getInviToNativeOutMaxInput(), "InviSwapPool: exceeds max input amount");
        uint256 amountOut = getInviToNativeOutAmount(_amountIn);
        uint256 fees = (amountOut * nativeFees) / SWAP_FEE_UNIT; // 0.3% fee
        require(amountOut < totalLiquidityNative, "not enough reserves");
        require(amountOut >= _amountOutMin + fees, "InviSwapPool: less than min amount");
        require(inviToken.transferToken(msg.sender, address(this), _amountIn), "InviSwapPool: transfer failed");
        totalLiquidityInvi += _amountIn;
        totalLiquidityNative -= amountOut ;
        totalRewardNative += fees;
        _splitRewards(0, fees);
        (bool success, ) = msg.sender.call{value: amountOut - fees}("");
        require(success, "InviSwapPool: transfer failed");
    
        require(totalLiquidityNative <= address(this).balance + 10, "Test logic");
    }

    /**
     * @dev Swaps native token for InviTokens.
     * @param _amountOutMin The minimum amount of InviTokens expected to receive.
     */
    function swapNativeToInvi(uint _amountOutMin) public payable {
        require(msg.value < getNativeToInviOutMaxInput(), "exceeds max input amount");
        require(msg.value > 0, "InviSwapPool: zero amount");
        uint256 amountOut = getNativeToInviOutAmount(msg.value);
        uint fees = (amountOut * inviFees) / SWAP_FEE_UNIT; // 0.3% fee
        //console.log("amountOut              : ", amountOut);
        //console.log("totalLiquidityInvi     : ", totalLiquidityInvi);
        require(amountOut < totalLiquidityInvi, "InviSwapPool: not enough reserves");
        require(amountOut >= _amountOutMin + fees, "InviSwapPool: less than min amount");
        totalLiquidityNative += msg.value;
        totalLiquidityInvi -= amountOut;
        totalRewardInvi += fees;
        _splitRewards(1, fees);
        require(inviToken.transfer(msg.sender, amountOut - fees), "InviSwapPool: transfer failed");
    }

      // slippage unit is 0.1%
    function addLiquidity(uint _expectedAmountInInvi, uint _slippage) public payable {
        uint256 expectedInvi = getAddLiquidityInvi(msg.value);
        console.log("expectedInvi: ", expectedInvi);
        // require( expectedInvi <= _maxInvi, ERROR_SWAP_SLIPPAGE);
        uint256 expectedAmountInInviMin = _expectedAmountInInvi * (100*SLIPPAGE_UNIT - _slippage) / (100*SLIPPAGE_UNIT);
        uint256 expectedAmountInInviMax = _expectedAmountInInvi * (100*SLIPPAGE_UNIT + _slippage)  / (100*SLIPPAGE_UNIT);
        require(expectedInvi >= expectedAmountInInviMin && expectedInvi <= expectedAmountInInviMax , "InviSwapPool: unexpected INVI amount");

        // update liquidity
        totalLiquidityNative += msg.value;
        totalLiquidityInvi += expectedInvi;

        // transfer tokens from sender
        require(inviToken.transferToken(msg.sender, address(this), uint256(expectedInvi)), "InviSwapPool: transfer failed");
        
        // add to lp list
        bool exist = false;
        // if duplicated ILP holder
        for (uint32 i = 0; i < lpCount; i++) {
            if (lpList[i] == msg.sender) {
                exist = true;
            }
        }
        // else update ILPHolderList 
        if (!exist) {
            lpList[lpCount++] = msg.sender;
        }

        // update lp score
        lpScore[msg.sender] += (msg.value * expectedInvi).sqrt();
        // update total lp score
        totalLpScore += (msg.value * expectedInvi).sqrt();
        require(totalLiquidityNative <= address(this).balance + 10, "Test logic4");

    }

    function removeLiquidity(uint _liquidityAmount, uint _expectedInviAmount, uint _expectedNativeAmount, uint _slippage) public { 
        require(_liquidityAmount <= totalLiquidityNative, "InviSwapPool: exceeds max input amount");
        require(_liquidityAmount <= lpScore[msg.sender], "InviSwapPool: exceeds max input amount");
        // calculate amount of tokens to be transferred
        (uint256 inviAmount, uint256 nativeAmount) = getExpectedAmountsOutRemoveLiquidity(_liquidityAmount);

        uint expectedNativeAmountMin = _expectedNativeAmount * (100*SLIPPAGE_UNIT - _slippage) / (SLIPPAGE_UNIT*100);
        uint expectedNativeAmountMax = _expectedNativeAmount * (100*SLIPPAGE_UNIT + _slippage) / (SLIPPAGE_UNIT*100);
        uint expectedInviAmountMin = _expectedInviAmount * (100*SLIPPAGE_UNIT - _slippage) / (SLIPPAGE_UNIT*100);
        uint expectedInviAmountMax = _expectedInviAmount * (100*SLIPPAGE_UNIT + _slippage) / (SLIPPAGE_UNIT*100);

        require(nativeAmount >= expectedNativeAmountMin && nativeAmount <= expectedNativeAmountMax, "InviSwapPool: exceeds max input amount");
        require(inviAmount >= expectedInviAmountMin && inviAmount <= expectedInviAmountMax, "InviSwapPool: exceeds max input amount");
        // Check that the contract has sufficient Native and Invi tokens to withdraw
   
        require(address(this).balance >= nativeAmount + totalRewardNative , "InviSwapPool: insufficient balance");
        require(inviToken.balanceOf(address(this)) >= inviAmount + totalRewardInvi, "InviSwapPool: insufficient balance");

        // update liquidity
        lpScore[msg.sender] -= _liquidityAmount;
        totalLpScore -= _liquidityAmount;

        // Update the contract's total liquidity and the user's liquidity holdings and rewards
        totalLiquidityNative -= nativeAmount;
        totalLiquidityInvi -= inviAmount;


         // Transfer the Native and Invi tokens to the user
        (bool NativeSuccess, ) = msg.sender.call{value: nativeAmount}("");
        require(NativeSuccess, "InviSwapPool: Native transfer failed");
        require(inviToken.transfer(msg.sender, inviAmount), "InviSwapPool: Invi transfer failed");
    }

    function withdrawFees() public {
        require(lpRewardInvi[msg.sender] > 0 || lpRewardNative[msg.sender] > 0, "InviSwapPool: no fees");
        uint inviReward = lpRewardInvi[msg.sender];
        uint nativeReward = lpRewardNative[msg.sender];
        if (inviReward > 0 ) {
            require(totalRewardInvi >= inviReward, "InviSwapPool: insufficient reward");
            require(inviToken.balanceOf(address(this)) >= inviReward, "InviSwapPool: insufficient balance");
            totalRewardInvi -= inviReward;
            lpRewardInvi[msg.sender] = 0;
            require(inviToken.transfer(msg.sender, inviReward), "InviSwapPool: Invi transfer failed");
        }
        if (nativeReward > 0) {
            totalRewardNative -= nativeReward;
            lpRewardNative[msg.sender] = 0;
            (bool NativeSuccess, ) = msg.sender.call{value: nativeReward}("");
            require(NativeSuccess, "InviSwapPool: Native transfer failed");
        }
    }
    //======utils functions======//
    /**
     * @dev Distributes the rewards to liquidity providers.
     * @param _type The type of reward (0 for native token, 1 for InviToken).
     * @param _amount The amount of rewards to distribute.
     */
    function _splitRewards(uint _type, uint _amount) private {
        for (uint32 i = 0 ; i < lpCount; i++) {
            address lp = lpList[i];
            uint lpAmount = lpScore[lp];
            uint totalSupply = totalLpScore;
            if (_type == 0) {
                uint nativeReward = (_amount * lpAmount) / totalSupply;
                lpRewardNative[lp] += nativeReward;
            } else {
                uint inviReward = (_amount * lpAmount) / totalSupply;
                lpRewardInvi[lp] += inviReward;
            }
        }
    }
}
