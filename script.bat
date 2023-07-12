@echo off

REM Execute the first command
echo Executing command1
npx hardhat test test/InviCore/service/stake.test.ts --network klaytn_testnet

REM Wait for a minute (60 seconds)
ping 127.0.0.1 -n 61 > nul

REM Execute the second command
echo Executing command2
npx hardhat 