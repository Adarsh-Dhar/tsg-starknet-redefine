# Score-Based STRK Transfer System - Complete Implementation

## Overview

A fully automated tokenomics system that:
- **Deducts 0.01 STRK** for every 100-point increase in the user's brainrot score
- **Refunds 0.01 STRK** for every 100-point decrease in the user's brainrot score
- **Automatic execution** when score crosses 100-point multiples
- **Smart refund tracking** - only refunds STRK that was previously deducted
- **Blockchain transactions** using StarkNet vault contract's `slash()` and `transfer()` functions
- **Persistent transaction history** with error handling

## Architecture

### Backend (Server)

**New Endpoint: `/api/score-transfer`**

#### POST `/api/score-transfer/deduct`
Deducts STRK from user's vault balance when score increases.

**Request:**
```json
{
  "userAddress": "0x...",
  "scoreIncrease": 100  // Score change amount (must be ≥ 100)
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

**Response (Error - Insufficient Vault Balance):**
```json
{
  "success": false,
  "error": "INSUFFICIENT_FUNDS_OR_NOT_AUTHORIZED",
  "message": "Vault has insufficient STRK balance for this deduction"
}
```

**Mechanics:**
- Calculates buckets crossed: `Math.floor(scoreIncrease / 100)`
- Amount to deduct: `bucketsCrossed × 0.01 STRK`
- Calls vault contract's `slash(user, amount)` function via server account
- Server must have `STARKNET_PRIVATE_KEY` environment variable configured
- Records transaction in database with status 'success' or 'failed'

#### POST `/api/score-transfer/refund`
Refunds STRK to user's wallet when score decreases.

**Request:**
```json
{
  "userAddress": "0x...",
  "scoreDecrease": 100  // Score change amount (must be ≥ 100)
}
```

**Response (Success):**
```json
{
  "success": true,
  "txHash": "0x...",
  "amount": 0.01,
  "bucketsCrossed": 1,
  "availableRefund": 0.04  // Remaining refundable balance
}
```

**Response (Error - Refund Exceeds Deducted):**
```json
{
  "success": false,
  "error": "INSUFFICIENT_REFUNDABLE_BALANCE",
  "message": "Cannot refund 0.010000 STRK. Only 0.000000 STRK available to refund.",
  "availableRefund": 0
}
```

**Mechanics:**
- Calculates buckets crossed: `Math.floor(scoreDecrease / 100)`
- Amount to refund: `bucketsCrossed × 0.01 STRK`
- Validates that total refundable amount ≤ total deducted
- Calls vault contract's `transfer(user, recipient, amount)` function where recipient = user (sends back to wallet)
- Records transaction in database with status 'success' or 'failed'

### Frontend (Dashboard)

**New State Variables:**
- `scoreTransferError: string | null` - Error message from last transfer
- `scoreTransferPending: boolean` - Whether transfer is in progress
- `lastScoreTransferTx: string | null` - TX hash of most recent successful transfer
- `processedBucketsRef` - Tracks which buckets have been processed

**New Hook: Score Bucket Detection**

```typescript
useEffect(() => {
  const currentBucket = Math.floor(brainrotScore / 100);
  const previousBucket = previousScoreBucketRef.current;

  if (currentBucket === previousBucket) return;

  const bucketDelta = currentBucket - previousBucket;
  const scoreChange = Math.abs(bucketDelta) * 100;
  const isScoreIncrease = bucketDelta > 0;

  // Call /api/score-transfer/deduct or /api/score-transfer/refund
}, [brainrotScore, address]);
```

**UI Components:**
- **Pending State Card**: Shows "⚡ Processing Score Transfer" with animated spinner
- **Error State Card**: Displays error message in red when transfer fails
- **Success State Card**: Shows TX hash with link to Voyager explorer

### Smart Contract Integration

**Vault Contract Functions Used:**

1. **`slash(user: ContractAddress, amount: u256)`**
   - Deducts tokens from user's vault balance
   - Transfers tokens to server (delegate) address
   - Only callable by server
   - Reverts with "INSUFFICIENT_FUNDS" if user has insufficient balance

2. **`transfer(user: ContractAddress, recipient: ContractAddress, amount: u256)`**
   - Transfers from user's vault balance to recipient
   - Can be used for refunds by setting recipient = user
   - Only callable by server
   - Reverts with "INSUFFICIENT_FUNDS" if user has insufficient balance

**Server Account Setup:**
```typescript
const signer = new Signer(SERVER_PRIVATE_KEY);
const account = new Account({
  provider: new RpcProvider({ nodeUrl: RPC_URL }),
  address: SERVER_ADDRESS,
  signer: signer,
});

const result = await account.execute(call);
```

## Transaction Flow Diagram

### Score Increase Flow
```
User's brainrot score increases → Frontend detects 100-point bucket
→ Calls POST /api/score-transfer/deduct
→ Server executes vault.slash(userAddress, 0.01 STRK)
→ Server transaction signed and submitted
→ TX recorded in database
→ TX hash returned to frontend
→ Frontend displays success card with TX link
```

### Score Decrease Flow
```
User's brainrot score decreases → Frontend detects 100-point bucket
→ Calls POST /api/score-transfer/refund
→ Server validates refundable balance available
→ Server executes vault.transfer(userAddress, userAddress, 0.01 STRK)
→ Server transaction signed and submitted
→ TX recorded in database
→ TX hash returned to frontend
→ Frontend displays success card with TX link
```

### Error Handling Flow
```
Score change detected
→ API call fails (network, vault balance, permissions)
→ Error response with message returned to frontend
→ Frontend displays error card with explanation
→ Mock TX hash created and recorded with status 'failed'
→ User can retry or check vault balance
```

## Database Schema

**TransactionHistory Table** (Prisma):
```
- id: String (UUID)
- txHash: String (unique)
- address: String (user address)
- amount: Float (STRK amount: 0.01, 0.02, 0.03, etc.)
- type: String ("deduct", "refund", "deposit", "slash", "reclaim")
- status: String ("success", "failed", "pending", "reverted")
- timestamp: DateTime (auto-set to now)
```

**Query Refundable Balance:**
```sql
SELECT 
  SUM(CASE WHEN type = 'deduct' AND status = 'success' THEN amount ELSE 0 END) AS totalDeducted,
  SUM(CASE WHEN type = 'refund' AND status = 'success' THEN amount ELSE 0 END) AS totalRefunded
FROM TransactionHistory
WHERE address = userAddress;

availableRefund = totalDeducted - totalRefunded;
```

## Configuration

**Environment Variables (Server):**
```bash
STARKNET_RPC_URL=https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/...
VAULT_ADDRESS=0x032490c26a49c74f927669b9d5958aa7db74398d0e55b92a10d952c32e0c2630
STARKNET_ACCOUNT_ADDRESS=0x4a05d15f240be02f13ef2e09349a668f2faa7942cbde11008b737111c9351f3
STARKNET_PRIVATE_KEY=0x...  # Server's private key for signing transactions
```

**Network:**
- Starknet Sepolia Testnet
- Voyager Explorer: https://sepolia.voyager.online/

## Testing

### Run Test Suite
```bash
chmod +x test-score-transfer.sh
./test-score-transfer.sh
```

### Individual Tests

**Test 1: Score Increase Deduction**
```bash
curl -X POST http://localhost:3333/api/score-transfer/deduct \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x0096d8b32e698b312acb1d3c493f80d7e7dcf98a1376d8691adeb2463346291f",
    "scoreIncrease": 100
  }'
```

**Test 2: Score Decrease Refund**
```bash
curl -X POST http://localhost:3333/api/score-transfer/refund \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x0096d8b32e698b312acb1d3c493f80d7e7dcf98a1376d8691adeb2463346291f",
    "scoreDecrease": 100
  }'
```

**Test 3: View Transaction History**
```bash
curl http://localhost:3333/api/delegate/history/0x0096d8b32e698b312acb1d3c493f80d7e7dcf98a1376d8691adeb2463346291f?limit=10
```

### Expected Test Results

✅ **Deduction calls** execute slash() function on vault
✅ **Refund calls** execute transfer() function on vault
✅ **Error handling** prevents refunds exceeding deducted amount
✅ **Transaction tracking** records all attempts in database
✅ **TX hashes** returned for successful transactions
✅ **Frontend UI** updates with pending/success/error states
✅ **Voyager links** provided for viewing transactions on-chain

## Key Features

### ✅ Automatic Execution
- No manual user action required
- Triggered automatically by score changes
- Dashboard monitors score in real-time

### ✅ Atomic Transactions
- Each 100-point bucket results in exactly one blockchain transaction
- All-or-nothing: transaction succeeds or fails completely
- No partial deductions or refunds

### ✅ Smart Refund Logic
- Tracks total deducted vs total refunded per user
- Prevents refunding more than originally deducted
- Supports multiple refunds across different score cycles

### ✅ Error Resilience
- Mock transactions created if server not configured with private key
- Failed transactions recorded with status 'failed'
- User sees clear error messages in dashboard
- Can retry manually if needed

### ✅ Real-time UI Feedback
- Pending state while transaction is executing
- Success state with TX hash and Voyager link
- Error state with clear explanation
- All states auto-update when score changes

### ✅ Server Authorization
- Only server (delegate) can execute slash and transfer
- Smart contract validates caller is delegate
- Prevents unauthorized token movements

### ✅ Transparent History
- All transactions visible in `/api/delegate/history`
- Tracks type, amount, status, timestamp
- Queryable per user address

## Deployment Checklist

- [ ] Set `STARKNET_PRIVATE_KEY` environment variable
- [ ] Set `STARKNET_ACCOUNT_ADDRESS` environment variable
- [ ] Verify `VAULT_ADDRESS` is deployed on Sepolia
- [ ] Build server: `npm run build`
- [ ] Start server: `npm start`
- [ ] Test endpoints with provided test script
- [ ] Deploy frontend changes to extension/webapp
- [ ] Monitor transaction history for successful TXs
- [ ] Verify error handling with edge cases

## Files Modified

### Backend
- [server/src/routes/score-transfer/route.ts](server/src/routes/score-transfer/route.ts) - New endpoints
- [server/src/index.ts](server/src/index.ts) - Registered router

### Frontend
- [frontend/src/components/Dashboard.tsx](frontend/src/components/Dashboard.tsx) - Score detection and UI

## Git Commit Message

```
feat: Implement automatic score-based STRK transfers

- Add /api/score-transfer/deduct endpoint for score increases (0.01 STRK per 100 points)
- Add /api/score-transfer/refund endpoint for score decreases (0.01 STRK refunded)
- Integrate with vault contract slash() and transfer() functions
- Add smart refund validation to prevent over-refunding
- Update Dashboard.tsx with score bucket detection and UI feedback
- Implement pending/success/error states with TX hash display
- Add transaction history tracking to database
- Create comprehensive test suite

Score increases trigger automatic 0.01 STRK deductions from vault balance.
Score decreases trigger automatic 0.01 STRK refunds to user's wallet.
All transactions require score to be at 100-point multiples (100, 200, 300, etc.).
```

## Future Enhancements

- [ ] Configurable deduction amount (currently fixed at 0.01 STRK)
- [ ] Configurable score bucket size (currently fixed at 100 points)
- [ ] Batching multiple transfers into single transaction
- [ ] Gas optimization for high-frequency users
- [ ] Analytics dashboard for aggregate transfers
- [ ] Whitelisting for exempt users
- [ ] Pause/resume mechanism for emergency situations
