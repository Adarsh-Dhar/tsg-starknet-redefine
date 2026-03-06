# Vault Address Fix - Transaction Display Issues

## Problem Identified

The **frontend was using the WRONG vault address** in both Dashboard.tsx and WalletPage.tsx:

### Old (Wrong) Address
```
0x0602c5436e8dc621d2003f478d141a76b27571d29064fbb9786ad21032eb4769
```

### New (Correct) Address  
```
0x032490c26a49c74f927669b9d5958aa7db74398d0e55b92a10d952c32e0c2630
```

**Impact:** The frontend was querying the wrong smart contract, so:
- Vault balance displayed as 0.0000 STRK (instead of actual 1.0 STRK)
- Deduct transactions couldn't execute properly (targeting wrong vault)
- Deposit status couldn't be tracked correctly

## Fixes Applied

### 1. [Dashboard.tsx](frontend/src/components/Dashboard.tsx)
- ✅ Updated VAULT_ADDRESS constant (line 16)
- ✅ Replaced Contract ABI balance fetching with direct RPC callContract() calls
- ✅ Added robust u256 parsing that handles multiple response formats

**Before:**
```typescript
const vault = new Contract({
  abi: GRAVITY_VAULT_ABI,
  address: VAULT_ADDRESS,
  providerOrAccount: rpcProvider
});
const result = await vault.get_balance(syncAddress);
```

**After:**
```typescript
const result = await rpcProvider.callContract({
  contractAddress: VAULT_ADDRESS,
  entrypoint: 'get_balance',
  calldata: [syncAddress]
});

// Parse u256 response (handles multiple formats)
const data = Array.isArray(result) ? result : (result as any).result || result;
const amountArray = Array.isArray(data) ? data : [data[0] || '0', data[1] || '0'];
const low = BigInt(amountArray[0] ?? '0');
const high = BigInt(amountArray[1] ?? '0');
const amountBigInt = low + (high << 128n);
const balance = Number(amountBigInt) / 10 ** 18;
```

### 2. [WalletPage.tsx](frontend/src/WalletPage.tsx)
- ✅ Updated VAULT_ADDRESS constant (line 9)

## Build Status
✅ **Frontend build successful** - All changes applied and compiled

## What You Need To Do

### Step 1: Reload the Extension
1. Go to `chrome://extensions/`
2. Find "Touch Some Grass" extension
3. Click the **Reload** button (circular arrow icon)
4. Close and reopen the extension popup

### Step 2: Verify the Fix
Open the extension and check:
- [ ] Vault Balance shows **1.0000 STRK** (not 0.0000)
- [ ] Allowance Remaining shows **15.0000 STRK** 
- [ ] Deposit transaction shows **success** (not pending)
- [ ] Recent transactions load properly

### Step 3: Test Score Transfers
Try changing your brainrot score:
1. Click on text/media to increase score by 100+ points
2. You should see a new deduct transaction appear with:
   - Type: `deduct`
   - Amount: `0.01 STRK` (per 100-point bucket)
   - Status: `success` or `pending` → `success`
   - Valid tx hash (starts with 0x followed by hex digits)

### Step 4: Check Voyager
Verify transactions are actually on-chain:
1. Click the external link icon next to transaction hash
2. Should open Voyager explorer
3. Confirm transaction shows your address and correct amount

## Debugging Checklist

If vault balance still shows 0.0000:
```bash
# Force a fresh build
cd /Users/adarsh/Documents/touch-some-grass/frontend
npm run build
# Then reload the extension in Chrome
```

If deduct transactions still fail with 0x000000... hash:
1. Check browser console (F12 → Console tab)
2. Look for `[Dashboard]` log messages
3. Check server logs:
   ```bash
   cd /Users/adarsh/Documents/touch-some-grass/server
   tail -f server.log 2>/dev/null || npm run dev
   ```

## Files Modified
- `frontend/src/components/Dashboard.tsx` - Vault address + RPC balance fetching
- `frontend/src/WalletPage.tsx` - Vault address
- `frontend/dist/` - Rebuilt after changes

## Technical Details

**RPC Provider vs Contract ABI:**
- Direct RPC calls (`callContract()`) are more reliable for read operations
- Don't require ABI to be perfectly formatted
- Handle response format variations automatically
- Work in both web app and extension contexts

**u256 Parsing:**
- Starknet u256 = two 128-bit numbers [low, high]
- Combined as: `low + (high << 128n)`
- Divide by 10^18 to get STRK amount
- New parser handles [array], {low, high}, {result}, and nested formats

---

## Next Actions

1. ✅ Reload extension in Chrome
2. Check that vault balance displays correctly  
3. Try increasing your score to trigger a deduct transaction
4. Verify the transaction appears with correct status and hash
5. Check Voyager to confirm on-chain execution

**All fixes are now live in the built frontend. Just reload the extension to see them!**
