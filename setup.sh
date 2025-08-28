#!/bin/bash

# JAG DNA Scientific LIMS - One-Command Setup Script
# For Paternity Lab with 3500 Genetic Analyzer & LIZ 500

set -e

echo "========================================="
echo "  JAG DNA Scientific LIMS Setup"
echo "  Paternity Lab Configuration"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check Node.js installation
echo ""
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ and try again."
    exit 1
fi
print_status "Node.js installed: $(node -v)"

# Check npm installation
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm and try again."
    exit 1
fi
print_status "npm installed: $(npm -v)"

# Install dependencies
echo ""
echo "Installing dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    print_status "Dependencies installed"
else
    print_warning "Dependencies already installed, skipping..."
fi

# Create necessary directories
echo ""
echo "Creating required directories..."
mkdir -p backend/database
mkdir -p backend/logs
mkdir -p backend/reports
mkdir -p backend/osiris_workspace/input
mkdir -p backend/osiris_workspace/output
mkdir -p backend/osiris_workspace/config
print_status "Directories created"

# Initialize database
echo ""
echo "Initializing database..."
if [ ! -f "backend/database/ashley_lims.db" ]; then
    # Create empty database file
    touch backend/database/ashley_lims.db
    print_status "Database file created"
else
    print_warning "Database already exists"
fi

# Create environment file if it doesn't exist
echo ""
echo "Setting up environment variables..."
if [ ! -f ".env" ]; then
    cat > .env << EOL
# JAG DNA Scientific LIMS Environment Variables
NODE_ENV=development
PORT=3001
VITE_API_URL=http://localhost:3001

# Database
DB_PATH=./backend/database/ashley_lims.db

# Features
ENABLE_DEVOPS_FEATURES=true
ENABLE_FORENSIC_SIMULATOR=true

# Lab Configuration
LAB_NAME="JAG DNA Scientific"
ANALYZER_TYPE="3500 Genetic Analyzer"
STR_KIT="PowerPlex ESX 17"
SIZE_STANDARD="LIZ 500"

# Performance Settings
SIMULATION_INTERVAL=300000
MAX_BATCH_SIZE=96
PCR_PLATE_SIZE=96
ELECTRO_PLATE_SIZE=16

# Security (Change these in production)
JWT_SECRET=your-secret-key-change-in-production
SESSION_SECRET=your-session-secret-change-in-production
EOL
    print_status "Environment file created (.env)"
    print_warning "Please update JWT_SECRET and SESSION_SECRET in .env for production"
else
    print_warning "Environment file already exists"
fi

# Initialize database with schema
echo ""
echo "Initializing database schema..."
node -e "
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'backend/database/ashley_lims.db'));

// Create essential tables
const tables = [
  'test_cases',
  'samples',
  'genetic_profiles',
  'batches',
  'qc_metrics',
  'case_timeline'
];

console.log('Checking database tables...');
const existingTables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all();

if (existingTables.length === 0) {
  console.log('Database is empty, will be initialized on first run');
} else {
  console.log('Found ' + existingTables.length + ' existing tables');
}

db.close();
"
print_status "Database schema checked"

# Generate initial test data
echo ""
echo "Would you like to generate sample test data? (y/n)"
read -r generate_data

if [[ $generate_data == "y" || $generate_data == "Y" ]]; then
    echo "Generating test data..."
    node -e "
    const Database = require('better-sqlite3');
    const path = require('path');
    const db = new Database(path.join(__dirname, 'backend/database/ashley_lims.db'));
    
    // Simple test data generation
    console.log('Generating test cases and samples...');
    
    // This will be populated by the forensic simulator
    console.log('Test data will be automatically generated when the server starts');
    
    db.close();
    "
    print_status "Test data generation prepared"
fi

# Check if ports are available
echo ""
echo "Checking port availability..."
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warning "Port 3001 is already in use (backend will use 3002)"
else
    print_status "Port 3001 is available for backend"
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warning "Port 5173 is already in use (frontend)"
else
    print_status "Port 5173 is available for frontend"
fi

# Create startup script
echo ""
echo "Creating startup scripts..."
cat > start.sh << 'EOL'
#!/bin/bash
# Start both frontend and backend servers

echo "Starting JAG DNA Scientific LIMS..."

# Function to cleanup on exit
cleanup() {
    echo "Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup EXIT INT TERM

# Start backend server
echo "Starting backend server..."
ENABLE_DEVOPS_FEATURES=true npm run server &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 3

# Start frontend server
echo "Starting frontend server..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo "  JAG DNA Scientific LIMS is running!"
echo "========================================="
echo ""
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:3001"
echo "  Health:   http://localhost:3001/health"
echo "  Metrics:  http://localhost:3001/metrics"
echo ""
echo "  Press Ctrl+C to stop all servers"
echo ""

# Keep script running
wait
EOL

chmod +x start.sh
print_status "Startup script created (./start.sh)"

# Create stop script
cat > stop.sh << 'EOL'
#!/bin/bash
# Stop all LIMS servers

echo "Stopping JAG DNA Scientific LIMS servers..."

# Kill processes on ports
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:3002 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

echo "Servers stopped"
EOL

chmod +x stop.sh
print_status "Stop script created (./stop.sh)"

# Summary
echo ""
echo "========================================="
echo -e "${GREEN}  Setup Complete!${NC}"
echo "========================================="
echo ""
echo "Lab Configuration:"
echo "  • 3500 Genetic Analyzer"
echo "  • PowerPlex ESX 17 STR Kit"
echo "  • LIZ 500 Size Standard"
echo ""
echo "To start the application:"
echo -e "  ${GREEN}./start.sh${NC}"
echo ""
echo "Or start servers individually:"
echo "  Backend:  npm run server"
echo "  Frontend: npm run dev"
echo ""
echo "Access the application at:"
echo "  http://localhost:5173"
echo ""
echo "DevOps endpoints:"
echo "  Health:  http://localhost:3001/health"
echo "  Metrics: http://localhost:3001/metrics"
echo ""
echo "To stop all servers:"
echo -e "  ${RED}./stop.sh${NC}"
echo ""
print_warning "Remember to update .env file for production deployment"
echo ""