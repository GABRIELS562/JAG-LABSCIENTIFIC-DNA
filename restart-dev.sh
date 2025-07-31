#!/bin/bash

echo "🔄 Restarting development environment..."

# Kill existing processes
echo "Stopping existing servers..."
pkill -f "vite\|node server.js\|nodemon" 2>/dev/null || true
lsof -ti:3001,5173 | xargs kill -9 2>/dev/null || true

echo "Waiting for ports to clear..."
sleep 2

# Start backend
echo "🚀 Starting backend server..."
cd backend && node server.js &
BACKEND_PID=$!

# Give backend time to start
sleep 3

# Start frontend from root
echo "🚀 Starting frontend server..."
cd ..
npm run dev &
FRONTEND_PID=$!

echo "✅ Development servers started!"
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:5173"
echo ""
echo "To stop servers: kill $BACKEND_PID $FRONTEND_PID"
echo "Or run: pkill -f 'vite\|node server.js'"