import { RpcProvider, CallData } from 'starknet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const RPC_URL = process.env.STARKNET_RPC_URL || 'https://starknet-sepolia.public.blastapi.io';
const VAULT_ADDRESS = process.env.VAULT_ADDRESS || '0x032490c26a49c74f927669b9d5958aa7db74398d0e55b92a10d952c32e0c2630';
const STRK_TOKEN = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
const TEST_USER = '0x0096d8b32e698b312acb1d3c493f80d7e7dcf98a1376d8691adeb2463346291f';

async function checkBalances() {
  console.log('=== Checking Vault Balance ===\n');

  const provider = new RpcProvider({ nodeUrl: RPC_URL });

  try {
    // 1. Check STRK balance of vault contract  
    console.log(`1. Checking STRK Token balance of Vault Contract:`);
    console.log(`   Vault: ${VAULT_ADDRESS}`);
    console.log(`   STRK Token: ${STRK_TOKEN}\n`);

    const balanceOfCalldata = CallData.compile({
      account: VAULT_ADDRESS,
    });

    const vaultStrkResult = await provider.callContract({
      contractAddress: STRK_TOKEN,
      entrypoint: 'balanceOf',
      calldata: balanceOfCalldata,
    });

    console.log('   Raw result:', JSON.stringify(vaultStrkResult, null, 2));

    const resultData = Array.isArray(vaultStrkResult) ? vaultStrkResult : vaultStrkResult.result;
    const vaultStrkBalanceLow = BigInt(resultData[0] || '0');
    const vaultStrkBalanceHigh = BigInt(resultData[1] || '0');
    const vaultStrkBalance = vaultStrkBalanceLow + (vaultStrkBalanceHigh << BigInt(128));
    const vaultStrkInStrk = Number(vaultStrkBalance) / 10 ** 18;
    
    console.log(`   Vault STRK Balance: ${vaultStrkInStrk.toFixed(6)} STRK`);
    console.log(`   Raw: ${vaultStrkBalance.toString()}\n`);

    // 2. Check user's vault balance (internal accounting)
    console.log(`2. Checking User's Vault Balance:`);
    console.log(`   User: ${TEST_USER}\n`);

    const getBalanceCalldata = CallData.compile({
      account: TEST_USER,
    });

    const userVaultResult = await provider.callContract({
      contractAddress: VAULT_ADDRESS,
      entrypoint: 'get_balance',
      calldata: getBalanceCalldata,
    });

    console.log('   Raw result:', JSON.stringify(userVaultResult, null, 2));

    const userResultData = Array.isArray(userVaultResult) ? userVaultResult : userVaultResult.result;
    const userVaultBalanceLow = BigInt(userResultData[0] || '0');
    const userVaultBalanceHigh = BigInt(userResultData[1] || '0');
    const userVaultBalance = userVaultBalanceLow + (userVaultBalanceHigh << BigInt(128));
    const userVaultInStrk = Number(userVaultBalance) / 10 ** 18;
    
    console.log(`   User Vault Balance: ${userVaultInStrk.toFixed(6)} STRK`);
    console.log(`   Raw: ${userVaultBalance.toString()}\n`);

    // Summary
    console.log('=== Summary ===');
    console.log(`✓ Vault Contract holds: ${vaultStrkInStrk.toFixed(6)} STRK tokens`);
    console.log(`✓ User ${TEST_USER.slice(0, 10)}... has: ${userVaultInStrk.toFixed(6)} STRK in vault\n`);

    if (vaultStrkInStrk === 0) {
      console.log('❌ PROBLEM: Vault has no STRK tokens!');
      console.log('   The vault contract needs STRK tokens to pay out.');
      console.log('   Someone needs to transfer STRK to the vault contract.\n');
    }

    if (userVaultInStrk === 0) {
      console.log('❌ PROBLEM: User has no balance in vault!');
      console.log('   User needs to deposit STRK to vault before deductions can work.');
      console.log('   The user should deposit STRK using the /api/deposit endpoint.\n');
      console.log('   Expected flow:');
      console.log('   1. User deposits STRK → vault.deposit() → increases user internal balance');
      console.log('   2. Score increases → slash() reduces user internal balance');
      console.log('   3. Score decreases → transfer() gives back from vault STRK to user\n');
    }

    if (vaultStrkInStrk > 0 && userVaultInStrk > 0) {
      console.log('✅ All systems go! Vault and user are both funded.');
      console.log('   Score transfer operations should work correctly.\n');
    } else {
      console.log('⚠️  TO FIX:');
      if (userVaultInStrk === 0) {
        console.log(`   1. User needs to deposit STRK to vault`);
        console.log(`      POST to /api/deposit with amount and user address`);
      }
      if (vaultStrkInStrk < 1) {
        console.log(`   2. Vault needs more STRK tokens for payouts`);
        console.log(`      Transfer STRK directly to vault contract: ${VAULT_ADDRESS}`);
      }
      console.log('');
    }

  } catch (error: any) {
    console.error('❌ Error checking balances:', error.message);
    console.error('Full error:', error);
  }
}

checkBalances().catch(console.error);
