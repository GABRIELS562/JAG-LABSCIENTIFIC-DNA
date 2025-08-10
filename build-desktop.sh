#!/bin/bash

# LabScientific LIMS - Desktop Application Builder
# This script builds a standalone desktop application

set -e

echo "🖥️  LabScientific LIMS - Desktop Application Builder"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    cd backend && npm install && cd ..
fi

# Build the frontend
echo "🏗️  Building frontend..."
npm run build

# Build the Electron application
echo "📱 Building desktop application..."
npm run build:electron:prod

echo ""
echo "✅ Desktop application built successfully!"
echo ""
echo "📁 Application files are in the 'dist' folder:"
ls -la dist/ 2>/dev/null || echo "   (Check for .dmg, .exe, or .AppImage files)"
echo ""
echo "📋 To distribute:"
echo "   1. Copy the installer file (.exe, .dmg, or .AppImage) to client PC"
echo "   2. Double-click to install"
echo "   3. Launch from desktop/applications menu"
echo ""
echo "=================================================="