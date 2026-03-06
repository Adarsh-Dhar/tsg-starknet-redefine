import { RpcProvider, Account, Contract, uint256, Signer, CallData } from 'starknet';
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
const SERVER_ADDRESS = process.env.STARKNET_ACCOUNT_ADDRESS || '0x4a05d15f240be02f13ef2e09349a668f2faa7942cbde11008b737111c9351f3';
const SERVER_PRIVATE_KEY = process.env.STARKNET_PRIVATE_KEY || '';

const USER_ADDRESS = process.argv[2] || '0x0096d8b32e698b312acb1d3c493f80d7e7dcf98a1376d8691adeb2463346291f';
const AMOUNT = parseFloat(process.argv[3] || '1'); // Default 1 STRK

async function depositForUser() {
  console.log('=== Depositing STRK for User ===\n');
  console.log(`User: ${USER_ADDRESS}`);
  console.log(`Amount: ${AMOUNT} STRK`);
  console.log(`Vault: ${VAULT_ADDRESS}\n`);

  if (!SERVER_PRIVATE_KEY) {
    console.error('❌ STARKNET_PRIVATE_KEY not set in .env');
    process.exit(1);
  }

  try {
    const provider = new RpcProvider({ nodeUrl: RPC_URL });
    
    // Create server account
    const signer = new Signer(SERVER_PRIVATE_KEY);
    const account = new Account({
      provider: provider,
      address: SERVER_ADDRESS,
      signer: signer,
    });

    console.log(`Server account: ${SERVER_ADDRESS}\n`);

    // Convert amount to wei
    const amountWei = BigInt(Math.floor(AMOUNT * 10 ** 18));
    const amountU256 = uint256.bnToUint256(amountWei);

    console.log('Step 1: Approve STRK token for vault...');
    const approveCall = {
      contractAddress: STRK_TOKEN,
      entrypoint: 'approve',
      calldata: CallData.compile({
        spender: VAULT_ADDRESS,
        amount: amountU256,
      }),
    };

    console.log('Step 2: Deposit to vault...');
    const depositCall = {
      contractAddress: VAULT_ADDRESS,
      entrypoint: 'deposit',
      calldata: CallData.compile({
        amount: amountU256,
      }),
    };

    console.log('\nExecuting multicall transaction...');
    const result = await account.execute([approveCall, depositCall]);

    console.log(`✅ Transaction submitted!`);
    console.log(`   TX Hash: ${result.transaction_hash}`);
    console.log(`   Voyager: https://sepolia.voyager.online/tx/${result.transaction_hash}\n`);

    console.log('⏳ Waiting for transaction confirmation...');
    await provider.waitForTransaction(result.transaction_hash);

    console.log('✅ Transaction confirmed!\n');

    // Check balance after deposit
    console.log('Checking vault balance...');
    const getBalanceCalldata = CallData.compile({
      account: USER_ADDRESS,
    });

    const userVaultResult = await provider.callContract({
      contractAddress: VAULT_ADDRESS,
      entrypoint: 'get_balance',
      calldata: getBalanceCalldata,
    });

    const resultData = Array.isArray(userVaultResult) ? userVaultResult : userVaultResult.result;
    const userVaultBalanceLow = BigInt(resultData[0] || '0');
    const userVaultBalanceHigh = BigInt(resultData[1] || '0');
    const userVaultBalance = userVaultBalanceLow + (userVaultBalanceHigh << BigInt(128));
    const userVaultInStrk = Number(userVaultBalance) / 10 ** 18;

    console.log(`✅ User vault balance: ${userVaultInStrk.toFixed(6)} STRK\n`);
    console.log('🎉 Deposit successful! Score transfers should now work.\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('INSUFFICIENT')) {
      console.error('\n💡 Server account has insufficient STRK tokens.');
      console.error('   Please fund the server account with STRK tokens first.');
    }
    process.exit(1);
  }
}

depositForUser().catch(console.error);
