#!/bin/sh

# Discord Free Games Bot - Entrypoint Script
# This script ensures slash commands are deployed before starting the bot

# Exit immediately if any command fails
set -e

echo "🎮 Starting Discord Free Games Bot..."
echo ""

# Check required environment variables
if [ -z "$DISCORD_TOKEN" ]; then
  echo "❌ Error: DISCORD_TOKEN is not set!"
  exit 1
fi

if [ -z "$CLIENT_ID" ]; then
  echo "❌ Error: CLIENT_ID is not set!"
  exit 1
fi

echo "✅ Environment variables validated"

# Check if deploy-commands.js exists
if [ ! -f "dist/deploy-commands.js" ]; then
  echo "❌ Error: dist/deploy-commands.js not found!"
  echo "The application may not be built correctly."
  exit 1
fi

# Deploy slash commands to Discord
echo "🚀 Deploying slash commands to Discord..."
node dist/deploy-commands.js
echo "✅ Slash commands deployed successfully"

echo ""
echo "🎮 Starting the bot..."
echo ""

# Start the bot
exec node dist/index.js
