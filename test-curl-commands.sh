#!/bin/bash
# Quick Test Commands for Delegation API

echo "🧪 DELEGATION API - QUICK TEST COMMANDS"
echo "========================================"
echo ""

# Test 1: Health Check
echo "1️⃣  Health Check"
echo "curl http://localhost:3333/api/delegate/health"
curl -s http://localhost:3333/api/delegate/health | python3 -m json.tool
echo ""
echo ""

# Test 2: Get Status (No delegation)
echo "2️⃣  Get Delegation Status (New User)"
echo "curl http://localhost:3333/api/delegate/status/0xNEWUSER"
curl -s "http://localhost:3333/api/delegate/status/0xNEWUSER" | python3 -m json.tool
echo ""
echo ""

# Test 3: Post Validation Error (Missing txHash)
echo "3️⃣  POST Validation Test (Missing txHash)"
echo "curl -X POST http://localhost:3333/api/delegate \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"address\":\"0x123\",\"amount\":10}'"
curl -s -X POST http://localhost:3333/api/delegate \
  -H "Content-Type: application/json" \
  -d '{"address":"0x123","amount":10}' | python3 -m json.tool
echo ""
echo ""

# Test 4: Post Validation Error (Negative amount)
echo "4️⃣  POST Validation Test (Negative Amount)"
echo "curl -X POST http://localhost:3333/api/delegate \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"address\":\"0x123\",\"amount\":-5,\"txHash\":\"0xabc\"}'"
curl -s -X POST http://localhost:3333/api/delegate \
  -H "Content-Type: application/json" \
  -d '{"address":"0x123","amount":-5,"txHash":"0xabc"}' | python3 -m json.tool
echo ""
echo ""

# Test 5: Post Validation Error (Empty address)
echo "5️⃣  POST Validation Test (Empty Address)"
echo "curl -X POST http://localhost:3333/api/delegate \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"address\":\"\",\"amount\":10,\"txHash\":\"0xabc\"}'"
curl -s -X POST http://localhost:3333/api/delegate \
  -H "Content-Type: application/json" \
  -d '{"address":"","amount":10,"txHash":"0xabc"}' | python3 -m json.tool
echo ""
echo ""

echo "========================================"
echo "✅ All Basic Tests Complete!"
echo ""
echo "To test with real transaction:"
echo "1. Delegate in tsg-portal"
echo "2. Copy the transaction hash"
echo "3. Run: curl -X POST http://localhost:3333/api/delegate \\"
echo "          -H 'Content-Type: application/json' \\"
echo "          -d '{\"address\":\"YOUR_ADDRESS\",\"amount\":1.5,\"txHash\":\"YOUR_TX_HASH\"}'"
echo ""
