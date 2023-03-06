// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

contract LiquidStaking is ReentrancyGuard {
    // Reward로 지급 받는 토큰 type
    IERC20 public immutable reToken;

    struct addressData {
        address account;
        bool isValue;
    }

    // account = 유저 주소
    struct UnbondData {
        address account; // 유저 주소
        uint256 amount; // 출금 요청 수량
    }

    address public owner;
    address public stakeManager;
    uint256 public unbondingTime; // uint public updatedAt;
    
    address[] public addressList; // address list
    uint256 public totalAddressNumber; // total address;

    //validator
    string validatorAddress;
    mapping(address => uint256) public validatorRewardAmount;
    mapping(address => uint256) public validatorClaimedAmount;
    mapping(string => uint256) public validatorAddresses;
    

    //user
    mapping(address => uint256) public stakedAmount;
    mapping(address => uint256) public shareAmount;
    mapping(address => uint256) public rewardAmount;
    uint256 public totalShareAmount;
    UnbondData[] public unbondRequests;

    // mapping(address => string) public approvedValidators;
    mapping(address => string) public validatorRequests;

    event Received(address sender);
    event Transfer(
        address indexed src,
        address indexed dst,
        uint256 val,
        bytes stableAmount
    );
    event Unbond(address indexed src, uint256 val);
    event UpdateRequest(string indexed validatorAddress);

    modifier onlyOwner() {
        require(msg.sender == owner, "not authorized");
        _;
    }

    // 생성자로 staking token address / reward token address을 입력
    constructor(
        address _reToken,
        address _stakeManager,
        uint256 _unbondingTime
    ) {
        owner = msg.sender;
        stakeManager = _stakeManager;
        reToken = IERC20(_reToken);
        totalAddressNumber = 0;
        unbondingTime = _unbondingTime;
    }

    receive() external payable {
        emit Received(msg.sender);
        if (msg.sender == stakeManager) {
            for (uint256 i = 0; i < unbondRequests.length; i++) {
                if (address(this).balance >= unbondRequests[i].amount) {
                    address receiver = unbondRequests[i].account;
                    (bool sent, ) = receiver.call{value: unbondRequests[i].amount}("");
                    require(sent, "Failed to send");
                }
                popFromUnbondRequest(i);
            }
        }
    }

    // contract에서 token을 받았을 때 어떻게 할 것인가
    fallback() external payable {
        emit Received(msg.sender);

        uint rate = convertBytesToUint(msg.data);
        uint stakeCoinAmount = msg.value * (100-rate) / 100;
        uint rewardCoinAmount = stakeCoinAmount + (msg.value - stakeCoinAmount) / 2;
        require(rate >= 0 && rate < 100, "require risk hedging rate");

        //update info
        stakedAmount[msg.sender] +=  stakeCoinAmount;
        shareAmount[msg.sender] += rewardCoinAmount;
        totalShareAmount += rewardCoinAmount;

        // validator owner에게 그대로 send
        (bool sent, ) = stakeManager.call{value: msg.value}("");
        require(sent, "failed to send");
        
        // reward token mint
        reToken.mintToken(address(this), stakeCoinAmount);
        reToken.transfer(msg.sender, stakeCoinAmount);

        addAddressList(msg.sender);   
        emit Transfer(msg.sender, address(this), msg.value, msg.data);
    }

    // user withdraw request
    function withdraw(uint256 _amount) public nonReentrant {
        //validation
        require(_amount > 0, "amount = 0");
        require(_amount <= stakedAmount[msg.sender], "too much amount");
        
        //update info
        // withdrawing amount * reward available / user staked amount
        uint256 unshareAmount = _amount * shareAmount[msg.sender] / stakedAmount[msg.sender];
        stakedAmount[msg.sender] -= _amount;
        shareAmount[msg.sender] -= unshareAmount;
        totalShareAmount -= unshareAmount;
        
        // burn received token
        reToken.transferFrom(msg.sender, address(this), _amount);
        reToken.burnToken(address(this), _amount);

        //create unbond request event
        UnbondData memory data = UnbondData(
            msg.sender,
            _amount
        );
        unbondRequests.push(data);

        emit Unbond(msg.sender, _amount);
    }

    function updateReward(uint256 _amount) public onlyOwner {
        for (uint256 i = 0; i < addressList.length; i++) {
            updateAccountReward(addressList[i], _amount);
        }
    }

    function updateAccountReward(address _account, uint256 _amount) private {
        // uint dailyReward = _amount * balanceOf[_account] / totalSupply - _amount * balanceOf[_account] / totalUnstaked;
        uint256 dailyReward = _amount * shareAmount[_account] / totalShareAmount;
        
        // update info
        rewardAmount[_account] += dailyReward;
        stakedAmount[_account] += dailyReward;
        shareAmount[_account] += dailyReward;
        totalShareAmount += dailyReward;
    }

    function receiveReward() external nonReentrant {
        require(rewardAmount[msg.sender] > 0, "cannot withdraw");
        if (rewardAmount[msg.sender] > 0) {
            // rewardsToken을 msg.sender 에 제공
            reToken.mintToken(address(this), rewardAmount[msg.sender]);
            reToken.transfer(msg.sender, rewardAmount[msg.sender]);
            rewardAmount[msg.sender] = 0;
        }
    }


    // update validator reward
    function updateValidatorReward(address _account, uint256 _amount)  public onlyOwner nonReentrant { 
        validatorRewardAmount[_account] += _amount;
    }

    // validator withdraw token
    function receiveRewardValidator() external nonReentrant {
        require(validatorRewardAmount[msg.sender] > 0, "cannot receive");
        
        validatorClaimedAmount[msg.sender] += validatorRewardAmount[msg.sender];
        reToken.mintToken(address(this), validatorRewardAmount[msg.sender]);
        reToken.transfer(msg.sender, validatorRewardAmount[msg.sender]);
        validatorRewardAmount[msg.sender] = 0;
        
    }

    //validator withdraw native token
    function withdrawValidator(uint256 _amount)
        external
        nonReentrant
    {
        require(validatorClaimedAmount[msg.sender] > _amount, "cannot withdraw");
        
        //burn reward token
        reToken.transferFrom(msg.sender, address(this), _amount);
        reToken.burnToken(address(this), _amount);

        validatorClaimedAmount[msg.sender] -= _amount;

        address receiver = msg.sender;
        (bool sent, ) = receiver.call{value: _amount}("");
        require(sent, "Failed to send");
    }

  
    function addValidatorAddress(string memory _validatorAddress) public {
        validatorAddresses[_validatorAddress] = 0;
        validatorRequests[msg.sender] = _validatorAddress;
        emit UpdateRequest(_validatorAddress);
    }

    function setValidatorAddress(string memory _validatorAddress, uint256 _result) public {
        // if proper address = 1
        validatorAddresses[_validatorAddress] = _result;
    }

    function setUnbondingTime(uint256 _period) public onlyOwner {
        unbondingTime = _period;
    }

    function addAddressList(address _account) public {
        if (!exists(_account)) {
            addressList.push(_account);
            totalAddressNumber++;
        }
    }

    function getTotalUnbondRequests() public view returns (uint256) {
        return unbondRequests.length;
    }

    function popFromUnbondRequest(uint256 index) private {
        // UnbondData memory element = unbondRequests[index];
        for (uint256 i = index; i < unbondRequests.length - 1; i++) {
            unbondRequests[i] = unbondRequests[i + 1];
        }
        delete unbondRequests[unbondRequests.length - 1];
    }

    function exists(address _account) public view returns (bool) {
        for (uint256 i = 0; i < addressList.length; i++) {
            if (addressList[i] == _account) {
                return true;
            }
        }
        return false;
    }

    function convertBytesToUint(bytes calldata _data) private pure returns (uint256) {
        uint256 number;
        for(uint i=0;i<_data.length;i++){
            number = number + uint(uint8(_data[i]))*(2**(8*(_data.length-(i+1))));
        }
        return number;
    }
}

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount)
        external
        returns (bool);
    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
    function mintToken(address account, uint256 amount) external;
    function burnToken(address account, uint256 amount) external;
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}