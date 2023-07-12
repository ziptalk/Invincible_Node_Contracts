#!/bin/bash

# Execute stake command
echo "Executing stake"
npx hardhat test test/InviCore/service/stake.test.ts --network klaytn_testnet

# Wait for lock end (60 seconds)
echo "Sleep for lock period"
sleep 60
echo "Wake up"

# Execute repayNFT command
echo "Executing repayNFT"
npx hardhat test test/InviCore/service/repayNFT.test.ts --network klaytn_testnet

# Wait for unstake
echo "Sleep for unstake"
sleep 70
echo "Wake up"

# Execute claim and spliting unstaked
echo "Executing claimAndSplitUnstaked"
npx hardhat test test/InviCore/service/claimAndSplitUnstaked.test.ts --network klaytn_testnet

# Execute claim native rewards for lpPool
echo "Executing claimRewards(lpPool)"
npx hardhat test test/LiquidityProviderPool/service/claimRewards.test.ts --network klaytn_testnet

# Execute claim unstaked (user)
echo "Executing claimUnstaked"
npx hardhat test test/InviCore/service/claimUnstaked.test.ts --network klaytn_testnet

# Execute split unstaked (lpPool)
echo "Executing splitUnstaked"
npx hardhat test test/LiquidityProviderPool/service/splitUnstaked.test.ts --network klaytn_testnet

# Execute claim Rewards (lpPool)
echo "Executing claimRewards(lpPool)"
npx hardhat test test/LiquidityProviderPool/service/claimRewards.test.ts --network klaytn_testnet