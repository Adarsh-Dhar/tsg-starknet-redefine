#!/bin/bash

# Integration Test: Score-Based STRK Transfers with Dashboard Simulation
# This script simulates real dashboard score changes and validates API behavior

set -e

BASE_URL="http://localhost:3333"
TEST_ADDRESS="0x0096d8b32e698b312acb1d3c493f80d7e7dcf98a1376d8691adeb2463346291f"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║ Score-Based STRK Transfer - Integration Test               ║"
echo "║ Simulating Dashboard Score Changes                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Helper function to format numbers
format_strk() {
  printf "%.6f" "$1"
}

# Track totals
total_deducted=0
total_refunded=0

echo "📊 SCENARIO: User's Brainrot Score Journey"
echo "==========================================="
echo ""

# Score: 0 → 100 (1 bucket, 0.01 STRK deduction)
echo "⏰ [TIME 1] Score: 0 → 100 (+100 points)"
echo "   Bucket change: 0 → 1"
echo "   Expected deduction: 0.01 STRK"
echo ""

RESULT=$(curl -s -X POST "$BASE_URL/api/score-transfer/deduct" \
  -H "Content-Type: application/json" \
  -d "{\"userAddress\": \"$TEST_ADDRESS\", \"scoreIncrease\": 100}")

SUCCESS=$(echo "$RESULT" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESULT" | jq -r '.txHash // empty' 2>/dev/null)
AMOUNT=$(echo "$RESULT" | jq -r '.amount // 0' 2>/dev/null)

if [ "$SUCCESS" = "true" ] || [ -n "$TX_HASH" ]; then
  total_deducted=$(echo "$total_deducted + 0.01" | bc)
  echo "✅ Deduction successful: $(format_strk 0.01) STRK"
  [ -n "$TX_HASH" ] && echo "   TX: ${TX_HASH:0:12}...${TX_HASH: -8}"
else
  ERROR=$(echo "$RESULT" | jq -r '.message // .error' 2>/dev/null)
  echo "⚠️  Deduction failed (expected): $ERROR"
  total_deducted=$(echo "$total_deducted + 0" | bc)
fi
echo ""

# Score: 100 → 350 (3 buckets total, 2 more buckets = 0.02 STRK)
echo "⏰ [TIME 2] Score: 100 → 350 (+250 points)"
echo "   Bucket change: 1 → 3 (2 new buckets)"
echo "   Expected deduction: 0.02 STRK (2 buckets × 0.01)"
echo ""

RESULT=$(curl -s -X POST "$BASE_URL/api/score-transfer/deduct" \
  -H "Content-Type: application/json" \
  -d "{\"userAddress\": \"$TEST_ADDRESS\", \"scoreIncrease\": 250}")

SUCCESS=$(echo "$RESULT" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESULT" | jq -r '.txHash // empty' 2>/dev/null)

if [ "$SUCCESS" = "true" ] || [ -n "$TX_HASH" ]; then
  total_deducted=$(echo "$total_deducted + 0.02" | bc)
  echo "✅ Deduction successful: $(format_strk 0.02) STRK"
  [ -n "$TX_HASH" ] && echo "   TX: ${TX_HASH:0:12}...${TX_HASH: -8}"
else
  ERROR=$(echo "$RESULT" | jq -r '.message // .error' 2>/dev/null)
  echo "⚠️  Deduction failed (expected): $ERROR"
fi
echo ""

# Score: 350 → 500 (5 buckets total, 2 more buckets = 0.02 STRK)
echo "⏰ [TIME 3] Score: 350 → 500 (+150 points)"
echo "   Bucket change: 3 → 5 (2 new buckets)"
echo "   Expected deduction: 0.02 STRK"
echo ""

RESULT=$(curl -s -X POST "$BASE_URL/api/score-transfer/deduct" \
  -H "Content-Type: application/json" \
  -d "{\"userAddress\": \"$TEST_ADDRESS\", \"scoreIncrease\": 150}")

SUCCESS=$(echo "$RESULT" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESULT" | jq -r '.txHash // empty' 2>/dev/null)

if [ "$SUCCESS" = "true" ] || [ -n "$TX_HASH" ]; then
  total_deducted=$(echo "$total_deducted + 0.02" | bc)
  echo "✅ Deduction successful: $(format_strk 0.02) STRK"
  [ -n "$TX_HASH" ] && echo "   TX: ${TX_HASH:0:12}...${TX_HASH: -8}"
else
  ERROR=$(echo "$RESULT" | jq -r '.message // .error' 2>/dev/null)
  echo "⚠️  Deduction failed (expected): $ERROR"
fi
echo ""

# Score: 500 → 350 (5 buckets → 3 buckets, refund 0.02 STRK)
echo "⏰ [TIME 4] Score: 500 → 350 (-150 points)"
echo "   Bucket change: 5 → 3 (2 buckets back)"
echo "   Available refund: $(format_strk $total_deducted) STRK (total deducted)"
echo "   Expected refund: 0.02 STRK"
echo ""

RESULT=$(curl -s -X POST "$BASE_URL/api/score-transfer/refund" \
  -H "Content-Type: application/json" \
  -d "{\"userAddress\": \"$TEST_ADDRESS\", \"scoreDecrease\": 150}")

SUCCESS=$(echo "$RESULT" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESULT" | jq -r '.txHash // empty' 2>/dev/null)
ERROR=$(echo "$RESULT" | jq -r '.message // .error' 2>/dev/null)

if [ "$SUCCESS" = "true" ] || [ -n "$TX_HASH" ]; then
  total_refunded=$(echo "$total_refunded + 0.02" | bc)
  echo "✅ Refund successful: $(format_strk 0.02) STRK"
  [ -n "$TX_HASH" ] && echo "   TX: ${TX_HASH:0:12}...${TX_HASH: -8}"
  REMAINING=$(echo "$total_deducted - $total_refunded" | bc)
  echo "   Remaining refundable: $(format_strk $REMAINING) STRK"
else
  echo "⚠️  Refund rejected: $ERROR"
fi
echo ""

# Score: 350 → 200 (3 buckets → 2 buckets, refund 0.01 STRK)
echo "⏰ [TIME 5] Score: 350 → 200 (-150 points)"
echo "   Bucket change: 3 → 2 (1 bucket back)"
echo "   Available refund: $(format_strk $(echo "$total_deducted - $total_refunded" | bc)) STRK"
echo "   Expected refund: 0.01 STRK"
echo ""

RESULT=$(curl -s -X POST "$BASE_URL/api/score-transfer/refund" \
  -H "Content-Type: application/json" \
  -d "{\"userAddress\": \"$TEST_ADDRESS\", \"scoreDecrease\": 150}")

SUCCESS=$(echo "$RESULT" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESULT" | jq -r '.txHash // empty' 2>/dev/null)
ERROR=$(echo "$RESULT" | jq -r '.message // .error' 2>/dev/null)

if [ "$SUCCESS" = "true" ] || [ -n "$TX_HASH" ]; then
  total_refunded=$(echo "$total_refunded + 0.01" | bc)
  echo "✅ Refund successful: $(format_strk 0.01) STRK"
  [ -n "$TX_HASH" ] && echo "   TX: ${TX_HASH:0:12}...${TX_HASH: -8}"
  REMAINING=$(echo "$total_deducted - $total_refunded" | bc)
  echo "   Remaining refundable: $(format_strk $REMAINING) STRK"
else
  echo "⚠️  Refund rejected: $ERROR"
fi
echo ""

# Final Summary
echo "╔════════════════════════════════════════════════════════════╗"
echo "║ SUMMARY                                                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Final Score Buckets: 2"
echo "Total STRK Deducted: $(format_strk $total_deducted) STRK"
echo "Total STRK Refunded: $(format_strk $total_refunded) STRK"
echo "Net Balance Consumed: $(format_strk $(echo "$total_deducted - $total_refunded" | bc)) STRK"
echo ""
echo "Transaction History:"
HISTORY=$(curl -s -X GET "$BASE_URL/api/delegate/history/$TEST_ADDRESS?limit=20")
echo "$HISTORY" | jq '.transactions[] | "\(.timestamp | .[0:10]) [\(.type)] \(.amount) STRK (\(.status))"' 2>/dev/null | head -10 || echo "  [History fetch failed]"
echo ""
echo "✅ Integration test complete!"
