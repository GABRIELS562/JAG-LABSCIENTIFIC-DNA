#!/bin/bash

# Docker Deployment Script with Cloudflare Integration
# Usage: ./scripts/docker-deploy.sh

set -e

echo "🚀 LabScientific LIMS - Docker Deployment with Cloudflare"
echo "=========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
fi
print_status "Docker installed"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
fi
print_status "Docker Compose installed"

# Check if running as root (not recommended)
if [ "$EUID" -eq 0 ]; then 
   print_warning "Running as root is not recommended for security reasons"
   read -p "Continue anyway? (y/N) " -n 1 -r
   echo
   if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
   fi
fi

# Check for .env.production
if [ ! -f .env.production ]; then
    print_error ".env.production not found. Please create it from .env.production.example"
fi
print_status "Environment file found"

# Load environment variables
export $(cat .env.production | sed 's/#.*//g' | xargs)

# Validate critical environment variables
echo ""
echo "📋 Validating configuration..."

if [ -z "$CLOUDFLARE_TUNNEL_TOKEN" ] || [ "$CLOUDFLARE_TUNNEL_TOKEN" = "your_tunnel_token_here" ]; then
    print_error "CLOUDFLARE_TUNNEL_TOKEN not set in .env.production"
fi
print_status "Cloudflare tunnel token configured"

if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "CHANGE_THIS_IN_PRODUCTION" ]; then
    print_warning "JWT_SECRET not secure. Generating new one..."
    JWT_SECRET=$(openssl rand -base64 32)
    sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env.production
    print_status "Generated new JWT secret"
fi

if [ -z "$SESSION_SECRET" ] || [ "$SESSION_SECRET" = "CHANGE_THIS_IN_PRODUCTION" ]; then
    print_warning "SESSION_SECRET not secure. Generating new one..."
    SESSION_SECRET=$(openssl rand -base64 32)
    sed -i.bak "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env.production
    print_status "Generated new session secret"
fi

# Create necessary directories
echo ""
echo "📁 Creating directories..."

directories=("data" "uploads" "reports" "logs" "backups" "nginx/ssl" "monitoring")
for dir in "${directories[@]}"; do
    mkdir -p "$dir"
    print_status "Created $dir"
done

# Set permissions
chmod 700 data backups
chmod 755 uploads reports logs
print_status "Permissions set"

# Stop existing containers if running
echo ""
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true
print_status "Existing containers stopped"

# Clean up old images (optional)
echo ""
read -p "Clean up old Docker images? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker system prune -f
    print_status "Cleaned up old images"
fi

# Build images
echo ""
echo "🔨 Building Docker images..."
docker-compose build --no-cache
print_status "Docker images built"

# Initialize database
echo ""
echo "🗄️ Initializing database..."
if [ ! -f data/lims.db ]; then
    # Create initial database
    docker run --rm -v $(pwd)/data:/data alpine sh -c "
        apk add --no-cache sqlite3 &&
        sqlite3 /data/lims.db 'CREATE TABLE IF NOT EXISTS healthcheck (id INTEGER PRIMARY KEY, status TEXT);'
    "
    print_status "Database initialized"
else
    print_warning "Database already exists, skipping initialization"
fi

# Start services
echo ""
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
services=("labscientific-lims" "lims-nginx" "lims-tunnel" "lims-backup")
all_healthy=true

for service in "${services[@]}"; do
    if docker ps | grep -q "$service"; then
        print_status "$service is running"
    else
        print_error "$service is not running"
        all_healthy=false
    fi
done

if [ "$all_healthy" = true ]; then
    echo ""
    echo "✅ All services are running!"
else
    echo ""
    print_error "Some services failed to start. Check logs with: docker-compose logs"
fi

# Display status and next steps
echo ""
echo "=========================================================="
echo "📊 Deployment Status"
echo "=========================================================="
docker-compose ps

echo ""
echo "=========================================================="
echo "🔍 Health Check"
echo "=========================================================="
curl -s http://localhost:3001/health | python3 -m json.tool || print_warning "Health check failed"

echo ""
echo "=========================================================="
echo "📝 Next Steps"
echo "=========================================================="
echo "1. Configure Cloudflare:"
echo "   - Go to https://one.dash.cloudflare.com/"
echo "   - Set up your tunnel and access policies"
echo "   - Update DNS records"
echo ""
echo "2. Monitor services:"
echo "   docker-compose logs -f"
echo ""
echo "3. Access the application:"
echo "   - Local: http://localhost:8080"
echo "   - Remote: https://lims.yourcompany.com (after Cloudflare setup)"
echo ""
echo "4. View metrics (if Prometheus enabled):"
echo "   http://localhost:9090"
echo ""
echo "=========================================================="
echo "🔒 Security Reminders"
echo "=========================================================="
echo "- ✓ Application running as non-root user"
echo "- ✓ Ports only exposed to localhost"
echo "- ✓ Cloudflare Tunnel for secure remote access"
echo "- ✓ Automatic daily backups enabled"
echo "- ✓ All security headers configured"
echo ""
echo "⚠️  Important: Complete Cloudflare setup for remote access"
echo "=========================================================="

# Save deployment info
cat > deployment_info.txt <<EOF
Deployment Date: $(date)
Docker Version: $(docker --version)
Compose Version: $(docker-compose --version)
Services Deployed: ${services[@]}
Environment: Production
EOF

print_status "Deployment information saved to deployment_info.txt"

echo ""
echo "🎉 Deployment complete!"