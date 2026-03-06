import { RpcProvider, CallData } from 'starknet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const RPC_URL = process.env.STARKNET_RPC_URL || 'https://starknet-sepolia.public.blastapi.io';
const STRK_TOKEN = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
const USER_ADDRESS = '0x0096d8b32e698b312acb1d3c493f80d7e7dcf98a1376d8691adeb2463346291f';

async function checkUserStrkBalance() {
  console.log('=== Checking User STRK Balance ===\n');
  console.log(`User: ${USER_ADDRESS}\n`);

  const provider = new RpcProvider({ nodeUrl: RPC_URL });

  try {
    const balanceOfCalldata = CallData.compile({
      account: USER_ADDRESS,
    });

    const result = await provider.callContract({
      contractAddress: STRK_TOKEN,
      entrypoint: 'balanceOf',
      calldata: balanceOfCalldata,
    });

    const resultData = Array.isArray(result) ? result : result.result;
    const balanceLow = BigInt(resultData[0] || '0');
    const balanceHigh = BigInt(resultData[1] || '0');
    const balance = balanceLow + (balanceHigh << BigInt(128));
    const balanceInStrk = Number(balance) / 10 ** 18;

    console.log(`User STRK Balance: ${balanceInStrk.toFixed(6)} STRK`);
    console.log(`Raw: ${balance.toString()}\n`);

    if (balanceInStrk === 0) {
      console.log('❌ User has no STRK tokens in wallet!');
      console.log('   User needs STRK tokens to deposit to vault.');
      console.log('   Get testnet STRK from: https://starknet-faucet.vercel.app/\n');
    } else {
      console.log('✅ User has STRK tokens!');
      console.log('   User can now deposit to vault from the Wallet page.\n');
    }

  } catch (error: any) {
    console.error('❌ Error checking balance:', error.message);
  }
}

checkUserStrkBalance().catch(console.error);
