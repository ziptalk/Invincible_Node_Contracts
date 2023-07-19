## How to deploy and update contracts

# 1. Set variables in targets.ts:

Set network name, network type, upgrading contract

# 2. Deploy Contract.

```
# testnet
npx hardhat run scripts/deploy/deployAll.ts --network <network_name>_testnet

#  mainnet
npx hardhat run scripts/deploy/deployAll.ts --network <network_name>_mainnet
```

# 3. Upgrade Contract

```
# testnet
npx hardhat run scripts/upgrade/upgradeContract.ts --network <network_name>_testnet

# mainnet
npx hardhat run scripts/upgrade/upgradeContract.ts --network <network_name>_mainnet
```

# 4. Things to consider before deploying

```
# InviCore
minStakeAmount

# LiquidityProviderPool
inviRewardInterval
inviReceiveReward
minStakeAmount

# InviTokenStake
inviRewardInterval
inviReceiveReward
unstakePeriod
minStakeAmount

# Logics
lockPeriod

# InviToken
mintInterval

```
