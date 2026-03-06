#!/bin/bash

# Test script for Score-Based STRK Transfer System
# Tests deductions when score increases and refunds when score decreases

set -e

BASE_URL="http://localhost:3333"
TEST_ADDRESS="0x0096d8b32e698b312acb1d3c493f80d7e7dcf98a1376d8691adeb2463346291f"

echo "=================================="
echo "Score-Based STRK Transfer Tests"
echo "=================================="
echo ""

# Test 1: Score Increase (Deduction)
echo "✅ TEST 1: Score Increase by 100 (0.01 STRK Deduction)"
echo "  POST $BASE_URL/api/score-transfer/deduct"
echo "  Payload: { userAddress: $TEST_ADDRESS, scoreIncrease: 100 }"
echo ""

DEDUCT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/score-transfer/deduct" \
  -H "Content-Type: application/json" \
  -d "{\"userAddress\": \"$TEST_ADDRESS\", \"scoreIncrease\": 100}")

echo "Response:"
echo "$DEDUCT_RESPONSE" | jq '.' 2>/dev/null || echo "$DEDUCT_RESPONSE"

DEDUCT_TX=$(echo "$DEDUCT_RESPONSE" | jq -r '.txHash // empty' 2>/dev/null)
if [ -n "$DEDUCT_TX" ]; then
  echo "✅ Deduction TX: $DEDUCT_TX"
  echo "  View on Voyager: https://sepolia.voyager.online/tx/$DEDUCT_TX"
else
  echo "⚠️  No TX hash returned"
fi
echo ""

# Test 2: Score Increase by 300 (3 buckets = 0.03 STRK)
echo "✅ TEST 2: Score Increase by 300 (0.03 STRK Deduction)"
echo "  POST $BASE_URL/api/score-transfer/deduct"
echo "  Payload: { userAddress: $TEST_ADDRESS, scoreIncrease: 300 }"
echo ""

DEDUCT_RESPONSE2=$(curl -s -X POST "$BASE_URL/api/score-transfer/deduct" \
  -H "Content-Type: application/json" \
  -d "{\"userAddress\": \"$TEST_ADDRESS\", \"scoreIncrease\": 300}")

echo "Response:"
echo "$DEDUCT_RESPONSE2" | jq '.' 2>/dev/null || echo "$DEDUCT_RESPONSE2"

DEDUCT_TX2=$(echo "$DEDUCT_RESPONSE2" | jq -r '.txHash // empty' 2>/dev/null)
if [ -n "$DEDUCT_TX2" ]; then
  echo "✅ Deduction TX: $DEDUCT_TX2"
else
  echo "⚠️  No TX hash returned"
fi
echo ""

# Test 3: Score Decrease (Refund)
echo "✅ TEST 3: Score Decrease by 100 (0.01 STRK Refund)"
echo "  POST $BASE_URL/api/score-transfer/refund"
echo "  Payload: { userAddress: $TEST_ADDRESS, scoreDecrease: 100 }"
echo ""

REFUND_RESPONSE=$(curl -s -X POST "$BASE_URL/api/score-transfer/refund" \
  -H "Content-Type: application/json" \
  -d "{\"userAddress\": \"$TEST_ADDRESS\", \"scoreDecrease\": 100}")

echo "Response:"
echo "$REFUND_RESPONSE" | jq '.' 2>/dev/null || echo "$REFUND_RESPONSE"

REFUND_TX=$(echo "$REFUND_RESPONSE" | jq -r '.txHash // empty' 2>/dev/null)
if [ -n "$REFUND_TX" ]; then
  echo "✅ Refund TX: $REFUND_TX"
  echo "  View on Voyager: https://sepolia.voyager.online/tx/$REFUND_TX"
else
  REFUND_ERROR=$(echo "$REFUND_RESPONSE" | jq -r '.message // .error' 2>/dev/null)
  echo "⚠️  Refund failed: $REFUND_ERROR"
fi
echo ""

# Test 4: Score Decrease by 200 (2 buckets = 0.02 STRK)
echo "✅ TEST 4: Score Decrease by 200 (0.02 STRK Refund)"
echo "  POST $BASE_URL/api/score-transfer/refund"
echo "  Payload: { userAddress: $TEST_ADDRESS, scoreDecrease: 200 }"
echo ""

REFUND_RESPONSE2=$(curl -s -X POST "$BASE_URL/api/score-transfer/refund" \
  -H "Content-Type: application/json" \
  -d "{\"userAddress\": \"$TEST_ADDRESS\", \"scoreDecrease\": 200}")

echo "Response:"
echo "$REFUND_RESPONSE2" | jq '.' 2>/dev/null || echo "$REFUND_RESPONSE2"

REFUND_TX2=$(echo "$REFUND_RESPONSE2" | jq -r '.txHash // empty' 2>/dev/null)
if [ -n "$REFUND_TX2" ]; then
  echo "✅ Refund TX: $REFUND_TX2"
else
  REFUND_ERROR2=$(echo "$REFUND_RESPONSE2" | jq -r '.message // .error' 2>/dev/null)
  echo "⚠️  Refund failed: $REFUND_ERROR2"
fi
echo ""

# Test 5: Transaction History
echo "✅ TEST 5: Fetch Transaction History"
echo "  GET $BASE_URL/api/delegate/history/$TEST_ADDRESS?limit=10"
echo ""

HISTORY=$(curl -s -X GET "$BASE_URL/api/delegate/history/$TEST_ADDRESS?limit=10")
echo "Response:"
echo "$HISTORY" | jq '.' 2>/dev/null || echo "$HISTORY"
echo ""

# Test 6: Error Handling - Invalid Score Increase
echo "✅ TEST 6: Error Handling - Score Increase < 100"
echo "  POST $BASE_URL/api/score-transfer/deduct"
echo "  Payload: { userAddress: $TEST_ADDRESS, scoreIncrease: 50 }"
echo ""

ERROR_RESPONSE=$(curl -s -X POST "$BASE_URL/api/score-transfer/deduct" \
  -H "Content-Type: application/json" \
  -d "{\"userAddress\": \"$TEST_ADDRESS\", \"scoreIncrease\": 50}")

echo "Response:"
echo "$ERROR_RESPONSE" | jq '.' 2>/dev/null || echo "$ERROR_RESPONSE"
echo ""

# Test 7: Error Handling - Refund More Than Deducted
echo "✅ TEST 7: Error Handling - Refund More Than Deducted"
echo "  POST $BASE_URL/api/score-transfer/refund"
echo "  Payload: { userAddress: $TEST_ADDRESS, scoreDecrease: 10000 }"
echo ""

ERROR_RESPONSE2=$(curl -s -X POST "$BASE_URL/api/score-transfer/refund" \
  -H "Content-Type: application/json" \
  -d "{\"userAddress\": \"$TEST_ADDRESS\", \"scoreDecrease\": 10000}")

echo "Response:"
echo "$ERROR_RESPONSE2" | jq '.' 2>/dev/null || echo "$ERROR_RESPONSE2"
echo ""

echo "=================================="
echo "Tests Complete!"
echo "=================================="
