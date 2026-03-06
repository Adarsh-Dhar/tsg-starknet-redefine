import { RpcProvider, Account, Contract, uint256, Signer } from 'starknet';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const RPC_URL = process.env.STARKNET_RPC_URL || 'https://starknet-sepolia.public.blastapi.io';
const VAULT_ADDRESS = '0x032490c26a49c74f927669b9d5958aa7db74398d0e55b92a10d952c32e0c2630';
const RECIPIENT_ADDRESS = '0x06d9399f6731ffcf7187c86824b8326d2adc6a78fb4f424b12772317244112b2';
const USER_ADDRESS = '0x0096d8b32e698b312acb1d3c493f80d7e7dcf98a1376d8691adeb2463346291f';

// Backend account credentials
const SERVER_ADDRESS = process.env.STARKNET_ACCOUNT_ADDRESS || '0x4a05d15f240be02f13ef2e09349a668f2faa7942cbde11008b737111c9351f3';
const SERVER_PRIVATE_KEY = process.env.STARKNET_PRIVATE_KEY || '';

// Load vault ABI
const vaultAbiPath = path.join(
  process.cwd(),
  '../grass_vault/target/dev/grass_vault_GravityVault.contract_class.json'
);

const abiData = JSON.parse(fs.readFileSync(vaultAbiPath, 'utf-8'));
const VAULT_ABI = abiData.abi;

async function emptyVault() {
  try {
    console.log('Connecting to Starknet...');
    const provider = new RpcProvider({ nodeUrl: RPC_URL });

    // Create account
    const signer = new Signer(SERVER_PRIVATE_KEY);
    const account = new Account({
      provider: provider,
      address: SERVER_ADDRESS,
      signer: signer,
    });

    console.log('Account:', SERVER_ADDRESS);

    // Create vault contract instance
    const vaultContract = new Contract({
      abi: VAULT_ABI,
      address: VAULT_ADDRESS,
      providerOrAccount: account,
    });

    console.log('Vault contract:', VAULT_ADDRESS);

    // Get STRK token address
    const STRK_TOKEN = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

    // Check vault balance first
    console.log('\nChecking vault balance...');
    const balanceResult = await vaultContract.call('get_balance', [USER_ADDRESS]);
    const balance = uint256.uint256ToBN(balanceResult as any);
    const balanceFloat = Number(balance) / 10 ** 18;
    
    console.log(`Vault balance for ${USER_ADDRESS}: ${balanceFloat} STRK`);

    if (balanceFloat === 0) {
      console.log('Vault is already empty!');
      return;
    }

    // Transfer all funds to recipient using reclaim function
    console.log(`\nReclaiming ${balanceFloat} STRK from vault to ${RECIPIENT_ADDRESS}...`);
    
    const amountU256 = uint256.bnToUint256(balance);
    
    const result = await vaultContract.invoke('transfer', [
      USER_ADDRESS,
      RECIPIENT_ADDRESS,
      amountU256,
    ]);

    console.log('Transaction submitted!');
    console.log('Transaction hash:', result.transaction_hash);
    
    // Wait for transaction
    console.log('\nWaiting for transaction confirmation...');
    await provider.waitForTransaction(result.transaction_hash);
    
    console.log('✅ Vault emptied successfully!');
    console.log(`View transaction: https://sepolia.voyager.online/tx/${result.transaction_hash}`);

  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
  }
}

emptyVault();
