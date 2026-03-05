import { RpcProvider, Account, Contract, ec, json, stark } from 'starknet';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RPC_URL = 'https://starknet-sepolia.public.blastapi.io';
const CONTRACT_PATH = path.join(__dirname, '../../grass_vault/target/release/grass_vault_GravityVault.contract_class.json');
const ACCOUNT_FILE = path.join(__dirname, '../../account-file');

// STRK token on Sepolia
const STRK_TOKEN = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd79d119e0e7a16711ee015c3c';

async function deployVault() {
  try {
    console.log('🚀 Starting GravityVault Deployment\n');

    // Load contract class
    const compiledContract = json.parse(fs.readFileSync(CONTRACT_PATH, 'utf-8'));
    console.log('✅ Contract class loaded');

    // Load account details
    const accountFile = json.parse(fs.readFileSync(ACCOUNT_FILE, 'utf-8'));
    const sepoliaAccount = accountFile.sepolia.mainuser;
    
    console.log(`✅ Account loaded: ${sepoliaAccount.address}\n`);

    // Create RPC provider
    const provider = new RpcProvider({ nodeUrl: RPC_URL });

    console.log('📋 Deployment Parameters:');
    console.log(`   RPC: ${RPC_URL}`);
    console.log(`   Account: ${sepoliaAccount.address}`);
    console.log(`   Deployer Private Key: ${sepoliaAccount.private_key.substring(0, 10)}...`);
    console.log(`   Delegate Address (Server): ${sepoliaAccount.address}`);
    console.log(`   STRK Token: ${STRK_TOKEN}\n`);

    // For demonstration, show what would be deployed
    console.log('📝 Contract Details:');
    console.log(`   Class Hash: ${compiledContract.class_hash}`);
    console.log(`   ABI Methods: ${compiledContract.abi?.filter((m: any) => m.type === 'function').length}`);

    // Constructor args: delegate_addr, token
    const constructorArgs = [
      sepoliaAccount.address,  // delegate_addr (server)
      STRK_TOKEN               // token (STRK on Sepolia)
    ];

    console.log('\n⚠️  DEPLOYMENT READY');
    console.log('   To complete deployment, use starkli CLI:');
    console.log(`\n   starkli deploy --account mainuser --keystore ../.keystore \\`);
    console.log(`     ${compiledContract.class_hash} \\`);
    console.log(`     ${sepoliaAccount.address} ${STRK_TOKEN}`);
    
    // For now, return early with deployment info
    const deploymentInfo = {
      status: 'Ready for deployment',
      network: 'Starknet Sepolia',
      classHash: compiledContract.class_hash,
      account: sepoliaAccount.address,
      constructorArgs: {
        delegate_addr: sepoliaAccount.address,
        token: STRK_TOKEN
      },
      instructions: 'Use starkli CLI to deploy this contract class'
    };

    fs.writeFileSync(
      path.join(__dirname, '../deployment-ready.json'),
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    return;

  } catch (error) {
    console.error('\n❌ Deployment failed:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

deployVault();
