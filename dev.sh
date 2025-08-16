#!/bin/bash

# LIMS Development Environment Manager
# Usage: ./dev.sh [local|docker|stop]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${GREEN}=====================================${NC}"
    echo -e "${GREEN}  LIMS Development Environment${NC}"
    echo -e "${GREEN}=====================================${NC}"
}

start_local() {
    echo -e "${YELLOW}Starting local development environment...${NC}"
    
    # Kill any existing processes on ports
    echo "Cleaning up existing processes..."
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    
    # Start backend
    echo -e "${GREEN}Starting backend server on port 3001...${NC}"
    cd backend && npm run dev &
    BACKEND_PID=$!
    
    # Start frontend
    echo -e "${GREEN}Starting frontend on port 5173...${NC}"
    cd .. && npm run dev &
    FRONTEND_PID=$!
    
    echo -e "${GREEN}✅ Local development started!${NC}"
    echo -e "Backend: http://localhost:3001"
    echo -e "Frontend: http://localhost:5173"
    echo -e "PIDs: Backend=$BACKEND_PID, Frontend=$FRONTEND_PID"
    
    # Save PIDs for later cleanup
    echo "$BACKEND_PID" > .backend.pid
    echo "$FRONTEND_PID" > .frontend.pid
}

start_docker() {
    echo -e "${YELLOW}Starting Docker development environment...${NC}"
    
    # Stop local if running
    stop_local
    
    # Start Docker containers
    docker-compose -f docker-compose.simple.yml up -d
    
    echo -e "${GREEN}✅ Docker development started!${NC}"
    echo -e "Backend: http://localhost:3001"
    echo -e "Frontend: http://localhost:5173"
    echo -e ""
    echo -e "${YELLOW}To view logs:${NC} docker-compose -f docker-compose.simple.yml logs -f"
    echo -e "${YELLOW}To stop:${NC} ./dev.sh stop"
}

stop_local() {
    echo -e "${YELLOW}Stopping local development...${NC}"
    
    # Kill saved PIDs
    if [ -f .backend.pid ]; then
        kill $(cat .backend.pid) 2>/dev/null || true
        rm .backend.pid
    fi
    
    if [ -f .frontend.pid ]; then
        kill $(cat .frontend.pid) 2>/dev/null || true
        rm .frontend.pid
    fi
    
    # Clean up any remaining processes
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
}

stop_docker() {
    echo -e "${YELLOW}Stopping Docker development...${NC}"
    docker-compose -f docker-compose.simple.yml down
}

stop_all() {
    stop_local
    stop_docker
    echo -e "${GREEN}✅ All development environments stopped${NC}"
}

# Main logic
print_header

case "$1" in
    local)
        start_local
        ;;
    docker)
        start_docker
        ;;
    stop)
        stop_all
        ;;
    *)
        echo "Usage: $0 {local|docker|stop}"
        echo ""
        echo "Options:"
        echo "  local  - Start local development (npm run dev)"
        echo "  docker - Start Docker development with hot reload"
        echo "  stop   - Stop all development environments"
        echo ""
        echo "Current benefits of each:"
        echo "  Local:  Faster, easier debugging, immediate updates"
        echo "  Docker: Consistent environment, isolated, production-like"
        exit 1
        ;;
esac