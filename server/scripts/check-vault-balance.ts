import { RpcProvider, Contract, cairo } from 'starknet';
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

// Minimal STRK token ABI for balanceOf
const STRK_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [
      { name: 'account', type: 'core::starknet::contract_address::ContractAddress' },
    ],
    outputs: [{ type: 'core::integer::u256' }],
    state_mutability: 'view',
  },
];

// Minimal Vault ABI for get_balance
const VAULT_ABI = [
  {
    name: 'get_balance',
    type: 'function',
    inputs: [
      { name: 'account', type: 'core::starknet::contract_address::ContractAddress' },
    ],
    outputs: [{ type: 'core::integer::u256' }],
    state_mutability: 'view',
  },
];

async function checkVaultBalance() {
  console.log('=== Checking Vault Balance ===\n');

  const provider = new RpcProvider({ nodeUrl: RPC_URL });

  try {
    // 1. Check STRK balance held by vault contract
    console.log(`1. STRK Token Balance of Vault Contract (${VAULT_ADDRESS}):`);
    const strkContract = new Contract(STRK_ABI, STRK_TOKEN, provider);
    const vaultStrkBalanceRaw = await strkContract.balanceOf(VAULT_ADDRESS);
    const vaultStrkBalanceNumber = cairo.uint256(vaultStrkBalanceRaw);
    const vaultStrkInStrk = Number(vaultStrkBalanceNumber) / 10 ** 18;
    console.log(`   Raw: ${vaultStrkBalanceNumber.toString()}`);
    console.log(`   Formatted: ${vaultStrkInStrk.toFixed(6)} STRK\n`);

    // 2. Check user's vault balance (internal accounting)
    console.log(`2. User's Vault Balance (${TEST_USER}):`);
    const vaultContract = new Contract(VAULT_ABI, VAULT_ADDRESS, provider);
    const userVaultBalanceRaw = await vaultContract.get_balance(TEST_USER);
    const userVaultBalanceNumber = cairo.uint256(userVaultBalanceRaw);
    const userVaultInStrk = Number(userVaultBalanceNumber) / 10 ** 18;
    console.log(`   Raw: ${userVaultBalanceNumber.toString()}`);
    console.log(`   Formatted: ${userVaultInStrk.toFixed(6)} STRK\n`);

    // Summary
    console.log('=== Summary ===');
    console.log(`Vault Contract holds: ${vaultStrkInStrk.toFixed(6)} STRK tokens`);
    console.log(`User ${TEST_USER.slice(0, 10)}... has: ${userVaultInStrk.toFixed(6)} STRK in vault\n`);

    if (vaultStrkInStrk === 0) {
      console.log('⚠️  WARNING: Vault has no STRK tokens!');
      console.log('   The vault contract needs STRK tokens to execute slash() operations.');
      console.log('   Please deposit STRK to the vault contract address.\n');
    }

    if (userVaultInStrk === 0) {
      console.log('⚠️  WARNING: User has no balance in vault!');
      console.log('   User needs to deposit STRK to vault before deductions can work.');
      console.log('   Use the /api/deposit endpoint to deposit funds.\n');
    }

    if (vaultStrkInStrk > 0 && userVaultInStrk > 0) {
      console.log('✅ Vault is properly funded and user has balance!');
      console.log('   Score transfer deductions should work correctly.\n');
    }

  } catch (error: any) {
    console.error('Error checking vault balance:', error.message);
  }
}

checkVaultBalance().catch(console.error);
