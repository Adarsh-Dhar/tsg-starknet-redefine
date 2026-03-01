#!/bin/bash

# Test PATCH /api/auth/update-address endpoint

API_URL="http://localhost:3333/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Testing PATCH /api/auth/update-address ===${NC}\n"

# Step 1: Sign up a test user
echo -e "${YELLOW}Step 1: Signing up test user...${NC}"
SIGNUP_RESPONSE=$(curl -s -X POST "$API_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testpatch@example.com",
    "password": "TestPassword123"
  }')

echo "Response: $SIGNUP_RESPONSE"
TOKEN=$(echo $SIGNUP_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo $SIGNUP_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Failed to get token from signup${NC}"
  exit 1
fi

echo -e "${GREEN}✓ User created with token: ${TOKEN:0:20}...${NC}\n"

# Step 2: Test PATCH to update address
echo -e "${YELLOW}Step 2: Updating user's Starknet address...${NC}"
PATCH_RESPONSE=$(curl -s -X PATCH "$API_URL/auth/update-address" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "starknetAddr": "0x0096d8b32e698b312acb1d3c493f80d7e7dcf98a1376d8691adeb2463346291f"
  }')

echo "Response: $PATCH_RESPONSE"

if echo $PATCH_RESPONSE | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Address updated successfully${NC}\n"
else
  echo -e "${RED}✗ Failed to update address${NC}\n"
  exit 1
fi

# Step 3: Verify the update by calling /me endpoint
echo -e "${YELLOW}Step 3: Verifying address update via /api/auth/me...${NC}"
ME_RESPONSE=$(curl -s -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $ME_RESPONSE"

if echo $ME_RESPONSE | grep -q "0x0096d8b32e698b312acb1d3c493f80d7e7dcf98a1376d8691adeb2463346291f"; then
  echo -e "${GREEN}✓ Address verified in user profile${NC}\n"
else
  echo -e "${RED}✗ Address not found in user profile${NC}\n"
  exit 1
fi

# Step 4: Test error handling - try to update with invalid address
echo -e "${YELLOW}Step 4: Testing error handling (invalid address format)...${NC}"
INVALID_RESPONSE=$(curl -s -X PATCH "$API_URL/auth/update-address" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "starknetAddr": "invalid_address_no_0x"
  }')

echo "Response: $INVALID_RESPONSE"

if echo $INVALID_RESPONSE | grep -q "Invalid Starknet address format"; then
  echo -e "${GREEN}✓ Invalid address format properly rejected${NC}\n"
else
  echo -e "${RED}✗ Invalid address not properly rejected${NC}\n"
fi

# Step 5: Test duplicate address prevention
echo -e "${YELLOW}Step 5: Testing duplicate address prevention...${NC}"

# Create another user
echo "Creating second user..."
SIGNUP2_RESPONSE=$(curl -s -X POST "$API_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testpatch2@example.com",
    "password": "TestPassword123"
  }')

TOKEN2=$(echo $SIGNUP2_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Try to link the same address to second user
DUPLICATE_RESPONSE=$(curl -s -X PATCH "$API_URL/auth/update-address" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN2" \
  -d '{
    "starknetAddr": "0x0096d8b32e698b312acb1d3c493f80d7e7dcf98a1376d8691adeb2463346291f"
  }')

echo "Response: $DUPLICATE_RESPONSE"

if echo $DUPLICATE_RESPONSE | grep -q "already linked to another account"; then
  echo -e "${GREEN}✓ Duplicate address properly rejected${NC}\n"
else
  echo -e "${RED}✗ Duplicate address not properly rejected${NC}\n"
fi

# Step 6: Test missing authorization
echo -e "${YELLOW}Step 6: Testing missing authorization...${NC}"
NO_AUTH_RESPONSE=$(curl -s -X PATCH "$API_URL/auth/update-address" \
  -H "Content-Type: application/json" \
  -d '{
    "starknetAddr": "0x1234567890abcdef"
  }')

echo "Response: $NO_AUTH_RESPONSE"

if echo $NO_AUTH_RESPONSE | grep -q "No token provided"; then
  echo -e "${GREEN}✓ Missing authorization properly rejected${NC}\n"
else
  echo -e "${RED}✗ Missing authorization not properly rejected${NC}\n"
fi

echo -e "${GREEN}=== All tests completed ===${NC}"
