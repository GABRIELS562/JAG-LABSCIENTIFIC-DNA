#!/bin/bash

# LabScientific LIMS Health Check Script
# Verifies all system components are running correctly

set -e

echo "🏥 LabScientific LIMS Health Check"
echo "==================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Health check results
HEALTH_STATUS=0

# Function to check service
check_service() {
    local service_name=$1
    local check_command=$2
    
    echo -n "Checking $service_name... "
    
    if eval $check_command > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        HEALTH_STATUS=1
        return 1
    fi
}

# Function to check port
check_port() {
    local port=$1
    local service=$2
    
    echo -n "Checking port $port ($service)... "
    
    if nc -z localhost $port 2>/dev/null; then
        echo -e "${GREEN}✓ OPEN${NC}"
        return 0
    else
        echo -e "${RED}✗ CLOSED${NC}"
        HEALTH_STATUS=1
        return 1
    fi
}

# Function to check file/directory
check_path() {
    local path=$1
    local type=$2
    
    echo -n "Checking $type: $path... "
    
    if [ -e "$path" ]; then
        echo -e "${GREEN}✓ EXISTS${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ MISSING${NC}"
        return 1
    fi
}

echo "1. System Services"
echo "------------------"
check_port 3000 "Frontend"
check_port 3001 "Backend API"
check_service "Database" "sqlite3 backend/database/ashley_lims.db 'SELECT 1'"

echo ""
echo "2. Critical Paths"
echo "-----------------"
check_path "backend/database/ashley_lims.db" "Database"
check_path "backend/logs" "Log Directory"
check_path "backend/uploads" "Upload Directory"
check_path "backend/reports" "Reports Directory"
check_path "dist" "Frontend Build"

echo ""
echo "3. API Endpoints"
echo "----------------"
check_service "Health Endpoint" "curl -f http://localhost:3001/api/health"
check_service "Auth Endpoint" "curl -f http://localhost:3001/api/auth/status"

echo ""
echo "4. External Dependencies"
echo "------------------------"
check_path "external/osiris_software/Osiris-2.16.app/Contents/MacOS/osiris" "Osiris"

echo ""
echo "5. Performance Metrics"
echo "----------------------"
# Check disk space
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
echo -n "Disk Usage: "
if [ $DISK_USAGE -lt 80 ]; then
    echo -e "${GREEN}$DISK_USAGE% (OK)${NC}"
else
    echo -e "${RED}$DISK_USAGE% (HIGH)${NC}"
    HEALTH_STATUS=1
fi

# Check memory if on Linux/Mac
if command -v free > /dev/null 2>&1; then
    MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
    echo -n "Memory Usage: "
    if [ $MEM_USAGE -lt 80 ]; then
        echo -e "${GREEN}$MEM_USAGE% (OK)${NC}"
    else
        echo -e "${YELLOW}$MEM_USAGE% (HIGH)${NC}"
    fi
fi

echo ""
echo "==================================="
if [ $HEALTH_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ All systems operational${NC}"
    echo "LIMS is ready for use at http://localhost"
else
    echo -e "${RED}✗ Some issues detected${NC}"
    echo "Please check the failed components above"
fi
echo ""

exit $HEALTH_STATUS