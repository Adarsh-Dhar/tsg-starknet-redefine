#!/usr/bin/env python3
"""
Deploy GravityVault contract to Starknet Sepolia
"""
import json
import sys
from pathlib import Path

# Calculate class hash from Sierra contract
def calculate_class_hash(sierra_json):
    """Calculate the class hash for a Sierra contract"""
    # For now, we'll use the starknet.py library if available
    try:
        from starknet_py.hash.class_hash import compute_class_hash
        from starknet_py.serialization import ClassData
        
        class_data = ClassData.load(sierra_json)
        return compute_class_hash(class_data)
    except ImportError:
        print("❌ starknet-py not installed. Install with: pip install starknet-py")
        print("\nAlternatively, use starkli CLI:")
        print("  starkli class-hash <sierra-file>")
        sys.exit(1)

def main():
    # Paths
    script_dir = Path(__file__).parent.resolve()
    server_dir = script_dir.parent.resolve()
    workspace_dir = server_dir.parent.resolve()
    vault_dir = workspace_dir / "grass_vault"
    sierra_file = vault_dir / "target/release/grass_vault_GravityVault.contract_class.json"
    account_file = workspace_dir / "account-file"
    env_file = server_dir / ".env"
    
    print("🚀 GravityVault Deployment Script\n")
    
    # Load Sierra contract
    if not sierra_file.exists():
        print(f"❌ Sierra contract file not found: {sierra_file}")
        sys.exit(1)
    
    with open(sierra_file) as f:
        sierra_json = json.load(f)
    
    print(f"✅ Loaded Sierra contract: {sierra_file.name}")
    
    # Load account
    if not account_file.exists():
        print(f"❌ Account file not found: {account_file}")
        sys.exit(1)
    
    with open(account_file) as f:
        accounts = json.load(f)
    
    account = accounts["sepolia"]["mainuser"]
    print(f"✅ Loaded account: {account['address']}")
    
    # Calculate class hash
    try:
        class_hash = calculate_class_hash(sierra_json)
        print(f"✅ Class hash calculated: {class_hash}")
    except Exception as e:
        print(f"❌ Failed to calculate class hash: {e}")
        sys.exit(1)
    
    # Display deployment info
    print("\n" + "="*60)
    print("📋 DEPLOYMENT INFORMATION")
    print("="*60)
    print(f"\nNetwork: Starknet Sepolia")
    print(f"Account: {account['address']}")
    print(f"Class Hash: {class_hash}")
    print(f"\n🔑 Constructor Parameters:")
    print(f"  - Delegate (Server): {account['address']}")
    print(f"  - Token (STRK): 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd79d119e0e7a16711ee015c3c")
    
    print("\n" + "="*60)
    print("📝 TO DEPLOY VIA STARKLI CLI:")
    print("="*60)
    print(f"\nstarkli deploy {class_hash} \\")
    print(f"  {account['address']} \\")
    print(f"  0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd79d119e0e7a16711ee015c3c \\")
    print(f"  --account mainuser \\")
    print(f"  --rpc https://starknet-sepolia.public.blastapi.io")
    
    print("\n" + "="*60)
    print("⚠️  NEXT STEPS:")
    print("="*60)
    print("\n1. Install starkli: https://github.com/xJonathanLEI/starkli")
    print("2. Run the starkli deploy command above")
    print("3. Update .env VAULT_ADDRESS with the new contract address")
    print("4. Restart the server")

if __name__ == "__main__":
    main()
