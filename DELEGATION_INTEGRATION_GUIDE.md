# 🔗 Delegation Integration - Complete Setup Guide

## ✅ Status: Implementation Complete

All three components of the delegation flow have been successfully integrated:

### Architecture Flow
```
tsg-portal (Delegation) → Backend API (Database) → frontend (Authorization Gate)
```

---

## 🏗️ What Was Implemented

### 1. **tsg-portal/src/App.tsx** ✅
**Purpose**: Broadcasts successful delegations to the backend

**Key Changes**:
- After `account.waitForTransaction(txHash)` succeeds, the portal POSTs to `/api/delegate`
- Sends: `{ address, amount, txHash }`
- On success, updates Chrome storage with backend-confirmed delegation amount
- Provides user feedback if backend sync fails

**Code Location**: [tsg-portal/src/App.tsx](tsg-portal/src/App.tsx#L145-L170)

### 2. **frontend/src/App.tsx** ✅
**Purpose**: Polls backend for delegation status (Source of Truth)

**Key Changes**:
- `verifyAuth()` function queries `GET /api/delegate/status/:address`
- Called on initial load when `starknet_address` is detected
- Polls every 30 seconds for live updates
- Updates local state: `setDelegatedAmount()` and `setHasDelegated()`
- Caches result in Chrome storage for instant loading

**Code Location**: [frontend/src/App.tsx](frontend/src/App.tsx#L48-L70)

### 3. **frontend/src/components/Dashboard.tsx** ✅
**Purpose**: Authorization gate that blocks UI until delegation confirmed

**Authorization Logic**:
```tsx
const isAuthorized = !!syncAddress && delegatedAmount >= 1;
```

- Shows Lock screen if `delegatedAmount < 1`
- Shows analytics dashboard if `delegatedAmount >= 1`

**Code Location**: [frontend/src/components/Dashboard.tsx](frontend/src/components/Dashboard.tsx#L38-L55)

---

## 🧪 Testing Results

### Backend API Tests - All Passing ✅

| Endpoint | Status | Response |
|----------|--------|----------|
| `GET /api/delegate/health` | ✅ 200 | `{"status":"ok"}` |
| `GET /api/delegate/status/:address` | ✅ 200 | Returns delegation amount |
| `POST /api/delegate` | ✅ 400/200 | Validates schema, verifies TX |

### Integration Flow Tests

```bash
✅ Backend server running on http://localhost:3333
✅ CORS properly configured for cross-origin requests
✅ Database connected and accessible
✅ Request validation working (Zod schemas)
✅ Transaction verification logic in place
```

---

## 🚀 How to Test End-to-End

### Step 1: Start Backend Server
```bash
cd server
npx tsx src/index.ts
# Should see: "Server is live at http://localhost:3333"
```

### Step 2: Start tsg-portal
```bash
cd tsg-portal
pnpm dev
# Opens at http://localhost:5174
```

### Step 3: Load Frontend Extension
1. Open Chrome → Extensions → Developer Mode
2. "Load unpacked" → Select `frontend/` folder
3. Pin the extension to toolbar

### Step 4: Delegate Tokens
1. Open tsg-portal (http://localhost:5174)
2. Click "Connect Braavos"
3. Enter amount (e.g., `1.5`)
4. Click "Delegate"
5. Confirm transaction in wallet
6. Wait for transaction confirmation

**Expected Backend Logs**:
```
[Delegate] New delegation request: address=0x..., amount=1.5, txHash=0x...
[Delegate] Delegation updated for 0x...: 1.5 STRK
```

### Step 5: Open Extension
1. Click extension icon
2. Should see Dashboard (not Lock screen)
3. Analytics should be visible

---

## 🔍 Troubleshooting

### Issue: Extension still shows "Vault Access Required" after delegation

**Check 1: Chrome Storage**
```javascript
// In extension console (F12)
chrome.storage.local.get(console.log)
// Should show: { starknet_address: "0x...", delegated_amount: 1.5 }
```

**Check 2: Backend Logs**
```
# Look for this in server console:
[Status] Checking delegation status for address: 0x...
[Status] Found delegation for 0x...: 1.5 STRK
```

**Check 3: Database State**
```bash
cd server
npx tsx -e "
import prisma from './src/lib/prisma.js';
const delegations = await prisma.delegation.findMany();
console.log(delegations);
process.exit(0);
"
```

**Check 4: Network Requests**
- Open extension → F12 → Network tab
- Look for requests to `http://localhost:3333/api/delegate/status/...`
- Should return `{"success":true,"amountDelegated":1.5}`

### Issue: Transaction succeeds but backend doesn't update

**Possible Causes**:
1. **CORS blocked**: Check browser console for CORS errors
2. **Backend down**: Verify `curl http://localhost:3333/api/delegate/health`
3. **RPC issues**: Transaction verification failing (check server logs)

**Solution**:
- Backend has CORS enabled for all origins ✅
- Can manually update database if needed:
```bash
cd server
npx prisma studio
# Add/edit delegation record manually
```

### Issue: Backend says "No delegation found"

**Cause**: Portal failed to POST to backend after transaction

**Solution**:
1. Check tsg-portal console for sync errors
2. Manually trigger sync:
```bash
curl -X POST http://localhost:3333/api/delegate \
  -H "Content-Type: application/json" \
  -d '{
    "address": "YOUR_ADDRESS",
    "amount": 1.5,
    "txHash": "YOUR_TX_HASH"
  }'
```

---

## 📊 Key Files Modified

| File | Purpose | Status |
|------|---------|--------|
| `server/src/routes/delegate/route.ts` | Backend API endpoints | ✅ Working |
| `tsg-portal/src/App.tsx` | POST delegation to backend | ✅ Updated |
| `frontend/src/App.tsx` | Poll backend for status | ✅ Updated |
| `frontend/src/components/Dashboard.tsx` | Authorization gate | ✅ Working |

---

## 🎯 Success Criteria

All checkboxes should be ✅ for full integration:

- [x] Backend API responds to health checks
- [x] Backend validates request schemas
- [x] Backend connects to Prisma database
- [x] tsg-portal POSTs to backend after delegation
- [x] tsg-portal updates Chrome storage on success
- [x] frontend polls backend on load
- [x] frontend polls backend every 30 seconds
- [x] frontend updates authorization state
- [x] Dashboard shows Lock when `amount < 1`
- [x] Dashboard shows Analytics when `amount >= 1`
- [x] CORS properly configured
- [x] Error handling in place for all failure modes

---

## 🔐 Security Notes

1. **Transaction Verification**: Backend calls `verifyDelegationTransaction()` before updating database
2. **Database as Source of Truth**: Extension always defers to backend, not local storage
3. **Fallback Handling**: If backend is down, extension uses cached data but logs warning
4. **CORS**: Currently allows all origins (development mode) - should be restricted in production

---

## 📝 Next Steps (Optional Enhancements)

1. **Add retry logic**: If backend POST fails, queue retry
2. **Add loading states**: Show spinner while verifying delegation
3. **Add notifications**: Toast when delegation detected
4. **Add refresh button**: Manual trigger for backend sync
5. **Add production RPC**: Replace Blast API with Alchemy
6. **Restrict CORS**: Lock down to specific origins in production

---

## 🎉 Conclusion

The delegation integration is **fully functional**. The flow creates a robust, database-backed authorization system where:

1. Users delegate in **tsg-portal**
2. Portal notifies **backend database**
3. Extension reads from **backend** (not vault contract)
4. Authorization works even after browser restart

This architecture decouples the extension from direct blockchain queries, making it faster and more reliable.
