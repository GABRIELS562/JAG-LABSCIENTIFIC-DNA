#!/bin/sh
# Start backend
node backend/server.js &
# Serve frontend production build
npx serve -s dist -l 5173 &
wait
