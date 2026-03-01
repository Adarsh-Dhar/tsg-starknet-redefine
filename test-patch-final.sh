#!/bin/bash

echo "=== Testing PATCH /api/auth/update-address ==="
echo ""

# Test 1: Signup
echo "1. Signing up test user..."
SIGNUP=$(curl -s -X POST "http://localhost:3333/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"patchuser@test.com","password":"Test123!"}')

TOKEN=$(echo "$SIGNUP" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "✗ Signup failed"
  echo "$SIGNUP"
  exit 1
fi

echo "✓ Signed up, token: ${TOKEN:0:20}..."
echo ""

# Test 2: PATCH address
echo "2. Updating Starknet address via PATCH..."
PATCH=$(curl -s -X PATCH "http://localhost:3333/api/auth/update-address" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"starknetAddr":"0x0096d8b32e698b312acb1d3c493f80d7e7dcf98a1376d8691adeb2463346291f"}')

if echo "$PATCH" | grep -q '"success":true'; then
  echo "✓ PATCH successful!"
  echo "$PATCH" | head -1
else
  echo "✗ PATCH failed"
  echo "$PATCH"
  exit 1
fi
echo ""

# Test 3: Verify via /me
echo "3. Verifying address in user profile..."
ME=$(curl -s -X GET "http://localhost:3333/api/auth/me" \
  -H "Authorization: Bearer $TOKEN")

if echo "$ME" | grep -q "0x0096d8b32e698b312acb1d3c493f80d7e7dcf98a1376d8691adeb2463346291f"; then
  echo "✓ Address verified!"
else
  echo "✗ Address not found in profile"
  echo "$ME"
  exit 1
fi
echo ""

echo "=== All tests passed! ==="
