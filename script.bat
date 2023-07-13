

@echo off

REM =============Testing Overall Flow==================
REM Execute stake command
echo Executing stake
start /wait cmd /c "npx hardhat test test/InviCore/service/stake.test.ts --network klaytn_testnet"

REM Wait for lock end (60 seconds)
echo Sleep for lock period
timeout /t 60 
echo Wake up

REM Execute repayNFT command
echo Executing repayNFT
start /wait cmd /c "npx hardhat test test/InviCore/service/repayNFT.test.ts --network klaytn_testnet"

REM Wait for unstake
echo Sleep for unstake
timeout /t 70 
echo Wake up

REM Execute claim and split unstaked
echo Executing claimAndSplitUnstaked
start /wait cmd /c "npx hardhat test test/InviCore/service/claimAndSplitUnstaked.test.ts --network klaytn_testnet"

REM Execute claim native rewards for lpPool
echo Executing claimRewards(lpPool)
start /wait cmd /c "npx hardhat test test/LiquidityProviderPool/service/claimRewards.test.ts --network klaytn_testnet"

REM Execute claim unstaked (user)
echo Executing claimUnstaked(user)
start /wait cmd /c "npx hardhat test test/InviCore/service/claimUnstaked.test.ts --network klaytn_testnet"

REM Execute unstake (lpPool)
echo Executing unstake(lpPool)
start /wait cmd /c "npx hardhat test test/LiquidityProviderPool/service/unstake.test.ts --network klaytn_testnet"

REM Wait for unstake
echo Sleep for unstake
timeout /t 70 
echo Wake up

REM Execute claim and splitting unstaked for lpPool
echo Executing claimAndSplitUnstaked
start /wait cmd /c "npx hardhat test test/InviCore/service/claimAndSplitUnstaked.test.ts --network klaytn_testnet"

REM Execute split unstaked (lpPool)
echo Executing splitUnstaked(lp pool)
start /wait cmd /c "npx hardhat test test/LiquidityProviderPool/service/splitUnstaked.test.ts --network klaytn_testnet"

REM Execute claim unstaked (lpPool)
echo Executing claimUnstaked(lpPool)
start /wait cmd /c "npx hardhat test test/LiquidityProviderPool/service/claimUnstaked.test.ts --network klaytn_testnet"

REM Execute claim Rewards (lpPool)
echo Executing claimRewards(lpPool)
start /wait cmd /c "npx hardhat test test/LiquidityProviderPool/service/claimRewards.test.ts --network klaytn_testnet"

REM Execute distributeStToken (inviCore)
echo Executing distributeStToken(inviCore)
start /wait cmd /c "npx hardhat test test/InviCore/service/distributeStToken.test.ts --network klaytn_testnet"

REM Execute regularMint (InviToken)
echo Executing regularMint(InviToken)
start /wait cmd /c "npx hardhat test test/InviToken/service/regularMint.test.ts --network klaytn_testnet"

REM Execute lending (LendingPool)
echo Executing lending(LendingPool)
start /wait cmd /c "npx hardhat test test/LendingPool/service/lend.test.ts --network klaytn_testnet"

REM Execute InviStake (InviStake)
echo Executing InviStake(InviTokenStake)
start /wait cmd /c "npx hardhat test test/InviTokenStake/service/stake.test.ts --network klaytn_testnet"

REM Execute unstake (InviStake)
echo Executing unstake(InviTokenStake)
start /wait cmd /c "npx hardhat test test/InviTokenStake/service/unstake.test.ts --network klaytn_testnet"
