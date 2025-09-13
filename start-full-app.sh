#!/bin/sh
# Start backend
node backend/server.js &
# Start frontend
npm run dev -- --host 0.0.0.0 --port 5173 &
# Keep container running
wait
