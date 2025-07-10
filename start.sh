#!/bin/bash

# LIMS Application Startup Script
# This script starts the LIMS application using PM2 for reliable process management

echo "🚀 Starting LIMS Application..."

# Stop any existing PM2 processes
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Kill any rogue processes on our ports
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Start with PM2
pm2 start ecosystem.config.js

# Wait for startup
sleep 5

# Show status
pm2 status

echo ""
echo "✅ LIMS Application Started Successfully!"
echo ""
echo "🌐 Frontend: http://localhost:5173/"
echo "🔧 Backend:  http://localhost:3001/"
echo "📊 PM2 Monitor: pm2 monit"
echo ""
echo "To stop: pm2 stop all"
echo "To restart: pm2 restart all"
echo "To view logs: pm2 logs"