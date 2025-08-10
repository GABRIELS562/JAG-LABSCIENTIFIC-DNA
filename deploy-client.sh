#!/bin/bash

# LabScientific LIMS - Client Deployment Script
# This script deploys the LIMS application for client use

set -e

echo "🚀 LabScientific LIMS - Client Deployment Script"
echo "================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first."
    echo "   Download from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please ensure Docker Desktop is properly installed."
    exit 1
fi

echo "✅ Docker is installed and ready"

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Build the application
echo "🏗️  Building application..."
docker-compose build --no-cache

# Start the services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🔍 Checking service health..."
if curl -f http://localhost/health &> /dev/null; then
    echo "✅ Application is running successfully!"
    echo ""
    echo "🌐 Access your LIMS application at:"
    echo "   http://localhost"
    echo ""
    echo "📊 To view application status:"
    echo "   docker-compose ps"
    echo ""
    echo "📝 To view logs:"
    echo "   docker-compose logs -f"
    echo ""
    echo "🛑 To stop the application:"
    echo "   docker-compose down"
    echo ""
    echo "🔄 To restart the application:"
    echo "   docker-compose restart"
    echo ""
else
    echo "❌ Application health check failed. Checking logs..."
    docker-compose logs --tail=20
    echo ""
    echo "Please check the logs above for errors."
fi

echo "================================================="
echo "✅ Deployment script completed!"