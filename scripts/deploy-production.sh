#!/bin/bash

# Production Deployment Script for LabScientific LIMS
# Usage: ./scripts/deploy-production.sh

set -e  # Exit on error

echo "🚀 Starting LabScientific LIMS Production Deployment..."

# Check if running as root (not recommended)
if [ "$EUID" -eq 0 ]; then 
   echo "⚠️  Warning: Running as root is not recommended"
   read -p "Continue anyway? (y/N) " -n 1 -r
   echo
   if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
   fi
fi

# Load production environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | sed 's/#.*//g' | xargs)
    echo "✅ Loaded production environment variables"
else
    echo "❌ Error: .env.production file not found!"
    echo "Please create .env.production from .env.production.example"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "18" ]; then
    echo "❌ Error: Node.js 18+ required (current: $(node -v))"
    exit 1
fi

echo "📦 Installing dependencies..."
npm ci --production --silent

echo "📦 Installing backend dependencies..."
cd backend
npm ci --production --silent
cd ..

echo "🏗️ Building production bundle..."
npm run build:prod

echo "🗄️ Setting up database..."
# Create backup of existing database if it exists
if [ -f backend/database/lims_production.db ]; then
    echo "📂 Backing up existing database..."
    cp backend/database/lims_production.db "backend/database/backup_$(date +%Y%m%d_%H%M%S).db"
fi

# Initialize fresh production database
node backend/scripts/init-database.js

echo "🔐 Setting up security..."
# Generate session secret if not set
if [ -z "$SESSION_SECRET" ] || [ "$SESSION_SECRET" = "CHANGE_THIS_IN_PRODUCTION" ]; then
    SESSION_SECRET=$(openssl rand -base64 32)
    echo "Generated new session secret"
    # Update .env.production
    sed -i.bak "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env.production
fi

echo "🧹 Cleaning up..."
# Remove development files
rm -rf src/ public/electron.js public/preload.js
rm -f *.log backend/*.log
rm -rf backend/logs/*.log

echo "📝 Creating production directories..."
mkdir -p backend/logs
mkdir -p backend/uploads
mkdir -p backend/reports
mkdir -p backend/database

echo "🔧 Setting permissions..."
chmod 755 backend/logs backend/uploads backend/reports
chmod 644 backend/database/*.db 2>/dev/null || true

echo "✅ Production build complete!"
echo ""
echo "📋 Next steps:"
echo "1. Review and update .env.production with client-specific values:"
echo "   - CORS_ORIGIN (client's domain)"
echo "   - Google Sheets IDs"
echo "   - Database path"
echo ""
echo "2. Start the application:"
echo "   npm start  (uses PM2)"
echo "   OR"
echo "   node backend/server.js  (direct)"
echo ""
echo "3. Set up reverse proxy (nginx/apache)"
echo "4. Configure SSL certificates"
echo "5. Set up monitoring and backups"
echo ""
echo "🌐 Server will run on port: ${PORT:-3001}"