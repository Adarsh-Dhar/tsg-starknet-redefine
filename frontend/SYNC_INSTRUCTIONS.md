# Extension Address Sync Instructions

## Problem
The Chrome Extension cannot read the Starknet address from the portal due to cross-origin security restrictions.

## Solution: Manual Sync

### Step 1: Reload the Extension
1. Open Chrome and go to `chrome://extensions/`
2. Find "Touch Some Grass" extension
3. Click the **Reload** button (🔄)

### Step 2: Sync Your Address

#### Option A: Manual Entry (Recommended)
1. Click the extension icon to open the sidebar
2. Navigate to the **Wallet** tab (bottom navigation)
3. In the "Manual Sync" section, paste your Starknet address:
   ```
   0x0096d8b32e698b312acb1d3c493f80d7e7dcf98a1376d8691adeb2463346291f
   ```
4. Click **"Sync with Extension"**
5. You'll see a confirmation alert with your delegation amount
6. Navigate back to the **Dashboard** (Home tab)

#### Option B: URL Parameter (Auto-sync)
Open the extension with the address pre-filled:
```
chrome-extension://YOUR_EXTENSION_ID/index.html#/wallet?address=0x0096d8b32e698b312acb1d3c493f80d7e7dcf98a1376d8691adeb2463346291f
```

### Step 3: Verify
Check the Dashboard - you should now see:
- ✅ `syncAddress`: Your Starknet address
- ✅ `delegatedAmount`: 15 STRK
- ✅ `hasDelegated`: true
- ✅ `isAuthorized`: true

## How It Works
1. **Portal** (localhost:5174): Reads balance from smart contract → Sends to backend database
2. **Backend** (localhost:3333): Stores delegation in PostgreSQL
3. **Extension**: Manual sync writes address to chrome.storage → App.tsx reads address → Calls backend API → Gets delegation amount

## Troubleshooting

### "No address detected in storage"
- The address hasn't been manually synced yet
- Go to Wallet tab and use the Manual Sync feature

### "Backend returned success=false"
- The address has no delegation in the database
- Go to the portal (localhost:5174) and delegate tokens first
- The portal auto-syncs to the database on every balance refresh

### Server not responding
```bash
cd /Users/adarsh/Documents/touch-some-grass/server
nohup npx tsx src/index.ts > /tmp/server.log 2>&1 &
```

### Check delegation in database
```bash
curl http://localhost:3333/api/delegate/status/YOUR_ADDRESS
```
