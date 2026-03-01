# Centralized Delegation Tracking System

This implementation adds a robust, centralized database system to track Starknet delegations across devices using Prisma 6 and PostgreSQL/SQLite.

## Architecture Overview

```
┌─────────────┐         ┌──────────────┐         ┌───────────────┐
│ tsg-portal  │────────▶│   Backend    │◀────────│   frontend    │
│  (Delegate) │  POST   │   (API +     │  GET    │  (Verify)     │
│             │         │   Database)   │         │               │
└─────────────┘         └──────────────┘         └───────────────┘
      │                        │                         │
      │                        │                         │
      ▼                        ▼                         ▼
  Starknet L2          Prisma + SQLite           Chrome Storage
                                                   (Cache Only)
```

## Implementation Details

### 1. Database Schema (Prisma 6)

**Location:** `server/prisma/schema.prisma`

```prisma
model Delegation {
  id              String   @id @default(cuid())
  address         String   @unique // Starknet Contract Address
  amountDelegated Float    @default(0.0)
  lastUpdated     DateTime @default(now()) @updatedAt
  lastTxHash      String?  // Store the last verified transaction hash
}
```

**Features:**
- Unique address indexing for fast lookups
- Automatic timestamp updates
- Transaction hash storage for verification

### 2. Backend API Routes

**Location:** `server/src/routes/delegate/route.ts`

#### POST `/api/delegate`
Called by `tsg-portal` after successful Starknet transaction.

**Request Body:**
```json
{
  "address": "0x...",
  "amount": 10.5,
  "txHash": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Delegation recorded successfully",
  "delegation": {
    "address": "0x...",
    "amountDelegated": 10.5,
    "lastUpdated": "2026-03-01T00:37:00.000Z"
  }
}
```

**Security Features:**
- Input validation using Zod schemas
- On-chain transaction verification
- Prevents fake delegation submissions

#### GET `/api/delegate/status/:address`
Called by `frontend` to verify delegation status.

**Response:**
```json
{
  "success": true,
  "address": "0x...",
  "amountDelegated": 10.5,
  "isDelegated": true,
  "lastUpdated": "2026-03-01T00:37:00.000Z",
  "lastTxHash": "0x..."
}
```

### 3. Transaction Verification

**Location:** `server/src/lib/transactionVerify.ts`

The backend verifies transactions on-chain before updating the database:

```typescript
export async function verifyDelegationTransaction(
  txHash: string,
  expectedAddress: string,
  expectedAmount: bigint
): Promise<boolean>
```

**Verification Steps:**
1. Fetch transaction receipt from Starknet RPC
2. Check transaction status (ACCEPTED_ON_L2/L1)
3. Verify vault contract interaction
4. Validate transaction authenticity

### 4. Portal Integration

**Location:** `tsg-portal/src/App.tsx`

After successful delegation:

```typescript
// Sync delegation with backend database
if (type === 'delegate') {
  await fetch('http://localhost:3333/api/delegate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: address,
      amount: parseFloat(amount),
      txHash: txHash
    })
  });
}
```

### 5. Frontend Polling

**Location:** `frontend/src/App.tsx`

The extension polls the backend every 30 seconds:

```typescript
const verifyAuth = async (address: string) => {
  const response = await fetch(`http://localhost:3333/api/delegate/status/${address}`);
  const data = await response.json();
  
  // Update local state from DB truth
  setDelegatedAmount(data.amountDelegated);
  setHasDelegated(data.isDelegated);
  
  // Cache in Chrome storage
  chrome.storage.local.set({ delegated_amount: data.amountDelegated });
};
```

**Benefits:**
- Cross-device synchronization
- Tamper-proof authorization
- Automatic recovery from cache issues

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
pnpm install
```

### 2. Configure Environment

Add to `server/.env`:
```env
DATABASE_URL="file:./dev.db"
STARKNET_RPC_URL="https://starknet-mainnet.public.blastapi.io"
VAULT_ADDRESS="0x0683bc21ada95e6c96ef268d5e28851ba6c029a743c97b6a368ec6a191bfae90"
```

### 3. Run Prisma Migration

```bash
cd server
npx prisma migrate dev --name init_delegation
```

### 4. Start the Server

```bash
cd server
pnpm run dev
```

The API will be available at `http://localhost:3333/api/delegate`.

## API Endpoints Summary

| Method | Endpoint | Purpose | Caller |
|--------|----------|---------|---------|
| POST | `/api/delegate` | Record new delegation | tsg-portal |
| GET | `/api/delegate/status/:address` | Check delegation status | frontend |
| GET | `/api/delegate/health` | Health check | Monitoring |

## Security Considerations

### Transaction Masking Prevention

The backend verifies every transaction on-chain before updating the database:

1. **Transaction Receipt Validation**: Checks if tx exists and was accepted
2. **Vault Interaction Verification**: Ensures tx interacted with correct vault contract
3. **Status Validation**: Only accepts ACCEPTED_ON_L2/L1/SUCCEEDED status

### Rate Limiting

Consider adding rate limiting to prevent abuse:

```typescript
import rateLimit from 'express-rate-limit';

const delegateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10 // limit each IP to 10 requests per windowMs
});

app.use('/api/delegate', delegateLimit);
```

## Database Migration to PostgreSQL

To migrate from SQLite to PostgreSQL (recommended for production):

1. Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Update `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/touchsomegrass"
```

3. Run migration:
```bash
npx prisma migrate dev
```

## Testing

### Test Delegation Sync

1. Start the server: `cd server && pnpm run dev`
2. Open tsg-portal and delegate STRK
3. Check logs for "Delegation synced with backend successfully"
4. Verify in database: `npx prisma studio`

### Test Frontend Polling

1. Open frontend extension
2. Check console for "Frontend: Synced delegation data from backend"
3. Verify delegation status updates automatically

## Troubleshooting

### TypeScript Compilation Issues

If you encounter module resolution errors:

```bash
cd server
npx prisma generate  # Regenerate Prisma client
pnpm run dev         # Use tsx instead of tsc
```

### Database Connection Issues

Check that `DATABASE_URL` is correctly set:

```bash
cd server
npx prisma db push  # Force sync schema
```

### CORS Issues

If frontend can't reach backend, ensure CORS is enabled in `server/src/index.ts`:

```typescript
app.use(cors({
  origin: ['chrome-extension://*', 'http://localhost:*'],
  credentials: true
}));
```

## Future Enhancements

1. **Redis Caching**: Add Redis layer for faster lookups
2. **Websockets**: Real-time delegation updates without polling
3. **Analytics**: Track delegation patterns and statistics
4. **Multi-vault Support**: Support multiple vault contracts
5. **Delegation History**: Track all delegation changes over time

## Dependencies

- `@prisma/client@6.0.0` - Prisma ORM client
- `prisma@6.0.0` - Prisma CLI tools
- `starknet@9.2.1` - Starknet.js for transaction verification
- `zod@4.3.6` - Input validation schemas

## Files Modified/Created

### Created
- `server/prisma/schema.prisma` - Database schema
- `server/prisma/migrations/*` - Migration files
- `server/src/lib/prisma.ts` - Prisma client instance
- `server/src/lib/transactionVerify.ts` - Transaction verification logic
- `server/src/routes/delegate/route.ts` - Delegation API routes

### Modified
- `server/src/index.ts` - Mount delegate router
- `server/.env` - Add database configuration
- `tsg-portal/src/App.tsx` - Add backend sync call
- `frontend/src/App.tsx` - Add polling logic

## License

This implementation follows the same license as the parent project.
