# ✅ How to Fix Score Transfer Transactions

## The Problem

All score transfer transactions are showing `"failed"` status because:

**User has 0 STRK balance in the vault**

## What's Happening

```
Vault Balance Check:
✓ Vault Contract: 7.144 STRK (enough funds!)
✗ User Balance: 0.000 STRK (PROBLEM!)
```

The vault system requires users to **deposit STRK first** before deductions can work:
- Score increases → `slash()` deducts from user's vault balance
- Score decreases → `transfer()` refunds from vault to user
- **Current issue**: User's vault balance = 0, so `slash()` fails

## The Solution (Simple!)

### User needs to deposit STRK to vault:

1. **Open the app** at `http://localhost:5173`

2. **Go to Wallet Page** (the page with "Delegate Tokens")

3. **Connect your wallet** (the user address shown in logs):
   ```
   0x0096d8b32e698b312acb1d3c493f80d7e7dcf98a1376d8691adeb2463346291f
   ```

4. **Enter amount** in "Amount to Delegate" field:
   - Minimum: `0.1` STRK (allows 10 score deductions of 100 points each)
   - Recommended: `1` STRK (allows 100 score deductions)

5. **Click "Delegate" button**
   - This will:
     - Approve STRK token for vault
     - Deposit STRK to vault
     - Increase your internal vault balance

6. **Wait for transaction to confirm** on Starknet

## Verify It Worked

After depositing, run this command:

```bash
cd /Users/adarsh/Documents/touch-some-grass/server
npx tsx scripts/check-balances.ts
```

You should see:
```
✓ Vault Contract holds: 7.144438 STRK tokens
✓ User has: 1.000000 STRK in vault  ← Should be > 0 now!

✅ All systems go! Vault and user are both funded.
```

## Test Score Transfers

Once vault balance > 0, score transfers will work:

1. **Increase brainrot score by 100+**:
   - Automatic deduction of 0.01 STRK
   - Transaction status: `"success"`
   - Real transaction hash on Voyager

2. **Decrease brainrot score by 100+**:
   - Automatic refund of 0.01 STRK back to your wallet
   - Transaction status: `"success"`

## Why This Design?

The vault uses **internal accounting** (like a bank account):
- ✅ Gas efficient - no STRK transfer on every score change
- ✅ Instant - internal balance updates are instant
- ✅ Secure - vault owner controls funds
- ✅ Flexible - users can deposit/withdraw anytime

## Quick Reference

- **Vault Address**: `0x032490c26a49c74f927669b9d5958aa7db74398d0e55b92a10d952c32e0c2630`
- **STRK Token**: `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d`
- **Network**: Starknet Sepolia Testnet
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3333

## Current Status

- ✅ Backend implementation complete
- ✅ Frontend score detection working
- ✅ Vault has sufficient STRK funds
- ❌ **User needs to deposit** ← FIX THIS
- Then everything will work! 🎉

---

**TL;DR**: Go to Wallet Page → Enter amount (e.g., 1 STRK) → Click "Delegate" → Done!
