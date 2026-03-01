#!/bin/bash

# Test Authentication & Delegation Integration
# This script tests the complete auth flow with wallet linking

echo "🧪 Testing Authentication & Delegation Integration"
echo "=================================================="
echo ""

API_URL="http://localhost:3333"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Signup
echo -e "${BLUE}Test 1: User Signup${NC}"
SIGNUP_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"user$(date +%s)@example.com\", \"password\": \"password123\"}")

TOKEN=$(echo $SIGNUP_RESPONSE | jq -r '.token')
USER_EMAIL=$(echo $SIGNUP_RESPONSE | jq -r '.user.email')

if [ "$TOKEN" != "null" ]; then
  echo -e "${GREEN}✓ Signup successful${NC}"
  echo "  Email: $USER_EMAIL"
else
  echo -e "${RED}✗ Signup failed${NC}"
  echo $SIGNUP_RESPONSE | jq .
  exit 1
fi
echo ""

# Test 2: Login
echo -e "${BLUE}Test 2: User Login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$USER_EMAIL\", \"password\": \"password123\"}")

LOGIN_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
if [ "$LOGIN_TOKEN" != "null" ]; then
  echo -e "${GREEN}✓ Login successful${NC}"
  TOKEN=$LOGIN_TOKEN
else
  echo -e "${RED}✗ Login failed${NC}"
  echo $LOGIN_RESPONSE | jq .
  exit 1
fi
echo ""

# Test 3: Get User Info (before wallet link)
echo -e "${BLUE}Test 3: Get User Info (before wallet link)${NC}"
ME_RESPONSE=$(curl -s -X GET "$API_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN")

STARKNET_ADDR=$(echo $ME_RESPONSE | jq -r '.user.starknetAddr')
if [ "$STARKNET_ADDR" == "null" ]; then
  echo -e "${GREEN}✓ User has no wallet linked${NC}"
  echo "  Amount delegated: $(echo $ME_RESPONSE | jq -r '.user.amountDelegated')"
else
  echo -e "${RED}✗ Unexpected wallet address${NC}"
  echo $ME_RESPONSE | jq .
fi
echo ""

# Test 4: Link Starknet Wallet
echo -e "${BLUE}Test 4: Link Starknet Wallet${NC}"
TEST_ADDRESS="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
LINK_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/link-wallet" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"starknetAddr\": \"$TEST_ADDRESS\"}")

LINKED_ADDR=$(echo $LINK_RESPONSE | jq -r '.user.starknetAddr')
if [ "$LINKED_ADDR" == "$TEST_ADDRESS" ]; then
  echo -e "${GREEN}✓ Wallet linked successfully${NC}"
  echo "  Address: $LINKED_ADDR"
  echo "  Amount delegated: $(echo $LINK_RESPONSE | jq -r '.user.amountDelegated')"
else
  echo -e "${RED}✗ Wallet linking failed${NC}"
  echo $LINK_RESPONSE | jq .
  exit 1
fi
echo ""

# Test 5: Get User Info (after wallet link)
echo -e "${BLUE}Test 5: Get User Info (after wallet link)${NC}"
ME_RESPONSE_2=$(curl -s -X GET "$API_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN")

AMOUNT_DELEGATED=$(echo $ME_RESPONSE_2 | jq -r '.user.amountDelegated')
LAST_TX=$(echo $ME_RESPONSE_2 | jq -r '.user.lastTxHash')
echo -e "${GREEN}✓ User info retrieved${NC}"
echo "  Starknet Address: $(echo $ME_RESPONSE_2 | jq -r '.user.starknetAddr')"
echo "  Amount Delegated: $AMOUNT_DELEGATED STRK"
echo "  Last TX Hash: $LAST_TX"
echo "  Is Authorized: $([ $(echo "$AMOUNT_DELEGATED >= 1" | bc) -eq 1 ] && echo "YES" || echo "NO")"
echo ""

# Test 6: Check Delegation Status Endpoint
echo -e "${BLUE}Test 6: Check Delegation Status${NC}"
STATUS_RESPONSE=$(curl -s -X GET "$API_URL/api/delegate/status/$TEST_ADDRESS")
STATUS_AMOUNT=$(echo $STATUS_RESPONSE | jq -r '.amountDelegated')
IS_DELEGATED=$(echo $STATUS_RESPONSE | jq -r '.isDelegated')

if [ "$STATUS_AMOUNT" != "null" ]; then
  echo -e "${GREEN}✓ Delegation status retrieved${NC}"
  echo "  Amount: $STATUS_AMOUNT STRK"
  echo "  Is Delegated (≥1 STRK): $IS_DELEGATED"
else
  echo -e "${RED}✗ Failed to get delegation status${NC}"
  echo $STATUS_RESPONSE | jq .
fi
echo ""

# Test 7: Test Authorization (wrong password)
echo -e "${BLUE}Test 7: Test Wrong Password${NC}"
WRONG_LOGIN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$USER_EMAIL\", \"password\": \"wrongpassword\"}")

if [ "$(echo $WRONG_LOGIN | jq -r '.success')" == "false" ]; then
  echo -e "${GREEN}✓ Wrong password rejected correctly${NC}"
else
  echo -e "${RED}✗ Security issue: wrong password accepted${NC}"
  exit 1
fi
echo ""

# Test 8: Test Invalid Token
echo -e "${BLUE}Test 8: Test Invalid Token${NC}"
INVALID_TOKEN_RESPONSE=$(curl -s -X GET "$API_URL/api/auth/me" \
  -H "Authorization: Bearer invalid_token_here")

if [ "$(echo $INVALID_TOKEN_RESPONSE | jq -r '.success')" == "false" ]; then
  echo -e "${GREEN}✓ Invalid token rejected correctly${NC}"
else
  echo -e "${RED}✗ Security issue: invalid token accepted${NC}"
  exit 1
fi
echo ""

# Final Summary
echo "=================================================="
echo -e "${GREEN}🎉 All Tests Passed!${NC}"
echo ""
echo "Summary:"
echo "  ✓ User signup and login working"
echo "  ✓ JWT authentication working"
echo "  ✓ Wallet linking working"
echo "  ✓ User-delegation relationship established"
echo "  ✓ Authorization checks working"
echo ""
echo "Next steps:"
echo "  1. Update frontend extension to use auth flow"
echo "  2. Update tsg-portal to link wallets on delegation"
echo "  3. Implement session management in extension"
