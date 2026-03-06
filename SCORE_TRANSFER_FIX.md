# Score Transfer Issue - Root Cause & Fix

## Problem Summary

You're seeing **failed transactions** in the logs with status `"failed"` instead of successful on-chain transactions. The root cause is:

**❌ User has 0 STRK balance in the vault**

## Diagnosis Results

```bash
=== Vault Status ===
✓ Vault Contract holds: 7.144438 STRK tokens (sufficient!)
✗ User vault balance: 0.000000 STRK (PROBLEM!)
```

## Why Transactions Are Failing

The vault uses **internal accounting**:

1. Users must **deposit STRK to vault** first → this increases their internal balance
2. When score increases → `slash()` **deducts from internal balance**
3. When score decreases → `transfer()` refunds from vault's STRK to user

Currently:
- User's internal vault balance = **0 STRK**
- `slash()` tries to deduct from 0 → **transaction fails**
- Failed transactions get recorded in database with status `"failed"`

## The Fix

### Option 1: User Deposits via Frontend (Recommended)

The user needs to deposit STRK to the vault using their connected wallet:

1. User connects wallet with STRK tokens
2. User calls `approve()` on STRK token contract:
   ```
   Token: 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
   Spender: 0x032490c26a49c74f927669b9d5958aa7db74398d0e55b92a10d952c32e0c2630 (vault)
   Amount: 1000000000000000000 (1 STRK in wei)
   ```

3. User calls `deposit()` on vault contract:
   ```
   Vault: 0x032490c26a49c74f927669b9d5958aa7db74398d0e55b92a10d952c32e0c2630
   Amount: 1000000000000000000 (1 STRK)
   ```

### Option 2: Quick Test with Server Account

For testing purposes, you can have the server deposit on behalf of the user (requires modifying code):

```typescript
// In server, execute deposit for user
const depositCall = {
  contractAddress: STRK_TOKEN,
  entrypoint: 'approve',
  calldata: CallData.compile({
    spender: VAULT_ADDRESS,
    amount: uint256.bnToUint256(BigInt(1 * 10**18)), // 1 STRK
  }),
};

const depositVault = {
  contractAddress: VAULT_ADDRESS,
  entrypoint: 'deposit',
  calldata: CallData.compile({
    amount: uint256.bnToUint256(BigInt(1 * 10**18)),
  }),
};

await serverAccount.execute([depositCall, depositVault]);
```

## Expected Flow After Fix

Once user has vault balance ≥ 0.01 STRK:

1. **Score increases by 100+**:
   - Frontend detects bucket change
   - Calls `POST /api/score-transfer/deduct`
   - Server calls `vault.slash(user, 0.01 STRK)`
   - ✅ Transaction succeeds
   - User's vault balance: `previous - 0.01 STRK`

2. **Score decreases by 100+**:
   - Frontend detects bucket change
   - Calls `POST /api/score-transfer/refund`
   - Server calls `vault.transfer(user, user, 0.01 STRK)`
   - ✅ Transaction succeeds
   - STRK sent from vault back to user's wallet

## Verification

After depositing, run this to confirm:

```bash
cd server
npx tsx scripts/check-balances.ts
```

Expected output:
```
✓ Vault Contract holds: 7.144438 STRK tokens
✓ User has: 1.000000 STRK in vault  ← Should be > 0

✅ All systems go! Vault and user are both funded.
```

## Why This Design?

The vault pattern is a **custody model** where:
- Users deposit funds to vault (like a bank account)
- Vault holds the actual STRK tokens
- Vault tracks each user's balance internally
- Score changes modify internal balances
- Users can withdraw their balance anytime

This is safer than directly transferring STRK on every score change because:
1. Gas efficient (internal accounting vs ERC20 transfers)
2. Atomic operations (score + balance update together)
3. Admin control (vault owner can manage funds)

## Next Steps

1. **Add deposit UI** to frontend (if not already present)
2. **Prompt user to deposit** before score tracking begins
3. **Show vault balance** in UI so user knows their available balance
4. **Handle insufficient balance** gracefully (show warning if balance < 0.01 STRK)

## Files Modified

- ✅ Backend: `/server/src/routes/score-transfer/route.ts` - already complete
- ✅ Frontend: `/frontend/src/components/Dashboard.tsx` - already complete  
- ❌ Missing: Deposit flow in frontend UI

## Testing

Once user deposits 1 STRK:

```bash
# Test deduction
curl -X POST http://localhost:3333/api/score-transfer/deduct \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x0096d8b32e698b312acb1d3c493f80d7e7dcf98a1376d8691adeb2463346291f",
    "scoreIncrease": 150
  }'

# Should return:
# {
#   "success": true,
#   "txHash": "0x...", ← real transaction hash
#   "amount": 0.01,
#   "bucketsCrossed": 1
# }
```
