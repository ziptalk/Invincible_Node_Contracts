## How to deploy and update contracts

# 1. Deploy contracts:
To deploy contracts, use Hardhat, a popular development environment for Ethereum-like networks. Here's an example of how to deploy contracts on the Klaytn testnet and mainnet:

```
# Klaytn testnet
npx hardhat run scripts/deployAll.ts --network klaytn_testnet

# Klaytn mainnet
npx hardhat run scripts/deployAll.ts --network klaytn_mainnet
```

# 2. Copy result addresses to address.json under deployer and stakeManager.
Once the deployment is complete, copy the contract addresses and paste them into the address.json file under the deployer and stakeManager fields.

# 3. Initialize functions in contracts:
After deploying the contracts and updating the addresses in the address.json file, initialize the functions in the contracts. Here's an example of how to do it on the Klaytn testnet and mainnet:
```
# Klaytn testnet
npx hardhat run scripts/setInit.ts --network klaytn_testnet

# Klaytn mainnet
npx hardhat run scripts/setInit.ts --network klaytn_mainnet
```

If an error occurs during the process, comment out the applied parts and rerun the remaining parts.
