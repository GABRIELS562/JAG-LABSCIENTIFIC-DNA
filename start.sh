#!/bin/bash

# JAG DNA Scientific LIMS - Startup Script
# Ensures proper startup of both frontend and backend with live sample flow

echo "========================================="
echo "   JAG DNA SCIENTIFIC LIMS LAUNCHER"
echo "   Laboratory Information Management System"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

# Kill any existing processes on our ports
echo -e "${YELLOW}Checking for existing processes...${NC}"
if check_port 3001; then
    echo -e "${YELLOW}Killing existing process on port 3001...${NC}"
    lsof -ti:3001 | xargs kill -9 2>/dev/null
    sleep 2
fi

if check_port 5173; then
    echo -e "${YELLOW}Killing existing process on port 5173...${NC}"
    lsof -ti:5173 | xargs kill -9 2>/dev/null
    sleep 2
fi

# Check if node_modules exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd backend && npm install && cd ..
fi

# Start Backend Server
echo -e "${GREEN}Starting Backend Server...${NC}"
cd backend
node server.js > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
echo -e "${YELLOW}Waiting for backend to initialize...${NC}"
sleep 5

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}Backend failed to start! Check logs/backend.log${NC}"
    exit 1
fi

# Test backend health
curl -s http://localhost:3001/health > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Backend is starting up...${NC}"
    sleep 5
fi

echo -e "${GREEN}✓ Backend running on http://localhost:3001${NC}"

# Start Frontend Server
echo -e "${GREEN}Starting Frontend Server...${NC}"
npm run dev > logs/frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to be ready
echo -e "${YELLOW}Waiting for frontend to initialize...${NC}"
sleep 5

# Check if frontend is running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}Frontend failed to start! Check logs/frontend.log${NC}"
    kill $BACKEND_PID
    exit 1
fi

echo -e "${GREEN}✓ Frontend running on http://localhost:5173${NC}"

echo ""
echo "========================================="
echo -e "${GREEN}   LIMS SYSTEM SUCCESSFULLY STARTED!${NC}"
echo "========================================="
echo ""
echo "📊 Dashboard: http://localhost:5173"
echo "🔗 API: http://localhost:3001/api"
echo "❤️ Health: http://localhost:3001/health"
echo "📈 Metrics: http://localhost:3001/metrics"
echo "🎛️ Admin: http://localhost:3001/admin"
echo ""
echo "📌 Sample Generation: Active (3 samples/10 seconds)"
echo "📌 Workflow Automation: Active (10x speed)"
echo "📌 Max Active Samples: 200"
echo "📌 Auto-cleanup: Enabled (1 hour after completion)"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Function to handle shutdown
shutdown() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}Services stopped successfully${NC}"
    exit 0
}

# Trap Ctrl+C
trap shutdown INT

# Monitor processes
while true; do
    # Check if processes are still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${RED}Backend crashed! Check logs/backend.log${NC}"
        kill $FRONTEND_PID 2>/dev/null
        exit 1
    fi
    
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${RED}Frontend crashed! Check logs/frontend.log${NC}"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    
    sleep 10
done