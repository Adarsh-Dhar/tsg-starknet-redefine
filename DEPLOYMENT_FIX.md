# 🚀 Fix: Deploy Real GravityVault Contract

## Problem

The current vault address `0x0683bc21ada95e6c96ef268d5e28851ba6c029a743c97b6a368ec6a191bfae90` is **not deployed** on Starknet Sepolia. This is why you're seeing:

```
Contract is not deployed
Uninitialized Contract
```

## Solution

You need to deploy the actual contract using the account credentials you have. Here's how:

---

## Step 1: Install Starkli

Starkli is the official Starknet command-line tool for deployment.

### macOS (Homebrew)
```bash
brew install xJonathanLEI/starkli/starkli
```

### Or via Cargo
```bash
cargo install --git https://github.com/xJonathanLEI/starkli.git
```

### Verify Installation
```bash
starkli --version
```

---

## Step 2: Build the Contract

```bash
cd grass_vault
scarb build --release
```

Expected output:
```
Finished `release` profile target(s) in X seconds
```

---

## Step 3: Get the Class Hash

```bash
cd grass_vault
starkli class-hash target/release/grass_vault_GravityVault.contract_class.json
```

You'll get output like:
```
0x00a1b2c3d4e5f6... (copy this value)
```

**Save this hash - you'll need it for deployment.**

---

## Step 4: Deploy the Contract

```bash
cd ..  # Go back to workspace root

starkli deploy <CLASS_HASH> \
  0x4a05d15f240be02f13ef2e09349a668f2faa7942cbde11008b737111c9351f3 \
  0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd79d119e0e7a16711ee015c3c \
  --account mainuser \
  --accounts-file account-file \
  --rpc https://starknet-sepolia.public.blastapi.io
```

Replace `<CLASS_HASH>` with the hash from Step 3.

**Parameters explained:**
- `0x4a05d15f...` - Delegate address (your server account)
- `0x04718f5a...` - STRK token address on Sepolia
- `--account mainuser` - Use the mainuser account from account-file
- `--rpc` - Starknet Sepolia RPC endpoint

**Expected output:**
```
Contract address: 0x<NEW_CONTRACT_ADDRESS>
Transaction hash: 0x<TX_HASH>
```

**Copy the contract address** - this is your new vault address.

---

## Step 5: Update .env

Edit `server/.env`:

```diff
- VAULT_ADDRESS=0x0683bc21ada95e6c96ef268d5e28851ba6c029a743c97b6a368ec6a191bfae90
+ VAULT_ADDRESS=0x<NEW_CONTRACT_ADDRESS>
```

Replace `0x<NEW_CONTRACT_ADDRESS>` with the address from Step 4.

---

## Step 6: Rebuild and Restart Server

```bash
cd server
pnpm build
pnpm start &
```

---

## Step 7: Verify Deployment

### Check on Starknet Explorer
```
https://sepolia.starkscan.co/contract/0x<NEW_CONTRACT_ADDRESS>
```

You should now see:
- ✅ Contract class initialized
- ✅ Constructor parameters shown
- ✅ Contract functions (deposit, transfer, etc.)

### Test the Transfer Endpoint
```bash
curl -X POST http://localhost:3333/api/transfer/strk \
  -H "Content-Type: application/json" \
  -d '{
    "fromAddress": "0x1234567890abcdef...",
    "toAddress": "0x06d9399f6731ffcf7187c86824b8326d2adc6a78fb4f424b12772317244112b2",
    "amount": 0.15
  }'
```

You should get a valid transaction hash back.

---

## Troubleshooting

### "starkli: command not found"
Make sure starkli is installed and in your PATH:
```bash
which starkli
# Should return: /usr/local/bin/starkli (or similar)
```

### "account file not found"
Make sure you're in the workspace root directory:
```bash
ls account-file  # Should exist
```

### "Contract class is already declared"
This happens if the same class hash was deployed before. Use a different deployment account or salt.

### "Insufficient funds"
Your account needs enough STRK for gas. Request testnet funds:
- https://starknet-faucet.vercel.app/
- https://www.starknetjs.com/docs/signers/deploying/

---

## Quick Copy-Paste Command

Once you have starkli installed, run these commands:

```bash
# 1. Get class hash
cd grass_vault && \
CLASS_HASH=$(starkli class-hash target/release/grass_vault_GravityVault.contract_class.json) && \
echo "Class Hash: $CLASS_HASH" && \
cd ..

# 2. Deploy
starkli deploy $CLASS_HASH \
  0x4a05d15f240be02f13ef2e09349a668f2faa7942cbde11008b737111c9351f3 \
  0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd79d119e0e7a16711ee015c3c \
  --account mainuser \
  --accounts-file account-file \
  --rpc https://starknet-sepolia.public.blastapi.io

# 3. Update .env (replace with actual address from step 2)
# VAULT_ADDRESS=0x<NEW_ADDRESS>

# 4. Rebuild
cd server && pnpm build && pnpm start &
```

---

## Current Status

| Component | Status | Action |
|-----------|--------|--------|
| Smart Contract Code | ✅ Ready | No action needed |
| Backend Integration | ✅ Ready | No action needed |
| Contract Deployment | ❌ Missing | Follow steps above |
| Configuration | ⏳ Waiting | Update .env after deployment |
| Server Restart | ⏳ Waiting | Restart after .env update |

---

Once deployed, your system will be **fully operational** with real blockchain integration!
