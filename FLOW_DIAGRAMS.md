# Complete Authentication Flow - Visual Guide

## The User Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│                   USER OPENS EXTENSION                              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                ┌────────────────────────────┐
                │ useAuth Hook Initializes   │
                │ • Check chrome.storage     │
                │ • Look for auth_token      │
                └────────────────────────────┘
                     /            │            \
                    /             │             \
                   /              │              \
              NO TOKEN        TOKEN EXISTS     TOKEN EXISTS
                /                 │                \
               /                  │                 \
              ▼                   ▼                   ▼
         ┌────────┐        ┌─────────────┐    ┌──────────────┐
         │Login   │        │Check if     │    │Check if      │
         │Page    │        │Expired?     │    │Expired?      │
         └────────┘        └─────────────┘    └──────────────┘
                                 │                  │
                                 ▼                  ▼
                            NOT EXPIRED        IS EXPIRED
                                 │                  │
                                 ▼                  ▼
                        ┌──────────────────┐ ┌─────────────────┐
                        │Token is Valid    │ │Try Refresh      │
                        │Use it for API    │ │POST /auth/refresh
                        └──────────────────┘ └─────────────────┘
                                 │                  │
                                 │          ┌───────┴────────┐
                                 │          │                │
                                 │      SUCCESS          FAILURE
                                 │      │                │
                                 │      ▼                ▼
                                 │    NEW TOKEN      CLEAR TOKENS
                                 │    │              │
                                 │    └──────┬───────┘
                                 │           │
                                 └─────┬─────┘
                                       │
                                       ▼
                        ┌──────────────────────────┐
                        │ Fetch User Info          │
                        │ GET /api/auth/me         │
                        │ Returns:                 │
                        │ • User ID & email        │
                        │ • starknetAddr           │
                        │ • amountDelegated        │
                        └──────────────────────────┘
                                       │
                                       ▼
                        ┌──────────────────────────┐
                        │ Check Delegation Status  │
                        └──────────────────────────┘
                               /          \
                              /            \
                        amountDelegated  amountDelegated
                          < 1 STRK       >= 1 STRK
                            /              \
                           ▼                ▼
                  ┌──────────────────┐  ┌──────────────┐
                  │ DELEGATION GATE  │  │ DASHBOARD    │
                  │                  │  │              │
                  │ • Show message   │  │ • Neural Load│
                  │ • Link button    │  │ • Progress   │
                  │ • Redirect to:   │  │ • Navigation │
                  │ http://localhost │  │ • Logout btn │
                  │ :5174?email=...  │  │              │
                  └──────────────────┘  └──────────────┘
                           │
                           │ User goes to portal
                           │
                           ▼
                  ┌──────────────────────┐
                  │ Portal (5174)        │
                  │                      │
                  │ 1. Email pre-filled  │
                  │ 2. Connect wallet    │
                  │ 3. Enter amount      │
                  │ 4. Delegate          │
                  │ 5. Confirm TX        │
                  └──────────────────────┘
                           │
                           ▼
                  ┌──────────────────────┐
                  │ Backend verifies TX  │
                  │ POST /api/delegate   │
                  │ Updates DB:          │
                  │ Delegation.amount++  │
                  └──────────────────────┘
                           │
                           ▼
                  ┌──────────────────────┐
                  │ User Returns to      │
                  │ Extension Tab        │
                  │ (page reload or wait)
                  └──────────────────────┘
                           │
                           ▼
                  ┌──────────────────────┐
                  │ App Re-checks Auth   │
                  │ (useAuth refetch)    │
                  └──────────────────────┘
                           │
                           ▼
                  ┌──────────────────────┐
                  │ amountDelegated >=1? │
                  └──────────────────────┘
                           │
                           ▼
                  ┌──────────────────────┐
                  │ YES! 🎉             │
                  │ DASHBOARD UNLOCKED   │
                  │ Full Access!         │
                  └──────────────────────┘
```

---

## Login/Signup Flow

```
┌──────────────────────┐
│   LoginPage Shown    │
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│ User sees toggle:    │
│ "Sign In" or "Sign Up
│                      │
│ ┌────────────────┐   │
│ │ Sign In Mode   │   │
│ └────────────────┘   │
│ Email: ___           │
│ Password: ___        │
│ [Sign In button]     │
│ "Sign Up?" link      │
└──────────────────────┘
         │
         │ OR click "Sign Up?"
         │
         ▼
┌──────────────────────┐
│ ┌────────────────┐   │
│ │ Sign Up Mode   │   │
│ └────────────────┘   │
│ Email: ___           │
│ Password: ___        │
│ Confirm: ___         │
│ [Create Acct button] │
│ "Sign In?" link      │
└──────────────────────┘
         │
         │ User submits form
         │
         ▼
     ┌──────────┐
     │Validation│
     └──────────┘
      /  │  │  \
     /   │  │   \
   ✓    ✓  ✓    ✓
  Email Pass Match Min6
    │
    ├─ Missing any → Show error
    ├─ Too short   → Show error
    └─ Mismatch    → Show error
         │
         ▼
┌────────────────────────────┐
│ POST /api/auth/signup      │
│ or                         │
│ POST /api/auth/login       │
└────────────────────────────┘
         │
    ┌────┴─────┐
    │           │
 SUCCESS    FAILURE
    │           │
    ▼           ▼
 ┌───┐     ┌─────────┐
 │OK │     │ Show    │
 └───┘     │ Error   │
    │      │ Message │
    ▼      └─────────┘
┌──────────────────┐
│ Response:        │
│ {                │
│  token: "...",   │
│  refreshToken,   │
│  user: {...}     │
│ }                │
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ saveTokens()     │
│ • auth_token     │
│ • refresh_token  │
│ • user_email     │
│ To:              │
│ chrome.storage   │
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Fetch User Info  │
│ GET /auth/me     │
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ setUser() in     │
│ App component    │
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Check if         │
│ delegated?       │
│ (in LoginPage)   │
└──────────────────┘
    │
 ┌──┴──┐
 │     │
NO     YES
 │     │
 ▼     ▼
 │     └──→ Navigate to "/"
 │         (Dashboard shows)
 │
 └──→ Redirect to portal
     http://localhost:5174
```

---

## Token Lifecycle

```
TIME: 0 minutes
├─ User logs in
├─ Server generates:
│  ├─ Access Token (exp: 15 min)
│  └─ Refresh Token (exp: 7 days)
└─ Both saved to chrome.storage.local

TIME: 0-15 minutes
├─ Access Token is VALID
├─ All API calls use it
└─ No problem

TIME: 14:50 minutes
├─ User makes API call
├─ useAuth checks: isTokenExpired()?
├─ Returns: FALSE (still 10 min left)
└─ API call proceeds normally

TIME: 15:00 minutes
├─ Access Token EXPIRED
├─ User makes API call
├─ useAuth checks: isTokenExpired()?
├─ Returns: TRUE (just expired)
└─ Trigger refresh sequence

TIME: 15:00+ minutes
├─ POST /api/auth/refresh
│  ├─ Send refreshToken
│  ├─ Server verifies it
│  └─ If valid:
│     └─ Send back NEW access token
│
├─ Update chrome.storage.local
│  └─ New token saved
│
├─ Retry original API call
│  └─ This time with new token
│
└─ SUCCESS!

TIME: 7 days
├─ Refresh Token EXPIRED
├─ User makes API call
├─ Access Token expired
├─ POST /api/auth/refresh
│  ├─ Send refreshToken
│  ├─ Server checks: isExpired()?
│  └─ Returns: TRUE
│
├─ Server response: 401 Unauthorized
├─ useAuth catches this
├─ clearTokens()
├─ setUser(null)
├─ App shows LoginPage
│
└─ User must login again
```

---

## Delegation Verification Flow

```
App Component Loads
    │
    ▼
useAuth hook initializes
    │
    ▼
Token found & valid?
    │
 ┌──┴──┐
 │     │
NO     YES
 │     │
 ▼     └──────────────────────┐
LOGIN  Fetch User Info         │
PAGE   GET /api/auth/me        │
       Response: {user: {...}} │
       ▼                       │
       Extract:                │
       • starknetAddr          │
       • amountDelegated       │
       │                       │
       ▼                       │
       ┌───────────────────┐   │
       │ Is amountDelegated│   │
       │ >= 1 STRK?        │   │
       └───────────────────┘   │
            /         \        │
          NO           YES     │
          /             \      │
         ▼               └──────┤──────────┐
    ┌─────────────┐             │          │
    │Delegation   │             ▼          ▼
    │Gate Screen  │         DASHBOARD   DASHBOARD
    │             │         + Nav        + Nav
    │ Message:    │         + All        + All
    │ "Delegate   │           routes      routes
    │  to unlock" │           available   available
    │             │
    │ Button:     │
    │ "Go to      │
    │  Portal"    │
    │             │
    └─────────────┘
         │
         │ User clicks button
         │ window.location.href =
         │ "http://localhost:5174
         │  ?email=user@email.com"
         │
         ▼
    New Tab Opens
    (Portal runs on 5174)
         │
         ▼
    User delegates
    Portal POSTs to:
    /api/delegate
         │
         ▼
    Backend updates:
    Delegation.amountDelegated
         │
         ▼
    User returns to
    extension tab
         │
         ▼
    App re-fetches user info
    (via useAuth or manual refresh)
         │
         ▼
    amountDelegated is now
    >= 1 STRK
         │
         ▼
    Dashboard automatically
    becomes visible
```

---

## Error Recovery Flows

### Scenario: Token Expired During API Call

```
User makes API request
    │
    ▼
Server returns 401 Unauthorized
    │
    ▼
Frontend catches 401
    │
    ▼
POST /api/auth/refresh
    │
 ┌──┴──┐
 │     │
200   !200
 │     │
 ▼     ▼
New   Invalid/
Token  Expired
 │     │
 │     ▼
 │   clearTokens()
 │   setUser(null)
 │   setToken(null)
 │     │
 │     ▼
 │   App detects
 │   isAuthenticated = false
 │     │
 │     ▼
 │   Show LoginPage
 │
 └──→ Update token
     Retry original
     request
     │
     ▼
     SUCCESS ✓
```

### Scenario: Login Fails

```
User submits form
    │
    ▼
POST /api/auth/login
    │
    ▼
Server response: 401
Body: {error: "Invalid email or password"}
    │
    ▼
Frontend catches error
    │
    ▼
Set state: error = message
    │
    ▼
LoginPage re-renders
    │
    ▼
Display red error box
to user
    │
    ▼
User can retry
```

### Scenario: Network Error During Signup

```
User submits form
    │
    ▼
POST /api/auth/signup
    │
    ▼
Network timeout/no response
    │
    ▼
catch (err)
    │
    ▼
error = "Failed to connect"
    │
    ▼
Show error to user
"Network error. Check server is running."
    │
    ▼
User can retry
```

---

## Chrome Storage State

### Before Login
```
chrome.storage.local = {
  // Empty
}
```

### After Successful Login/Signup
```
chrome.storage.local = {
  auth_token: "eyJhbGciOiJIUzI1NiIs...",
  refresh_token: "eyJhbGciOiJIUzI1NiIs...",
  user_email: "user@example.com"
}
```

### After Logout
```
chrome.storage.local = {
  // All auth keys removed
}
```

---

## Request/Response Examples

### Signup Request
```
POST /api/auth/signup
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "MyPassword123"
}
```

### Signup Response (Success)
```
200 OK
Content-Type: application/json

{
  "success": true,
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clk1234567890abcdef",
    "email": "newuser@example.com",
    "starknetAddr": null,
    "amountDelegated": 0
  }
}
```

### Signup Response (Error)
```
409 Conflict
Content-Type: application/json

{
  "success": false,
  "error": "User with this email already exists"
}
```

### Login Request
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "MyPassword123"
}
```

### Get User Info
```
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Get User Info Response
```
200 OK

{
  "success": true,
  "user": {
    "id": "clk1234567890abcdef",
    "email": "user@example.com",
    "starknetAddr": "0x0096d8b32e698b312...",
    "amountDelegated": 5.25,
    "lastTxHash": "0x1234567890abcdef",
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}
```

### Refresh Token Request
```
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Refresh Token Response
```
200 OK

{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Token refreshed successfully"
}
```

---

**Use this guide to understand the complete flow!**
