@echo off
setlocal enabledelayedexpansion

REM =============Testing Overall Flow==================

for %%A in (
"test/InviCore/service/stake.test.ts,50"
"test/InviCore/service/repayNFT.test.ts,60"
"test/InviCore/service/claimAndSplitUnstaked.test.ts,0"
"test/LiquidityProviderPool/service/claimRewards.test.ts,0"
"test/InviCore/service/claimUnstaked.test.ts,0"
"test/LiquidityProviderPool/service/unstake.test.ts,70"
"test/InviCore/service/claimAndSplitUnstaked.test.ts,0"
"test/LiquidityProviderPool/service/splitUnstaked.test.ts,0"
"test/LiquidityProviderPool/service/claimUnstaked.test.ts,0"
"test/LiquidityProviderPool/service/claimRewards.test.ts,0"
"test/InviCore/service/distributeStToken.test.ts,0"
"test/InviToken/service/regularMint.test.ts,0"
"test/LendingPool/service/lend.test.ts,0",
"test/LendingPool/service/repay.test.ts,0",
"test/InviTokenStake/service/stake.test.ts,0"
"test/InviTokenStake/service/unstake.test.ts,0"
) do (
    for /f "tokens=1,2 delims=," %%B in (%%A) do (
        echo Executing %%B
        start /wait cmd /c "npx hardhat test %%B --network klaytn_testnet  && echo Waiting for 10 seconds before closing... && timeout /t 10" 
        echo Sleep for %%C seconds
        timeout /t %%C 
        echo Wake up
    )
)
