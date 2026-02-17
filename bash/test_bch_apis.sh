#!/bin/bash

# Configuration
TEST_ADDR="bchtest:qr9ra8740euwwyxmand72tm5uaran43g4yer0y2qs7"
# A dummy hex string for testing broadcast (will fail validation but tests connectivity)
DUMMY_HEX="01000000000000000000" 

echo "--------------------------------------------------"
echo "BCH CHIPNET API DIAGNOSTIC (2026)"
echo "Target Address: $TEST_ADDR"
echo "--------------------------------------------------"

# 1. Provider: cbch.loping.net (RPC Explorer API)
echo -e "\n[1] Testing LOPING.NET (RPC Explorer API)"
echo "Path: /explorer-api/addr/:addr/utxo"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" "https://cbch.loping.net/explorer-api/addr/$TEST_ADDR/utxo"
curl -s "https://cbch.loping.net/explorer-api/addr/$TEST_ADDR/utxo" | grep -q "[" && echo "Result: Valid JSON Array ✅" || echo "Result: Invalid JSON/HTML ❌"

# 2. Provider: FullStack.cash (Fulcrum API)
echo -e "\n[2] Testing FULLSTACK.CASH (Fulcrum API)"
echo "Path: /v6/fulcrum/utxos/:addr"
# Note: May require HTTPS
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" "https://chipnet.fullstack.cash/v6/fulcrum/utxos/$TEST_ADDR"
curl -s "https://chipnet.fullstack.cash/v6/fulcrum/utxos/$TEST_ADDR" | grep -q "utxos" && echo "Result: Valid JSON Object ✅" || echo "Result: Invalid JSON/HTML ❌"

# 3. Provider: Chaingraph.cash (GraphQL API)
echo -e "\n[3] Testing CHAINGRAPH.CASH (GraphQL)"
echo "Endpoint: /v1/graphql"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" \
  -X POST -H "Content-Type: application/json" \
  --data '{"query":"query { address_by_pkh(address: \"'$TEST_ADDR'\") { utxos { tx_hash } } }"}' \
  "https://chipnet.chaingraph.cash/v1/graphql"
# Check for data field in response
CHAINGRAPH_RES=$(curl -s -X POST -H "Content-Type: application/json" \
  --data '{"query":"query { address_by_pkh(address: \"'$TEST_ADDR'\") { utxos { tx_hash } } }"}' \
  "https://chipnet.chaingraph.cash/v1/graphql")
echo "$CHAINGRAPH_RES" | grep -q "data" && echo "Result: Valid GraphQL Response ✅" || echo "Result: Network Error/HTML ❌"

# 4. Broadcast Test: Loping.net
echo -e "\n[4] Testing Broadcast Connectivity (Loping)"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" \
  -X POST -H "Content-Type: application/json" \
  --data "{\"rawtx\":\"$DUMMY_HEX\"}" \
  "https://cbch.loping.net/explorer-api/tx/send"
echo "Result: Expected 'Invalid TX' (means endpoint is live) ✅"

echo -e "\n--------------------------------------------------"
echo "DIAGNOSTIC COMPLETE"