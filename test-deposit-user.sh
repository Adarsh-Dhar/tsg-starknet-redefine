#!/bin/bash

# Test deposit endpoint to fund user's vault balance

USER_ADDRESS="0x0096d8b32e698b312acb1d3c493f80d7e7dcf98a1376d8691adeb2463346291f"
API_URL="http://localhost:3333"
AMOUNT=1  # Deposit 1 STRK

echo "========================================="
echo "Testing Deposit Endpoint"
echo "========================================="
echo ""

echo "User Address: $USER_ADDRESS"
echo "Amount to Deposit: $AMOUNT STRK"
echo ""

echo "Step 1: POST /api/deposit"
echo "-----------------------------------------"
RESPONSE=$(curl -s -X POST "$API_URL/api/deposit" \
  -H "Content-Type: application/json" \
  -d "{
    \"userAddress\": \"$USER_ADDRESS\",
    \"amount\": $AMOUNT
  }")

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if it's a pending deposit that needs execution
if echo "$RESPONSE" | grep -q "requiresExecution"; then
  echo "Step 2: POST /api/execute-deposit"
  echo "-----------------------------------------"
  
  EXEC_RESPONSE=$(curl -s -X POST "$API_URL/api/execute-deposit" \
    -H "Content-Type: application/json" \
    -d "{
      \"userAddress\": \"$USER_ADDRESS\"
    }")
  
  echo "Response:"
  echo "$EXEC_RESPONSE" | jq '.' 2>/dev/null || echo "$EXEC_RESPONSE"
  echo ""
fi

echo "Step 3: Check vault balance after deposit"
echo "-----------------------------------------"
cd /Users/adarsh/Documents/touch-some-grass/server
npx tsx scripts/check-balances.ts 2>&1 | grep -A 5 "User Vault Balance"
echo ""

echo "========================================="
echo "Deposit Test Complete"
echo "========================================="
