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
    mapping (address => uint) public lpRewardKlay;
    mapping (address => uint) public lpRewardInvi;
    address[] public lpList;

    uint public totalLiquidityKlay;
    uint public totalLiquidityInvi;
    uint public totalRewardKlay;
    uint public totalRewardInvi;

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
        totalRewardInvi = 1;
        totalRewardKlay = 1;

        __Ownable_init();
    }

    //======modifier======//
    modifier setPrice {
       setInviPrice();
       setKlayPrice();
        _;
    }

    //======getter functions======//
    function getInviToKlayOutAmount(uint _amountIn) public view returns (uint) {
        uint currentKlayPrice = priceManager.getKlayPrice();
        uint currentInviPrice = priceManager.getInviPrice();
        // get amount out
        uint amountOut = _amountIn * currentKlayPrice / currentInviPrice;
        // get slippage
        uint slippage = amountOut * amountOut / totalLiquidityKlay;
      
        return amountOut - slippage; 
    }
    function getKlayToInviOutAmount(uint _amountIn) public view returns (uint) {
        uint currentKlayPrice = priceManager.getKlayPrice();
        uint currentInviPrice = priceManager.getInviPrice();
         // get amount out
        uint amountOut = _amountIn * currentInviPrice / currentKlayPrice;
        // get slippage
        uint slippage = amountOut * amountOut / totalLiquidityInvi;
 
        return  amountOut - slippage;
    }
    function getAddLiquidityInvi(uint _amountIn) public view returns (uint) {
        uint currentKlayPrice = priceManager.getKlayPrice();
        uint currentInviPrice = priceManager.getInviPrice();
        return _amountIn * currentKlayPrice / currentInviPrice;
    }
    function getInviPrice() public view returns (uint) {
        return inviPrice;
    }
    function getKlayPrice() public view returns (uint) {
        return klayPrice;
    }
    function getExpectedAmountsOutRemoveLiquidity(uint _liquidityTokensAmount) public view returns (uint inviAmount, uint klayAmount) {
        uint expectedInvi = sqrt(_liquidityTokensAmount**2 / totalLiquidityKlay * totalLiquidityInvi);
        uint expectedKlay = sqrt(_liquidityTokensAmount**2 / totalLiquidityInvi * totalLiquidityKlay);
        return (expectedInvi, expectedKlay);
    }

    //======setter functions======//
    function setPriceManager(address _priceManager) public onlyOwner {
        priceManager = PriceManager(_priceManager);
    }
    function setInviFees(uint _fees) public onlyOwner {
        inviFees = _fees;
    }
    function setKlayFees(uint _fees) public onlyOwner {
        klayFees = _fees;
    }
    function setInviPrice() internal {
        // uncomment later
        inviPrice = priceManager.getInviPrice();

        // for test
        // inviPrice = 1 * 10 ** 18;
    }
    function setKlayPrice() internal {
        // 0: mainnet 1: testnet. uncomment later
        klayPrice = priceManager.getKlayPrice();
        // for test
        // klayPrice = 2 * 10 ** 18; 
    }

    //======service functions======//
    // set price before swap
    function swapInviToKlay(uint _amountIn, uint _amountOutMin) public setPrice {
        // calculate amount of tokens to be transferred
        uint amountOut = getInviToKlayOutAmount(_amountIn);
        
        uint fees = (amountOut * klayFees) / SWAP_FEE_UNIT; // 0.3% fee

        require(amountOut < totalLiquidityKlay, "not enough reserves");
        require(amountOut - fees >= _amountOutMin, ERROR_SWAP_SLIPPAGE);

        // transfer tokens from sender
        require(inviToken.transferFrom(msg.sender, address(this), _amountIn), ERROR_FAIL_SEND_ERC20);

        totalLiquidityInvi += _amountIn;
        totalLiquidityKlay -= amountOut-fees;
        totalRewardKlay += fees;
        console.log("fees: ", fees);

        splitRewards(0, fees);

        // transfer Klay to the sender
        (bool success, ) = msg.sender.call{value: amountOut - fees}("");
        require(success, ERROR_FAIL_SEND);
    }

    // set price before swap
    function swapKlayToInvi(uint _amountOutMin) public payable setPrice {
        require(msg.value > 0, ERROR_SWAP_ZERO);

        // calculate amount of tokens to be transferred
        uint256 amountOut = getKlayToInviOutAmount(msg.value);
        uint fees = (amountOut * inviFees) / SWAP_FEE_UNIT; // 0.3% fee
        require(amountOut < totalLiquidityInvi, ERROR_NOT_ENOUGH_LIQUIDITY);
        require(amountOut - fees >= _amountOutMin, ERROR_SWAP_SLIPPAGE);
        //console.log("amountOut: ", amountOut);

        // console.log("total liquidity invi: ", totalLiquidityInvi);
        // console.log("slippage: ", slippage);
        // console.log("fees: ", fees);

        totalLiquidityKlay += msg.value;
        totalLiquidityInvi -= amountOut - fees;
        totalRewardInvi += fees;
        console.log("fees: ", fees);

        splitRewards(1, fees);

        // transfer tokens from sender
        require(inviToken.transfer(msg.sender, amountOut - fees), ERROR_FAIL_SEND_ERC20);
    }

    // slippage unit is 0.1%
    function addLiquidity(uint _expectedAmountInInvi, uint _slippage) public payable setPrice {
       
        uint expectedInvi = getAddLiquidityInvi(msg.value);
        // require( expectedInvi <= _maxInvi, ERROR_SWAP_SLIPPAGE);
        uint expectedAmountInInviMin = _expectedAmountInInvi * (100*SLIPPAGE_UNIT - _slippage) / (100*SLIPPAGE_UNIT);
        uint expectedAmountInInviMax = _expectedAmountInInvi * (100*SLIPPAGE_UNIT + _slippage)  / (100*SLIPPAGE_UNIT);
        require(expectedInvi >= expectedAmountInInviMin && expectedInvi <= expectedAmountInInviMax , ERROR_ADD_LIQUIDITY_SLIPPAGE);

        // update liquidity
        totalLiquidityKlay += msg.value;
        totalLiquidityInvi += expectedInvi;

        lpLiquidity[msg.sender] += msg.value * expectedInvi;

        // transfer tokens from sender
        require(inviToken.transferFrom(msg.sender, address(this), expectedInvi), ERROR_FAIL_SEND_ERC20);
        addAddress(lpList, msg.sender);

        // mint token
        isptToken.mintToken(msg.sender, sqrt(msg.value * expectedInvi));
    }

    function removeLiquidity(uint _liquidityTokensAmount, uint _expectedInviAmount, uint _expectedKlayAmount, uint _slippage) public {
        require(lpLiquidity[msg.sender] > 0 , ERROR_ZERO_LIQUIDITY);
 
        // burn liquidity Tokens from sender
        isptToken.burnToken(msg.sender, _liquidityTokensAmount);

        // calculate amount of tokens to be transferred
        uint inviAmount = sqrt(_liquidityTokensAmount**2 / totalLiquidityKlay * totalLiquidityInvi);
        uint klayAmount = sqrt(_liquidityTokensAmount**2 / totalLiquidityInvi * totalLiquidityKlay);

        uint expectedKlayAmountMin = _expectedKlayAmount * (100*SLIPPAGE_UNIT - _slippage) / (SLIPPAGE_UNIT*100);
        uint expectedKlayAmountMax = _expectedKlayAmount * (100*SLIPPAGE_UNIT + _slippage) / (SLIPPAGE_UNIT*100);
        uint expectedInviAmountMin = _expectedInviAmount * (100*SLIPPAGE_UNIT - _slippage) / (SLIPPAGE_UNIT*100);
        uint expectedInviAmountMax = _expectedInviAmount * (100*SLIPPAGE_UNIT + _slippage) / (SLIPPAGE_UNIT*100);
        console.log("expectedKlayAmountMin: ", expectedKlayAmountMin);
        console.log("expectedKlayAmountMax: ", expectedKlayAmountMax);
        console.log("expectedInviAmountMin: ", expectedInviAmountMin);
        console.log("expectedInviAmountMax: ", expectedInviAmountMax);
        console.log("actualklayAmount: ", klayAmount);
        console.log("actualinviAmount: ", inviAmount);
        require(klayAmount >= expectedKlayAmountMin && klayAmount <= expectedKlayAmountMax, ERROR_REMOVE_LIQUIDITY_SLIPPAGE);
        require(inviAmount >= expectedInviAmountMin && inviAmount <= expectedInviAmountMax, ERROR_REMOVE_LIQUIDITY_SLIPPAGE);

        // // Calculate rewards for the user
        // uint klayReward = lpRewardKlay[msg.sender] * _liquidityTokensAmount / lpLiquidity[msg.sender];
        // uint inviReward = lpRewardInvi[msg.sender] * _liquidityTokensAmount / lpLiquidity[msg.sender];

        // Check that the contract has sufficient Klay and Invi tokens to withdraw
        require(address(this).balance >= klayAmount , ERROR_INSUFFICIENT_BALANCE);
        require(inviToken.balanceOf(address(this)) >= inviAmount, ERROR_INSUFFICIENT_BALANCE);

        // Update the contract's total liquidity and the user's liquidity holdings and rewards
        totalLiquidityKlay -= klayAmount;
        totalLiquidityInvi -= inviAmount;
        lpLiquidity[msg.sender] -= _liquidityTokensAmount;

        console.log("totalLiquidityKlay: ", totalLiquidityKlay);
        console.log("totalLiquidityInvi: ", totalLiquidityInvi);
        // lpRewardKlay[msg.sender] -= klayReward;
        // lpRewardInvi[msg.sender] -= inviReward;

         // Transfer the Klay and Invi tokens to the user
        (bool klaySuccess, ) = msg.sender.call{value: klayAmount}("");
        require(klaySuccess, ERROR_FAIL_SEND);
        require(inviToken.transfer(msg.sender, inviAmount), ERROR_FAIL_SEND_ERC20);
    }

    function withdrawFees() public {
        require(lpRewardInvi[msg.sender] > 0 || lpRewardKlay[msg.sender] > 0, ERROR_ZERO_FEES);
        uint inviReward = lpRewardInvi[msg.sender];
        uint klayReward = lpRewardKlay[msg.sender];
        if (inviReward > 0 ) {
            totalRewardInvi -= inviReward;
            lpRewardInvi[msg.sender] = 0;
            require(inviToken.transfer(msg.sender, inviReward), ERROR_FAIL_SEND_ERC20);

        }
        if (klayReward > 0) {
            totalRewardKlay -= klayReward;
            lpRewardKlay[msg.sender] = 0;
            (bool klaySuccess, ) = msg.sender.call{value: klayReward}("");
            require(klaySuccess, ERROR_FAIL_SEND);
        }
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
                console.log("KlayReward", klayReward);
            } else {
                uint inviReward = (_amount * lpAmount) / totalLpAmount;
                lpRewardInvi[lp] += inviReward;
                console.log("InviReward", inviReward);
            }
        }
    }
}
