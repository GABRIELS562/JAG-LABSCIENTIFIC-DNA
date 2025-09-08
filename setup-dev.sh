#!/bin/bash

# JAG LIMS Development Setup with PostgreSQL
# Run this to set up your development environment

set -e

echo "🚀 JAG LIMS Development Setup"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
cd backend && npm install && cd ..

echo -e "${YELLOW}🐘 Starting PostgreSQL for development...${NC}"
docker-compose -f docker-compose.dev-postgres.yml up -d

echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
sleep 10

# Test database connection
echo -e "${YELLOW}🔍 Testing database connection...${NC}"
docker exec lims-postgres-dev pg_isready -U lims_dev -d jagdna_lims_dev || {
    echo -e "${RED}❌ PostgreSQL connection failed${NC}"
    exit 1
}

echo -e "${GREEN}✅ PostgreSQL is ready!${NC}"
echo ""
echo -e "${GREEN}🎉 Development environment ready!${NC}"
echo ""
echo "Start the application:"
echo -e "${YELLOW}  cd backend && npm run dev${NC}"
echo ""
echo "Database access:"
echo -e "${YELLOW}  Host: localhost:5432${NC}"
echo -e "${YELLOW}  Database: jagdna_lims_dev${NC}"
echo -e "${YELLOW}  User: lims_dev${NC}"
echo -e "${YELLOW}  Password: dev_password${NC}"
echo ""
echo "Optional pgAdmin:"
echo -e "${YELLOW}  docker-compose -f docker-compose.dev-postgres.yml --profile admin up -d${NC}"
echo -e "${YELLOW}  http://localhost:5050 (admin@jagdna.local / admin123)${NC}"
echo ""
echo -e "${GREEN}💡 Ready for DevOps showcase development!${NC}"