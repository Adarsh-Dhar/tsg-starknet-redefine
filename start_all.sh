#!/bin/bash

echo "Starting all services..."

# Kill any processes on the ports we need
echo "Cleaning up ports..."
lsof -ti:3333 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
lsof -ti:5174 | xargs kill -9 2>/dev/null || true
echo "Ports cleared!"

# Start server
echo "Starting server..."
cd server
npx tsc -v
node dist/index.js &
SERVER_PID=$!
cd ..

# Start frontend
echo "Starting frontend..."
cd frontend
pnpm run build
pnpm run dev &
FRONTEND_PID=$!
cd ..

# Start tsg-portal
echo "Starting tsg-portal..."
cd tsg-portal
pnpm run dev &
PORTAL_PID=$!
cd ..

echo "All services started!"
echo "Server PID: $SERVER_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Portal PID: $PORTAL_PID"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for Ctrl+C
trap "kill $SERVER_PID $FRONTEND_PID $PORTAL_PID 2>/dev/null; exit" INT
wait
