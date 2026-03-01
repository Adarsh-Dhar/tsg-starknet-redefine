# Authentication & Delegation Integration - Implementation Complete

## Overview
Successfully migrated from storage-based flow to **identity-based authentication** with Starknet wallet delegation tracking.

## Database Schema

### User Model
```prisma
model User {
  id            String      @id @default(cuid())
  email         String      @unique
  password      String      // Hashed with bcrypt
  starknetAddr  String?     @unique
  delegation    Delegation? @relation(fields: [starknetAddr], references: [address])
}
```

### Delegation Model
```prisma
model Delegation {
  id              String   @id @default(cuid())
  address         String   @unique
  amountDelegated Float    @default(0.0)
  lastUpdated     DateTime @default(now()) @updatedAt
  lastTxHash      String?
  user            User?
}
```

## API Endpoints

### Authentication Routes (`/api/auth`)

#### 1. **POST /api/auth/signup**
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "cmm7hf2090000wvewidszbneo",
    "email": "user@example.com",
    "starknetAddr": null
  }
}
```

#### 2. **POST /api/auth/login**
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "cmm7hf2090000wvewidszbneo",
    "email": "user@example.com",
    "starknetAddr": "0x1234...",
    "amountDelegated": 5.5
  }
}
```

#### 3. **GET /api/auth/me**
Get current authenticated user information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "cmm7hf2090000wvewidszbneo",
    "email": "user@example.com",
    "starknetAddr": "0x1234...",
    "amountDelegated": 5.5,
    "lastTxHash": "manual_refresh",
    "lastUpdated": "2026-03-01T08:24:04.789Z"
  }
}
```

#### 4. **POST /api/auth/link-wallet**
Link a Starknet wallet address to the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "starknetAddr": "0x1234567890abcdef..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Wallet linked successfully",
  "user": {
    "id": "cmm7hf2090000wvewidszbneo",
    "email": "user@example.com",
    "starknetAddr": "0x1234...",
    "amountDelegated": 5.5
  }
}
```

### Delegation Routes (`/api/delegate`)

These routes remain unchanged and continue to work with the new schema:

- **POST /api/delegate** - Record delegation transaction
- **GET /api/delegate/status/:address** - Get delegation status
- **GET /api/delegate/health** - Health check

## Security Features

### Password Hashing
- Uses `bcryptjs` with salt rounds of 10
- Passwords are never stored in plain text

### JWT Authentication
- Token expires in 7 days
- Tokens include user ID and email
- Middleware validates tokens on protected routes

### Authorization
- Protected routes require valid JWT token
- Wallet addresses can only be linked once
- Email addresses must be unique

## Test Results

All integration tests pass successfully:

✅ User signup and login working  
✅ JWT authentication working  
✅ Wallet linking working  
✅ User-delegation relationship established  
✅ Authorization checks working  
✅ Wrong password rejected  
✅ Invalid tokens rejected  

## Migration Applied

```sql
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "starknetAddr" TEXT,
    CONSTRAINT "User_starknetAddr_fkey" FOREIGN KEY ("starknetAddr") 
      REFERENCES "Delegation" ("address") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_starknetAddr_key" ON "User"("starknetAddr");
```

## Next Steps for Frontend Integration

### 1. Extension (`frontend/`)
Update `App.tsx` to:
- Check for stored JWT token on load
- Call `/api/auth/me` to validate session
- Show `LoginPage` if not authenticated
- Show `Dashboard` with authorization gate if authenticated

### 2. Portal (`tsg-portal/`)
Update wallet connection flow to:
- Require user to login/signup
- Call `/api/auth/link-wallet` after wallet connection
- Include JWT token in delegation transaction requests

### 3. Authorization Flow
```
User Opens Extension
    ↓
Check JWT Token in Storage
    ↓
    ├─ No Token → Show LoginPage
    │                 ↓
    │            Login/Signup → Store Token
    │                 ↓
    └─ Has Token → Validate with /api/auth/me
                      ↓
                 Check amountDelegated
                      ↓
                      ├─ < 1 STRK → Show "Delegate Required"
                      │                  ↓
                      │             Redirect to Portal
                      │                  ↓
                      │             Connect Wallet + Link
                      │                  ↓
                      └─ ≥ 1 STRK → Show Dashboard
```

## Environment Variables

Add to `.env`:
```
JWT_SECRET=your-secret-key-change-in-production
```

**Note:** Currently using default secret. For production, generate a strong random secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Dependencies Added

```json
{
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "jsonwebtoken": "^9.0.3"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.10"
  }
}
```

## Testing

Run the comprehensive integration test:
```bash
./test-auth-integration.sh
```

Or test manually:
```bash
# Signup
curl -X POST http://localhost:3333/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Login
curl -X POST http://localhost:3333/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Get user info
curl -X GET http://localhost:3333/api/auth/me \
  -H "Authorization: Bearer <token>"

# Link wallet
curl -X POST http://localhost:3333/api/auth/link-wallet \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"starknetAddr": "0x1234..."}'
```

## Files Modified

1. [server/prisma/schema.prisma](server/prisma/schema.prisma) - Added User model
2. [server/src/routes/auth.ts](server/src/routes/auth.ts) - Created authentication routes
3. [server/src/index.ts](server/src/index.ts) - Mounted auth router
4. [test-auth-integration.sh](test-auth-integration.sh) - Comprehensive test script

## Migration Details

- **Migration Name:** `add_user_authentication`
- **Applied:** March 1, 2026
- **Status:** ✅ Complete
- **Database:** SQLite (`server/prisma/dev.db`)
