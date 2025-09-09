#!/bin/bash

# JAG DNA Scientific LIMS - Docker Startup Script
# For containerized deployment with live sample flow

echo "========================================="
echo "   JAG DNA SCIENTIFIC LIMS"
echo "   Docker Container Startup"
echo "========================================="
echo ""

# Environment setup for container
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3001}
export FRONTEND_PORT=${FRONTEND_PORT:-5173}

# Database setup (SQLite for now, PostgreSQL optional)
export USE_SQLITE=true
export DB_PATH=/app/backend/database/ashley_lims.db

# Workflow configuration
export ENABLE_WORKFLOW_AUTOMATION=true
export WORKFLOW_CYCLE_INTERVAL=10000
export SAMPLE_GENERATION_INTERVAL=10000
export MAX_ACTIVE_SAMPLES=200

echo "Environment: $NODE_ENV"
echo "Backend Port: $PORT"
echo "Frontend Port: $FRONTEND_PORT"
echo ""

# Create necessary directories
mkdir -p /app/logs
mkdir -p /app/backend/database
mkdir -p /app/backend/logs

# Start backend in background
echo "Starting backend server..."
cd /app/backend
node server.js > /app/logs/backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 5

# Start frontend
echo "Starting frontend server..."
cd /app
npm run dev -- --host 0.0.0.0 --port $FRONTEND_PORT > /app/logs/frontend.log 2>&1 &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo "   SERVICES STARTED"
echo "========================================="
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Dashboard: http://0.0.0.0:$FRONTEND_PORT"
echo "API: http://0.0.0.0:$PORT/api"
echo "Health: http://0.0.0.0:$PORT/health"
echo "Metrics: http://0.0.0.0:$PORT/metrics"
echo ""

# Keep container running and monitor processes
while true; do
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "Backend process died, restarting..."
        cd /app/backend
        node server.js > /app/logs/backend.log 2>&1 &
        BACKEND_PID=$!
    fi
    
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "Frontend process died, restarting..."
        cd /app
        npm run dev -- --host 0.0.0.0 --port $FRONTEND_PORT > /app/logs/frontend.log 2>&1 &
        FRONTEND_PID=$!
    fi
    
    sleep 10
done