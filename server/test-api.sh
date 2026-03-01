#!/bin/bash

# Start server
cd /Users/adarsh/Documents/touch-some-grass/server
nohup npx tsx src/index.ts > /tmp/server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
sleep 3

# Test 1: Health endpoint
echo ""
echo "═════════════════════════════════════════════════════════"
echo "🧪 TEST 1: GET /api/delegate/health"
echo "═════════════════════════════════════════════════════════"
curl -s http://localhost:3333/api/delegate/health | jq .

# Test 2: GET status for non-existent address
echo ""
echo "═════════════════════════════════════════════════════════"
echo "🧪 TEST 2: GET /api/delegate/status/0xdeadbeef"
echo "═════════════════════════════════════════════════════════"
curl -s http://localhost:3333/api/delegate/status/0xdeadbeef | jq .

# Test 3: GET status for existing address (from our test data)
echo ""
echo "═════════════════════════════════════════════════════════"
echo "🧪 TEST 3: GET /api/delegate/status/0x123"
echo "═════════════════════════════════════════════════════════"
curl -s http://localhost:3333/api/delegate/status/0x123 | jq .

# Test 4: POST with invalid data
echo ""
echo "═════════════════════════════════════════════════════════"
echo "🧪 TEST 4: POST /api/delegate with missing fields"
echo "═════════════════════════════════════════════════════════"
curl -s -X POST http://localhost:3333/api/delegate \
  -H "Content-Type: application/json" \
  -d '{"address": "0x456"}' | jq .

# Test 5: POST with valid data (but unverified transaction)
echo ""
echo "═════════════════════════════════════════════════════════"
echo "🧪 TEST 5: POST /api/delegate with valid data"
echo "═════════════════════════════════════════════════════════"
curl -s -X POST http://localhost:3333/api/delegate \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xTestAddress123",
    "amount": 50.5,
    "txHash": "0x1234567890abcdef"
  }' | jq .

# Test 6: Verify the address was created
echo ""
echo "═════════════════════════════════════════════════════════"
echo "🧪 TEST 6: GET /api/delegate/status/0xTestAddress123"
echo "═════════════════════════════════════════════════════════"
curl -s http://localhost:3333/api/delegate/status/0xTestAddress123 | jq .

# Cleanup
kill $SERVER_PID 2>/dev/null
echo ""
echo "✅ All tests completed!"
