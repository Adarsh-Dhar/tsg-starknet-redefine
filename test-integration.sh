#!/bin/bash

echo "=========================================="
echo "🧪 Testing Full Delegation Integration"
echo "=========================================="
echo ""

# Test 1: Health Check
echo "1️⃣  Testing Backend Health"
echo "-------------------------------------------"
HEALTH=$(curl -s http://localhost:3333/api/delegate/health)
echo "Response: $HEALTH"
echo ""

# Test 2: Check delegation status for new address
TEST_ADDRESS="0x1234567890abcdef"
echo "2️⃣  Testing GET /api/delegate/status/$TEST_ADDRESS"
echo "-------------------------------------------"
STATUS=$(curl -s "http://localhost:3333/api/delegate/status/$TEST_ADDRESS")
echo "Response: $STATUS"
echo ""

# Test 3: Test POST validation (missing fields)
echo "3️⃣  Testing POST /api/delegate (validation)"
echo "-------------------------------------------"
VALIDATION=$(curl -s -X POST http://localhost:3333/api/delegate \
  -H "Content-Type: application/json" \
  -d '{"address": "0x123", "amount": 100}')
echo "Response: $VALIDATION"
echo ""

# Test 4: Check if tsg-portal is accessible
echo "4️⃣  Checking tsg-portal accessibility"
echo "-------------------------------------------"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5174 | grep -q "200"; then
  echo "✅ tsg-portal is running on http://localhost:5174"
else
  echo "⚠️  tsg-portal is not running. Start it with: cd tsg-portal && pnpm dev"
fi
echo ""

# Test 5: Check backend CORS configuration
echo "5️⃣  Checking CORS configuration"
echo "-------------------------------------------"
CORS_TEST=$(curl -s -H "Origin: http://localhost:5174" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: Content-Type" -X OPTIONS http://localhost:3333/api/delegate -I)
if echo "$CORS_TEST" | grep -q "Access-Control-Allow-Origin"; then
  echo "✅ CORS is properly configured"
else
  echo "⚠️  CORS might need configuration"
fi
echo ""

echo "=========================================="
echo "✅ Integration Tests Complete"
echo "=========================================="
echo ""
echo "📋 Next Steps:"
echo "1. Start tsg-portal: cd tsg-portal && pnpm dev"
echo "2. Load extension in Chrome"
echo "3. Connect wallet in tsg-portal"
echo "4. Delegate STRK tokens"
echo "5. Check extension for authorization"
echo ""
