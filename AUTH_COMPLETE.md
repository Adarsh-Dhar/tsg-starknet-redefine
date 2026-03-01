## Email/Password Authentication Flow Implementation - COMPLETE

### Overview
Implemented a complete email/password authentication system for the Touch Some Grass extension with the following flow:
1. **Login/Signup Page** → User creates account or logs in
2. **Token Storage** → JWT tokens stored in chrome.storage.local
3. **Account Check** → Verify if user has delegated ≥1 STRK
4. **Delegation Gate** → If not delegated, redirect to portal at http://localhost:5174
5. **Dashboard Access** → After delegation, user sees dashboard
6. **Logout** → Clear tokens and return to login

---

## Files Created & Modified

### 1. **Token Storage Utility** - `frontend/src/lib/tokenStorage.ts` ✅ CREATED
Manages JWT token lifecycle in chrome.storage.local:
- `getToken()` - Retrieve access token
- `getRefreshToken()` - Retrieve refresh token
- `saveTokens(token, refreshToken, email)` - Save both tokens
- `clearTokens()` - Clear all tokens on logout
- `isTokenExpired(token)` - Check if token is expired
- `decodeToken(token)` - Decode JWT payload (for debugging)
- `getAuthHeader()` - Get Authorization header value

**Storage Keys:**
- `auth_token` - JWT access token (15 minute expiry)
- `refresh_token` - JWT refresh token (7 day expiry)
- `user_email` - Logged-in user's email

---

### 2. **Server Auth Routes** - `server/src/routes/auth.ts` ✅ UPDATED
Added refresh token support:

**New Constants:**
```typescript
const JWT_SECRET = process.env.JWT_SECRET || '...'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '...'
const JWT_EXPIRES_IN = '15m'  // Changed from 7d
const JWT_REFRESH_EXPIRES_IN = '7d'
```

**Updated Endpoints:**
- `POST /api/auth/signup` - Now returns both `token` and `refreshToken`
- `POST /api/auth/login` - Now returns both `token` and `refreshToken`
- `GET /api/auth/me` - Already existed (verify user info)
- `POST /api/auth/link-wallet` - Already existed (link Starknet address)
- **`POST /api/auth/refresh`** ✅ NEW - Refresh expired access tokens

**Refresh Endpoint Details:**
```
POST /api/auth/refresh
Body: { refreshToken: string }
Response: { success: true, token: string }
```

---

### 3. **Auth Hook** - `frontend/src/hooks/useAuth.ts` ✅ CREATED
Custom React hook for managing authentication state across the app:

**Exported Interface:**
```typescript
interface UseAuthReturn {
  user: AuthUser | null          // Logged-in user info
  token: string | null           // Current access token
  loading: boolean               // Loading state during init
  isAuthenticated: boolean       // Quick auth check
  login(email, password)         // Login function
  signup(email, password)        // Signup function
  logout()                       // Logout function
  refreshToken()                 // Force token refresh
  fetchUserInfo()                // Refresh user data from server
}
```

**Features:**
- Initializes auth state from chrome.storage.local on mount
- Automatically checks token expiration and refreshes if needed
- Manages user info fetching from `GET /api/auth/me`
- Handles token refresh automatically
- Provides login/signup/logout functions

---

### 4. **Login Page** - `frontend/src/LoginPage.tsx` ✅ UPDATED
Complete rewrite with login/signup modes:

**Features:**
- Toggle between "Sign In" and "Sign Up" modes
- Email and password validation
- Confirm password field (only in signup mode)
- Loading state during API calls
- Error messages for failed auth
- API integration with `/api/auth/login` and `/api/auth/signup`
- Token storage after successful auth
- **Account check logic:**
  - Fetches user info from `GET /api/auth/me`
  - If no wallet connected OR delegation < 1 STRK: redirect to `http://localhost:5174?email={email}`
  - If delegation ≥ 1 STRK: navigate to dashboard

**Form Validation:**
- Email required
- Password required (min 6 chars)
- Confirm password must match (signup only)

---

### 5. **App Router** - `frontend/src/App.tsx` ✅ UPDATED
Integrated authentication into routing:

**Key Changes:**
- Imported `useAuth` hook
- Added loading state while checking authentication
- Shows LoginPage if not authenticated
- Shows DelegationGate if authenticated but delegation < 1 STRK
- Shows Dashboard if authenticated AND delegation ≥ 1 STRK
- Added logout button to navigation bar

**Conditional Rendering:**
```
if (loading) → Show loading spinner
if (!isAuthenticated) → Show LoginPage
if (isAuthenticated && user.amountDelegated < 1) → Show DelegationGate
if (isAuthenticated && user.amountDelegated >= 1) → Show Dashboard + nav
```

**New Component: DelegationGate**
- Shown when user is logged in but hasn't delegated yet
- Button to open `http://localhost:5174?email={email}` in new tab
- Explains delegation requirement
- Updates automatically when delegation is completed

---

### 6. **Wallet Page** - `frontend/src/WalletPage.tsx` ✅ UPDATED
Enhanced with authentication and account linking:

**New Features:**
- `useAuth` hook integration
- `linkWalletToAccount(walletAddress)` - Links Starknet wallet to user account via `POST /api/auth/link-wallet`
- `notifyDelegation(address, amount, txHash)` - Notifies backend of delegation via `POST /api/delegate`
- After successful delegation, calls `fetchUserInfo()` to update user state
- Automatic user info refresh after wallet operations

**Flow:**
1. User connects wallet or enters address manually
2. Wallet address is linked to authenticated user account
3. User delegates tokens
4. `notifyDelegation()` tells backend about the transaction
5. Backend verifies transaction and updates Delegation table
6. `fetchUserInfo()` refetches user data with updated delegation amount
7. App detects delegation ≥ 1 STRK and unlocks dashboard

---

## Database Integration

**Prisma Schema (Already Exists):**
```prisma
model User {
  id            String      @id @default(cuid())
  email         String      @unique
  password      String      // bcrypt hashed
  starknetAddr  String?     @unique
  delegation    Delegation? @relation(...)
}

model Delegation {
  id              String   @id @default(cuid())
  address         String   @unique
  amountDelegated Float    @default(0.0)
  lastUpdated     DateTime @default(now()) @updatedAt
  lastTxHash      String?
  user            User?
}
```

**How It Works:**
1. User signs up → Creates User record with email/password
2. User logs in → JWT token issued
3. User links wallet → Updates User.starknetAddr
4. User delegates → Backend updates Delegation.amountDelegated
5. App checks Delegation amount → Unlocks features if ≥ 1 STRK

---

## Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    EXTENSION STARTUP                        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                 ┌──────────────────────┐
                 │  Check Storage for   │
                 │   Refresh Token?     │
                 └──────────────────────┘
                     /           \
                    NO            YES
                   /               \
                  ▼                 ▼
            ┌─────────────┐   ┌──────────────┐
            │ Login Page  │   │ Refresh Tokn?│
            └─────────────┘   │ Valid/Expired│
                              └──────────────┘
                                 /        \
                                OK        FAIL
                               /           \
                              ▼             ▼
                         ┌─────────┐  ┌──────────┐
                         │Fetch    │  │Show Login│
                         │User Info│  │Page      │
                         └─────────┘  └──────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │Has Delegation ≥ 1 STRK?      │
              └──────────────────────────────┘
                       /           \
                      NO            YES
                     /               \
                    ▼                 ▼
          ┌──────────────────┐  ┌──────────────┐
          │ Delegation Gate  │  │ Dashboard    │
          │ (Redirect to     │  │ (Full Access)│
          │ http://localhost │  └──────────────┘
          │ :5174)           │
          └──────────────────┘
                   │
                   │ (After delegation)
                   ▼
          ┌──────────────────┐
          │ User polls for   │
          │ delegation update│
          │ Dashboard unlocks│
          └──────────────────┘
```

---

## Login/Signup Modes

**LOGIN MODE:**
- Email field
- Password field
- "Sign In" button
- Toggle to "Sign Up" link

**SIGNUP MODE:**
- Email field
- Password field
- Confirm Password field
- "Create Account" button
- Toggle to "Sign In" link

---

## Token Refresh Flow

1. **Access Token Expires** (15 minute default)
2. `useAuth` hook detects expired token
3. Calls `POST /api/auth/refresh` with refresh token
4. Server validates refresh token and issues new access token
5. New token saved to chrome.storage.local
6. Requests resume automatically

**If Refresh Fails:**
- Tokens are cleared
- User redirected to login page
- Refresh token likely expired (7 days)

---

## Logout Flow

1. User clicks "Logout" button in navigation
2. Calls `logout()` from useAuth
3. Clears all tokens from chrome.storage.local
4. Sets user to null
5. App detects !isAuthenticated
6. Shows LoginPage again

---

## Error Handling

**Login/Signup Errors:**
- "Email and password are required"
- "Password must be at least 6 characters"
- "Passwords do not match"
- User already exists (signup)
- Invalid email/password (login)
- Network errors

**Account Check Errors:**
- Failed to fetch user info
- Failed to link wallet
- Failed to record delegation

All errors shown to user in red message box on form.

---

## Security Notes

1. **Passwords:** Hashed with bcrypt on server (existing implementation)
2. **Tokens:**
   - Access tokens: 15 minute expiry (short-lived)
   - Refresh tokens: 7 day expiry (long-lived)
3. **Storage:** chrome.storage.local (not vulnerable to XSS like localStorage)
4. **Token Validation:** JWT signature verified on server
5. **HTTPS:** In production, use HTTPS only (enforce in server)
6. **CORS:** Adjust CORS policy for production domain

---

## Testing the Flow

**Test Signup:**
```
1. Open extension
2. Click "Sign Up" button
3. Enter test@example.com, password123, password123
4. Click "Create Account"
5. Should show Delegation Gate (no delegation yet)
```

**Test Login:**
```
1. After signup, logout (click 🚪 button)
2. Extension shows LoginPage
3. Switch to "Sign In" mode
4. Enter test@example.com, password123
5. Should show Delegation Gate again
```

**Test Delegation:**
```
1. From Delegation Gate, click "Go to Delegation Portal"
2. http://localhost:5174 opens with email pre-filled
3. Connect wallet and delegate 1+ STRK
4. Return to extension tab
5. Dashboard should now be visible
```

**Test Token Refresh:**
```
1. Wait 15 minutes (or modify JWT_EXPIRES_IN to 1m for testing)
2. Make request to API
3. Auto-refresh should trigger silently
4. No user-facing interruption
```

---

## Next Steps (Optional)

1. **Add email verification** - Verify email before account activation
2. **Add password reset** - Allow users to reset forgot password
3. **Two-factor authentication** - SMS/TOTP for security
4. **Session management** - List active sessions, logout from others
5. **API rate limiting** - Prevent brute force attacks
6. **CORS configuration** - Adjust for production domains
7. **Environment variables** - Use .env for secrets in production

---

## Summary

✅ **Implemented:**
- Email/password signup and login with separate modes
- JWT token management with refresh mechanism
- Token storage in chrome.storage.local
- Automatic token refresh when expired
- Account/delegation verification
- Conditional routing based on delegation status
- Delegation gate UI with portal redirect
- Wallet linking to user account
- Logout functionality
- Full error handling and validation

✅ **Builds:**
- Frontend: 0 errors
- Server: 0 errors
- Ready for testing
