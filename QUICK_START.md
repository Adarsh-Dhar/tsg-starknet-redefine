# Quick Start Guide - Score-Based STRK Transfers

## What Was Built

An **automatic tokenomics system** that:
- Deducts **0.01 STRK** when user's brainrot score increases by **100 points**
- Refunds **0.01 STRK** when user's brainrot score decreases by **100 points**
- Uses StarkNet smart contract `slash()` and `transfer()` functions
- Displays transaction status in Dashboard with Voyager links
- Records all transactions in database with validation

## 1. Start the Server

```bash
cd /Users/adarsh/Documents/touch-some-grass/server

# Build
npm run build

# Start (listens on http://localhost:3333)
npm start
```

## 2. Build Frontend

```bash
cd /Users/adarsh/Documents/touch-some-grass/frontend

# Build extension and web app
npm run build
```

## 3. Test the Endpoints

### Test Deduction (Score Increase)
```bash
curl -X POST http://localhost:3333/api/score-transfer/deduct \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x0096d8b32e698b312acb1d3c493f80d7e7dcf98a1376d8691adeb2463346291f",
    "scoreIncrease": 100
  }'
```

Expected response:
```json
{
  "success": false,
  "error": "INSUFFICIENT_FUNDS_OR_NOT_AUTHORIZED",
  "message": "Vault has insufficient STRK balance for this deduction"
}
```
(Fails because vault has no STRK - expected behavior)

### Test Refund (Score Decrease)
```bash
curl -X POST http://localhost:3333/api/score-transfer/refund \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x0096d8b32e698b312acb1d3c493f80d7e7dcf98a1376d8691adeb2463346291f",
    "scoreDecrease": 100
  }'
```

Expected response:
```json
{
  "success": false,
  "error": "INSUFFICIENT_REFUNDABLE_BALANCE",
  "message": "Cannot refund 0.010000 STRK. Only 0.000000 STRK available to refund.",
  "availableRefund": 0
}
```
(Fails because nothing has been deducted yet - expected behavior)

### View Transaction History
```bash
curl http://localhost:3333/api/delegate/history/0x0096d8b32e698b312acb1d3c493f80d7e7dcf98a1376d8691adeb2463346291f
```

## 4. Run Full Test Suite

```bash
chmod +x /Users/adarsh/Documents/touch-some-grass/test-score-transfer.sh
/Users/adarsh/Documents/touch-some-grass/test-score-transfer.sh
```

This runs 7 comprehensive tests covering:
- ✅ Score increase deductions
- ✅ Multiple bucket deductions
- ✅ Score decrease refunds
- ✅ Refund validation
- ✅ Transaction history
- ✅ Error handling

## How It Works

### Dashboard Flow

```
1. User browses website/extension
   ↓
2. Brainrot score increases (e.g., 0 → 100)
   ↓
3. Dashboard detects 100-point bucket change
   ↓
4. Automatically calls POST /api/score-transfer/deduct
   ↓
5. Server executes vault.slash() function
   ↓
6. 0.01 STRK deducted from vault
   ↓
7. TX hash returned to Dashboard
   ↓
8. Dashboard shows success card with Voyager link
```

## API Endpoints

### POST /api/score-transfer/deduct
When score **increases** by 100+ points.

**Request:**
```json
{
  "userAddress": "0x...",
  "scoreIncrease": 100  // or 200, 300, etc.
}
```

**Response (Success):**
```json
{
  "success": true,
  "txHash": "0x...",
  "amount": 0.01,
  "bucketsCrossed": 1
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "INSUFFICIENT_FUNDS_OR_NOT_AUTHORIZED",
  "message": "Vault has insufficient STRK balance for this deduction"
}
```

### POST /api/score-transfer/refund
When score **decreases** by 100+ points.

**Request:**
```json
{
  "userAddress": "0x...",
  "scoreDecrease": 100  // or 200, 300, etc.
}
```

**Response (Success):**
```json
{
  "success": true,
  "txHash": "0x...",
  "amount": 0.01,
  "bucketsCrossed": 1,
  "availableRefund": 0.04
}
```

**Response (Error - Over-Refunding):**
```json
{
  "success": false,
  "error": "INSUFFICIENT_REFUNDABLE_BALANCE",
  "message": "Cannot refund 0.010000 STRK. Only 0.000000 STRK available to refund.",
  "availableRefund": 0
}
```

## Dashboard UI

The Dashboard now shows three new status cards:

### 1. Pending State
```
⚡ Processing Score Transfer
Executing 0.01 STRK transaction...
```

### 2. Success State
```
✅ Latest Transfer
View TX 0x123456...789abc on Voyager
```

### 3. Error State
```
❌ Transfer Failed
Vault has insufficient STRK balance for this deduction
```

## Database

All transactions recorded in `TransactionHistory`:

```sql
SELECT * FROM TransactionHistory 
WHERE address = '0x...' AND type IN ('deduct', 'refund')
ORDER BY timestamp DESC;
```

**Example result:**
```
txHash       | address | amount | type   | status | timestamp
─────────────────────────────────────────────────────────────
0x123456... | 0x00... | 0.01  | deduct | failed | 2026-03-06 07:53:02
0x789abc... | 0x00... | 0.02  | deduct | failed | 2026-03-06 07:52:48
```

## Configuration

### For Production Use

Set these environment variables on server:

```bash
# Required for real blockchain transactions
export STARKNET_PRIVATE_KEY="0x..."
export STARKNET_ACCOUNT_ADDRESS="0x..."

# Optional (defaults provided)
export STARKNET_RPC_URL="https://starknet-sepolia.g.alchemy.com/..."
export VAULT_ADDRESS="0x032490c26a49c74f927669b9d5958aa7db74398d0e55b92a10d952c32e0c2630"
```

Without `STARKNET_PRIVATE_KEY`, the system creates mock transactions (for testing).

## Documentation Files

- **[IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)** - Complete implementation summary
- **[SCORE_TRANSFER_IMPLEMENTATION.md](SCORE_TRANSFER_IMPLEMENTATION.md)** - Technical documentation
- **[CODE_CHANGES.md](CODE_CHANGES.md)** - Detailed code changes
- **[test-score-transfer.sh](test-score-transfer.sh)** - Automated test suite
- **[test-score-transfer-integration.sh](test-score-transfer-integration.sh)** - Integration test

## Key Features

✅ **Automatic** - No user action needed  
✅ **Precise** - Exactly 0.01 STRK per 100 points  
✅ **Smart** - Only refunds what was deducted  
✅ **Safe** - Validates all transactions  
✅ **Transparent** - Shows TX hashes and error messages  
✅ **Tracked** - All transactions logged in database  

## Next Steps

1. Set `STARKNET_PRIVATE_KEY` for production
2. Deploy vault contract to Sepolia (if not already done)
3. Start server and test endpoints
4. Deploy frontend to extension/web app
5. Monitor transaction history
6. Adjust parameters if needed (currently 0.01 STRK per 100 points)

## Troubleshooting

**"Vault has insufficient STRK balance"**
- The vault contract doesn't have STRK tokens
- Either deposit STRK to vault first, or this is expected in testing
- Check vault balance: `vault.get_balance(vaultAddress)`

**"Cannot refund - INSUFFICIENT_REFUNDABLE_BALANCE"**
- User is trying to refund more than they previously deducted
- This is correct behavior - prevents loss of funds
- Only refundable amount = totalDeducted - totalRefunded

**"Score transfer endpoint not found"**
- Server didn't restart after code changes
- Kill old process: `pkill -f "node dist/index"`
- Rebuild: `npm run build`
- Restart: `npm start`

**Private key errors**
- `STARKNET_PRIVATE_KEY` environment variable not set
- System will use mock transactions instead (for testing)
- Real transactions require valid private key

## Support

Check these files for detailed info:
- Architecture: See SCORE_TRANSFER_IMPLEMENTATION.md
- Test results: Run test-score-transfer.sh
- Integration test: Run test-score-transfer-integration.sh
- Code details: See CODE_CHANGES.md

Happy testing! 🚀
