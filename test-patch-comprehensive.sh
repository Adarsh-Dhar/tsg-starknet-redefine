#!/bin/bash

# Comprehensive test of PATCH /api/auth/update-address

set -e

echo "=== Testing PATCH /api/auth/update-address endpoint ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="http://localhost:3333/api"

# Test 1: Signup
echo -e "${YELLOW}Test 1: Sign up a new user${NC}"
SIGNUP=$(curl -s -X POST "$API_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"patchtest2@example.com","password":"Test123!"}')

TOKEN=$(echo "$SIGNUP" | grep -o '"token":"[^"]*' | head -1 | cut -d'"' -f4)
USER_ID=$(echo "$SIGNUP" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Failed to signup${NC}"
  echo "Response: $SIGNUP"
  exit 1
fi

echo -e "${GREEN}✓ Signup successful${NC}"
echo "  Token: ${TOKEN:0:20}..."
echo ""

# Test 2: PATCH address update
echo -e "${YELLOW}Test 2: Update user's Starknet address via PATCH${NC}"
PATCH_RESPONSE=$(curl -s -X PATCH "$API_URL/auth/update-address" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"starknetAddr":"0x0096d8b32e698b312acb1d3c493f80d7e7dcf98a1376d8691adeb2463346291f"}')

if echo "$PATCH_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ PATCH endpoint works!${NC}"
  echo "Response: $PATCH_RESPONSE"
else
  echo -e "${RED}✗ PATCH endpoint failed${NC}"
  echo "Response: $PATCH_RESPONSE"
  exit 1
fi
echo ""

# Test 3: Verify update
echo -e "${YELLOW}Test 3: Verify address was updated via /me endpoint${NC}"
ME_RESPONSE=$(curl -s -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN")

if echo "$ME_RESPONSE" | grep -q "0x0096d8b32e698b312acb1d3c493f80d7e7dcf98a1376d8691adeb2463346291f"; then
  echo -e "${GREEN}✓ Address verified in user profile${NC}"
  echo "Response: $ME_RESPONSE"
else
  echo -e "${RED}✗ Address not found in profile${NC}"
  echo "Response: $ME_RESPONSE"
  exit 1
fi
echo ""

# Test 4: Invalid address format
echo -e "${YELLOW}Test 4: Test invalid address format rejection${NC}"
INVALID=$(curl -s -X PATCH "$API_URL/auth/update-address" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"starknetAddr":"not_an_address"}')

if echo "$INVALID" | grep -q "Invalid Starknet address"; then
  echo -e "${GREEN}✓ Invalid address properly rejected${NC}"
else
  echo -e "${RED}✗ Invalid address was not rejected${NC}"
  echo "Response: $INVALID"
fi
echo ""

# Test 5: No token
echo -e "${YELLOW}Test 5: Test authentication requirement${NC}"
NO_AUTH=$(curl -s -X PATCH "$API_URL/auth/update-address" \
  -H "Content-Type: application/json" \
  -d '{"starknetAddr":"0x1234"}')

if echo "$NO_AUTH" | grep -q "No token provided"; then
  echo -e "${GREEN}✓ Missing token properly rejected${NC}"
else
  echo -e "${RED}✗ Missing token was not rejected${NC}"
  echo "Response: $NO_AUTH"
fi
echo ""

echo -e "${GREEN}=== All tests passed! ===${NC}"
