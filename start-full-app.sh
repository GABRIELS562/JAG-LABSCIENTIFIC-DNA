#!/bin/sh
# Copy production environment if it exists
if [ -f ".env.production" ]; then
  echo "Using production environment configuration..."
  cp .env.production .env
fi

# Build frontend for production with correct API URL
echo "Building frontend for production..."
# Set VITE_API_URL to empty for relative paths
VITE_API_URL="" npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
  echo "Error: Build failed - dist directory not found"
  exit 1
fi

echo "Build successful, starting backend server..."

# Start backend server with static file serving enabled
# The backend will serve both API and the production frontend build
SERVE_STATIC=true NODE_ENV=production PORT=3001 node backend/server.js
