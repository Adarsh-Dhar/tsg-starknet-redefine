#!/bin/bash
# Test the STRK transfer flow end-to-end

echo "🚀 Testing STRK Transfer Flow"
echo "=============================="
echo ""

# Test parameters
FROM_ADDRESS="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
AMOUNT=0.15
ENDPOINT="http://localhost:3333/api/transfer/strk"

echo "📝 Test Parameters:"
echo "   From Address: $FROM_ADDRESS"
echo "   Amount: $AMOUNT STRK"
echo "   Endpoint: $ENDPOINT"
echo ""

echo "⏳ Calling transfer endpoint..."
echo ""

# Make the request
RESPONSE=$(curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{
    \"fromAddress\": \"$FROM_ADDRESS\",
    \"toAddress\": \"0x06d9399f6731ffcf7187c86824b8326d2adc6a78fb4f424b12772317244112b2\",
    \"amount\": $AMOUNT
  }")

echo "📤 Response:"
echo "$RESPONSE" | jq .
echo ""

# Extract transaction hash
TX_HASH=$(echo "$RESPONSE" | jq -r '.transactionHash // empty')

if [ -z "$TX_HASH" ]; then
  echo "❌ No transaction hash returned"
  exit 1
fi

echo "✅ Transaction Hash Generated:"
echo "   $TX_HASH"
echo ""

# Check if it's valid format
if [[ $TX_HASH == 0x* ]] && [ ${#TX_HASH} -eq 66 ]; then
  echo "✅ Hash format valid (0x + 64 hex chars)"
else
  echo "⚠️  Hash format might be incorrect"
fi

echo ""
echo "✅ Test Complete!"
echo ""
echo "Next Steps:"
echo "1. Verify this hash in the server logs:"
echo "   grep \"$TX_HASH\" /tmp/server.log"
echo ""
echo "2. Once real deployment happens, verify transaction on explorer:"
echo "   https://sepolia.starkscan.co/tx/$TX_HASH"
echo ""
