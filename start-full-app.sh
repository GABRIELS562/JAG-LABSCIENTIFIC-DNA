#!/bin/sh
# Build frontend for production
echo "Building frontend for production..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
  echo "Error: Build failed - dist directory not found"
  exit 1
fi

echo "Build successful, starting backend server..."

# Start backend server with static file serving enabled
# The backend will serve both API and the production frontend build
SERVE_STATIC=true NODE_ENV=production PORT=3001 node backend/server.js
