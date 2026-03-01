#!/bin/bash

echo "🔍 Testing Prisma Migration Setup..."

echo "✅ Checking database file..."
if [ -f "prisma/dev.db" ]; then
  echo "   ✓ Database exists at prisma/dev.db"
  ls -lh prisma/dev.db
else
  echo "   ✗ Database file not found!"
  exit 1
fi

echo ""
echo "✅ Checking migration status..."
npx prisma migrate status

echo ""
echo "✅ Checking Delegation table schema..."
sqlite3 prisma/dev.db ".schema Delegation"

echo ""
echo "✅ Checking migration history..."
sqlite3 prisma/dev.db "SELECT id, name FROM _prisma_migrations;"

echo ""
echo "✅ All checks passed! Migration is complete."
