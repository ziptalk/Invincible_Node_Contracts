#!/bin/bash

##=============Testing Overall Flow==================##
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
echo "Executing claimUnstaked(user)"
npx hardhat test test/InviCore/service/claimUnstaked.test.ts --network klaytn_testnet

# Execute unstake (lpPool)
echo "Executing unstake(lpPool)"
npx hardhat test test/LiquidityProviderPool/service/unstake.test.ts --network klaytn_testnet

# wait for unstake
echo "Sleep for unstake"
sleep 70
echo "Wake up"

# Execute claim and spliting unstaked for lpPool
echo "Executing claimAndSplitUnstaked"
npx hardhat test test/InviCore/service/claimAndSplitUnstaked.test.ts --network klaytn_testnet

# Execute split unstaked (lpPool)
echo "Executing splitUnstaked(lp pool)"
npx hardhat test test/LiquidityProviderPool/service/splitUnstaked.test.ts --network klaytn_testnet

# Execute claim unstaked (lpPool)
echo "Executing claimUnstaked(lpPool)"
npx hardhat test test/LiquidityProviderPool/service/claimUnstaked.test.ts --network klaytn_testnet

# Execute claim Rewards (lpPool)
echo "Executing claimRewards(lpPool)"
npx hardhat test test/LiquidityProviderPool/service/claimRewards.test.ts --network klaytn_testnet

# Execute distributeStToken (inviCore)
echo "Executing distributeStToken(inviCore)"
npx hardhat test test/InviCore/service/distributeStToken.test.ts --network klaytn_testnet

# Execute regularMint (InviToken)
echo "Executing regularMint(InviToken)"
npx hardhat test test/InviToken/service/regularMint.test.ts --network klaytn_testnet

# Execute lending (LendingPool)
echo "Executing lending(LendingPool)"
npx hardhat test test/LendingPool/service/lend.test.ts --network klaytn_testnet

# Execute InviStake (InviStake)
echo "Executing InviStake(InviTokenStake)"
npx hardhat test test/InviTokenStake/service/stake.test.ts --network klaytn_testnet

# Execute unstake (InviStake)
echo "Executing unstake(InviTokenStake)"
npx hardhat test test/InviTokenStake/service/unstake.test.ts --network klaytn_testnet

