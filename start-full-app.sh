#!/bin/sh
# Build frontend for production
echo "Building frontend..."
npm run build
# Start backend
echo "Starting backend on port 3001..."
node backend/server.js &
# Serve frontend production build
echo "Serving frontend from dist folder on port 5173..."
npx serve -s dist -l 5173 &
wait
