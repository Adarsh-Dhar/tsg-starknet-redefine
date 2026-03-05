#!/usr/bin/env python3
"""
Deploy GravityVault contract to Starknet Sepolia using the Starknet.py library
"""

import json
import sys
from pathlib import Path
from typing import Optional

def deploy_contract():
    """Deploy the GravityVault contract"""
    
    print("🚀 GravityVault Contract Deployment")
    print("=" * 60)
    print()
    
    # Check for required files
    workspace_dir = Path(__file__).parent.parent
    account_file = workspace_dir / "account-file"
    sierra_file = workspace_dir / "grass_vault" / "target" / "release" / "grass_vault_GravityVault.contract_class.json"
    env_file = workspace_dir / "server" / ".env"
    
    if not account_file.exists():
        print(f"❌ Account file not found: {account_file}")
        sys.exit(1)
    
    if not sierra_file.exists():
        print(f"❌ Sierra contract file not found: {sierra_file}")
        print("   Try: cd grass_vault && scarb build --release")
        sys.exit(1)
    
    # Load account
    with open(account_file) as f:
        accounts = json.load(f)
    
    account = accounts["sepolia"]["mainuser"]
    print("✅ Account loaded:")
    print(f"   Address: {account['address']}")
    print(f"   Type:    {account['type']}")
    print()
    
    # Load contract class
    with open(sierra_file) as f:
        contract_json = json.load(f)
    
    print("✅ Contract loaded:")
    print(f"   Network: Starknet Sepolia")
    print(f"   RPC:     https://starknet-sepolia.public.blastapi.io")
    print()
    
    # Constructor parameters
    DELEGATE = account['address']
    STRK_TOKEN = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd79d119e0e7a16711ee015c3c"
    
    print("📝 Deployment Parameters:")
    print(f"   Delegate Address: {DELEGATE}")
    print(f"   STRK Token:       {STRK_TOKEN}")
    print()
    
    print("=" * 60)
    print("⚠️  NEXT STEPS:")
    print("=" * 60)
    print()
    print("1. Install starkli (if not already installed):")
    print("   ")
    print("   # Via cargo:")
    print("   cargo install --git https://github.com/xJonathanLEI/starkli.git")
    print("   ")
    print("   # Or via homebrew (macOS):")
    print("   brew install xJonathanLEI/starkli/starkli")
    print()
    
    print("2. Calculate class hash:")
    print()
    print(f"   cd grass_vault")
    print(f"   starkli class-hash target/release/grass_vault_GravityVault.contract_class.json")
    print()
    
    print("3. Deploy the contract:")
    print()
    print("   cd ..")
    print("   starkli deploy <CLASS_HASH> \\")
    print(f"     {DELEGATE} \\")
    print(f"     {STRK_TOKEN} \\")
    print("     --account mainuser \\")
    print("     --accounts-file account-file \\")
    print("     --rpc https://starknet-sepolia.public.blastapi.io")
    print()
    
    print("4. Update .env with the new contract address:")
    print()
    print("   VAULT_ADDRESS=0x<new_contract_address>")
    print()
    
    print("5. Rebuild and restart server:")
    print()
    print("   cd server && pnpm build && pnpm start &")
    print()
    
    print("=" * 60)
    print()
    
    # Check if starkli is available
    import subprocess
    try:
        result = subprocess.run(["which", "starkli"], capture_output=True)
        if result.returncode == 0:
            print("✅ starkli is installed")
            print()
            print("You can proceed with deployment directly:")
            print()
            print("   ./scripts/deploy-contract.sh")
        else:
            print("⚠️  starkli is not in PATH")
            print("   Install it first, then run: ./scripts/deploy-contract.sh")
    except Exception as e:
        print(f"⚠️  Could not check for starkli: {e}")
    
    print()
    print("=" * 60)
    print("📚 Documentation:")
    print("   - See DEPLOYMENT_GUIDE.md for detailed instructions")
    print("   - See DEPLOYMENT_STATUS.md for current system status")
    print()

if __name__ == "__main__":
    deploy_contract()
