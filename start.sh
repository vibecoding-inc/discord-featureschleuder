#!/bin/bash

# Discord Free Games Bot - Quick Start Script
# This script helps you quickly set up and run the bot

set -e

echo "🎮 Discord Free Games Bot - Quick Start"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js 16.x or higher from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required!"
    echo "Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ .env file created from .env.example"
        echo ""
        echo "⚠️  IMPORTANT: Please edit .env and add your Discord bot credentials:"
        echo "   - DISCORD_TOKEN"
        echo "   - CLIENT_ID"
        echo ""
        read -p "Press Enter after you've edited .env, or Ctrl+C to exit..."
    else
        echo "❌ .env.example not found!"
        exit 1
    fi
else
    echo "✅ .env file already exists"
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo ""
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Build the project
echo ""
echo "🔨 Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed!"
    exit 1
fi

# Ask if user wants to deploy commands
echo ""
read -p "Do you want to deploy slash commands to Discord? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Deploying commands..."
    npm run deploy-commands
    echo "✅ Commands deployed"
fi

# Start the bot
echo ""
echo "🎮 Starting the bot..."
echo "Press Ctrl+C to stop"
echo ""
npm start
