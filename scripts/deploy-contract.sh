#!/usr/bin/env bash
# Deploy GravityVault contract to Starknet Sepolia
# This script uses sncast for deployment

set -e

echo "🚀 GravityVault Contract Deployment"
echo "===================================="
echo ""

# Check if sncast is installed
if ! command -v sncast &> /dev/null; then
    echo "❌ sncast not found. Installing Starknet Foundry..."
    curl -L https://raw.githubusercontent.com/foundry-rs/starknet-foundry/master/scripts/install.sh | sh
    echo "⚠️  Please restart your terminal and run this script again"
    exit 1
fi

cd "$(dirname "$0")/../grass_vault"

echo "📝 Building contract..."
scarb build --release

if [ ! -f "target/release/grass_vault_GravityVault.contract_class.json" ]; then
    echo "❌ Contract build failed"
    exit 1
fi

echo "✅ Contract built successfully"
echo ""

# Get class hash
echo "📋 Calculating class hash..."
CLASS_HASH=$(sncast class-hash target/release/grass_vault_GravityVault.contract_class.json)
echo "✅ Class Hash: $CLASS_HASH"
echo ""

# Deploy parameters
DELEGATE_ADDR="0x4a05d15f240be02f13ef2e09349a668f2faa7942cbde11008b737111c9351f3"
STRK_TOKEN="0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd79d119e0e7a16711ee015c3c"

echo "🔐 Deployment Parameters:"
echo "   Class Hash:   $CLASS_HASH"
echo "   Delegate:     $DELEGATE_ADDR"
echo "   STRK Token:   $STRK_TOKEN"
echo ""

echo "⏳ Deploying contract..."
echo ""

# Deploy using sncast
DEPLOY_OUTPUT=$(sncast deploy $CLASS_HASH \
    $DELEGATE_ADDR \
    $STRK_TOKEN \
    --account mainuser \
    --accounts-file ../account-file \
    --rpc https://starknet-sepolia.public.blastapi.io)

# Extract contract address
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP '0x[0-9a-f]{63}' | head -1)

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo "❌ Deployment failed"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo "✅ Contract deployed successfully!"
echo ""
echo "📌 New Contract Address:"
echo "   $CONTRACT_ADDRESS"
echo ""

# Update .env
ENV_FILE="../server/.env"
if grep -q "VAULT_ADDRESS=" "$ENV_FILE"; then
    sed -i '' "s|VAULT_ADDRESS=.*|VAULT_ADDRESS=$CONTRACT_ADDRESS|" "$ENV_FILE"
else
    echo "VAULT_ADDRESS=$CONTRACT_ADDRESS" >> "$ENV_FILE"
fi

echo "✅ Updated $ENV_FILE"
echo ""

# Restart server
echo "🔄 Restarting server..."
pkill -f "node dist/index.js" || true
sleep 2
cd ../server
pnpm build
pnpm start &

echo ""
echo "🎉 Deployment complete!"
echo "   Contract: $CONTRACT_ADDRESS"
echo "   Updated:  server/.env"
echo "   Status:   Server restarted"
