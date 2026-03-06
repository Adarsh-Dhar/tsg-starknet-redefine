import { RpcProvider} from 'starknet';
import fs from 'fs';
import path from 'path';

const RPC_URL = 'https://starknet-sepolia.public.blastapi.io';
const VAULT_ABI_PATH = path.join(process.cwd(), '../grass_vault/target/release/grass_vault_GravityVault.contract_class.json');

async function deployVault() {
  try {
    // Load the compiled contract class
    const contractJson = JSON.parse(fs.readFileSync(VAULT_ABI_PATH, 'utf-8'));
    
    console.log('📋 Contract loaded successfully');
    console.log(`   Class hash: ${contractJson.class_hash || 'N/A'}`);
    console.log(`   ABI methods: ${contractJson.abi?.filter((m: any) => m.type === 'function').length}`);

    // Create RPC provider
    const provider = new RpcProvider({ nodeUrl: RPC_URL });
    
    console.log('\n✅ Connected to RPC');
    console.log(`   Network: Starknet Sepolia`);
    console.log(`   RPC: ${RPC_URL}`);
    
    // Constructor parameters
    // delegate_addr: server's Starknet address (will need to set this)
    // token: STRK token address on Sepolia
    const STRK_TOKEN = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd79d119e0e7a16711ee015c3c';
    const SERVER_ADDRESS = process.env.STARKNET_ADDRESS || '0x06d9399f6731ffcf7187c86824b8326d2adc6a78fb4f424b12772317244112b2';
    
    console.log('\n📝 Deployment Parameters:');
    console.log(`   Server/Delegate Address: ${SERVER_ADDRESS}`);
    console.log(`   STRK Token Address: ${STRK_TOKEN}`);
    
    // NOTE: To actually deploy, we would need a funded account
    // For now, just show the contract details
    console.log('\n⚠️  Deployment Preparation Complete');
    console.log('   To deploy, you would need:');
    console.log('   1. A funded Starknet account (devnet or testnet)');
    console.log('   2. STARKNET_PRIVATE_KEY set in environment');
    console.log('   3. Run with: npx ts-node deploy-vault.ts');
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

deployVault();
