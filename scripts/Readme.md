How to deploy and update contracts

1. deploy contracts
**code**
# klaytn testnet
npx hardhat run scripts/deployAll.ts --network klaytn_testnet
# klaytn mainnet
npx hardhat run scripts/deployAll.ts --network klaytn_mainnet


2. copy result addresses to address.json under deployer and stakeManager

3. initialize functions in contracts
**code**
# klaytn testnet
npx hardhat run scripts/setInit.ts --network klaytn_testnet

# klaytn mainnet
npx hardhat run scripts/setInit.ts --network klaytn_mainnet

만약 중간에 에러가 발생하면, 적용된 부분까지 주석 처리하고 나머지 다시 실행


## How to deploy and update contracts

1. Deploy contracts:

```
# Klaytn testnet
npx hardhat run scripts/deployAll.ts --network klaytn_testnet

# Klaytn mainnet
npx hardhat run scripts/deployAll.ts --network klaytn_mainnet
```

2. Copy result addresses to address.json under deployer and stakeManager.

3. Initialize functions in contracts:
```
# Klaytn testnet
npx hardhat run scripts/setInit.ts --network klaytn_testnet

# Klaytn mainnet
npx hardhat run scripts/setInit.ts --network klaytn_mainnet
```
