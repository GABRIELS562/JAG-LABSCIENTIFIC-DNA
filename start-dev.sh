#!/bin/bash

# Start development servers for LABSCIENTIFIC-LIMS

echo "🚀 Starting LABSCIENTIFIC-LIMS Development Servers..."

# Kill any existing processes on ports 3001 and 5173
echo "📍 Checking for existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

# Start backend server in background
echo "🔧 Starting backend server on port 3001..."
cd backend && npm start &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 3

# Check if backend is running
if ! lsof -i:3001 > /dev/null 2>&1; then
    echo "❌ Backend failed to start. Check logs in backend/logs/"
    exit 1
fi

echo "✅ Backend server running on http://localhost:3001"

# Start frontend server
echo "🎨 Starting frontend server on port 5173..."
cd .. && npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID 2>/dev/null" EXIT