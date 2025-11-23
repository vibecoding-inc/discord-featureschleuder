#!/bin/sh

# Discord Free Games Bot - Entrypoint Script
# This script ensures slash commands are deployed before starting the bot

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

# Deploy slash commands to Discord
echo "🚀 Deploying slash commands to Discord..."
node dist/deploy-commands.js

if [ $? -eq 0 ]; then
  echo "✅ Slash commands deployed successfully"
else
  echo "❌ Failed to deploy slash commands!"
  exit 1
fi

echo ""
echo "🎮 Starting the bot..."
echo ""

# Start the bot
exec node dist/index.js
