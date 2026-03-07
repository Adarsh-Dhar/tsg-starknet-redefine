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
scarb build

if [ ! -f "target/dev/grass_vault_GravityVault.contract_class.json" ]; then
    echo "❌ Contract build failed"
    exit 1
fi

echo "✅ Contract built successfully"
echo ""

# Get class hash
echo "📋 Calculating class hash..."
cd /Users/adarsh/Documents/touch-some-grass/grass_vault
CLASS_HASH=$(sncast utils class-hash --contract-name GravityVault 2>&1 | grep "^0x" | head -1)
cd /Users/adarsh/Documents/touch-some-grass
echo "✅ Class Hash: $CLASS_HASH"
echo ""

# Deploy parameters
DELEGATE_ADDR="0x4a05d15f240be02f13ef2e09349a668f2faa7942cbde11008b737111c9351f3"
STRK_TOKEN="0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"

echo "🔐 Deployment Parameters:"
echo "   Class Hash:   $CLASS_HASH"
echo "   Delegate:     $DELEGATE_ADDR"
echo "   STRK Token:   $STRK_TOKEN"
echo ""

echo "⏳ Deploying contract..."
echo ""

# Deploy using sncast
DEPLOY_OUTPUT=$(sncast deploy \
    --contract-name GravityVault \
    --constructor-calldata $DELEGATE_ADDR $STRK_TOKEN \
    --account mainuser \
    --accounts-file account-file \
    --rpc https://starknet-sepolia.public.blastapi.io 2>&1)

echo "$DEPLOY_OUTPUT"

# Extract contract address - look for patterns like "deployed at 0x..."
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP '0x[0-9a-f]{63}' | tail -1)

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo "❌ Deployment failed"
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
