// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.0;

// import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

// import "../interfaces/IERC20.sol";
// import "../interfaces/BfcStaking.sol";

// import "../lib/AddressUtils.sol";
// import "../lib/Structs.sol";
// import "../lib/ArrayUtils.sol";
// import "hardhat/console.sol";


// contract LiquidStaking is Initializable, OwnableUpgradeable {
//     //====== Contracts and Addresses ======//
//     IERC20 private stToken;
 
//     //====== variables ======//
 
//     //------ Array and Mapping ------//
//     mapping (address => uint256) public claimable;
//     mapping (address => uint256) public stakedAmount;

//     //------ Events ------//
//     event Stake(uint256 indexed _amount);
//     event Unstake(uint256 indexed _amount);

//     // ====== Modifiers ====== //
//     modifier nonReentrant() {
//         require(!locked, "No re-entrancy");
//         locked = true;
//         _;
//         locked = false;
//     }

//     //====== Initializer ======//
//     function initialize(address _stTokenAddr) initializer public {
//         __Ownable_init();
//         stToken = _stTokenAddr
//     }

//     function stake() external payable  {
//         stakedAmount[msg.sender] += msg.value;
//     }

//     function spreadReward() external  {
       
//     }

//     function createUnstakeRequest (uint256 _amount) external  {
//          claimable[msg.sender] = _amount;
//     }

//     function claim() external  {
//         (bool sent, ) = msg.sender.call{value: claimable[msg.sender]}("");
//         claimable[msg.sender] = 0;
//     }

//     function unstake(uint _amount) external {
//         claimable[msg.sender] = _amount;
//     }

//     function claimUnstakedAmount() external {

//     }

//     //====== utils Functions ======//
//     fallback() external payable {
        
//     }
//     receive() external payable {
        
//     }
// }
