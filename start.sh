#!/bin/sh

# Check if we should run the bot
# 1. Custom variable IS_BOT_SERVICE
# 2. Service name contains "bot" (case insensitive)
if [ "$IS_BOT_SERVICE" = "true" ] || echo "$RAILWAY_SERVICE_NAME" | grep -iq "bot"; then
    echo "🤖 Detected Bot Service Environment"
    echo "🚀 Starting Telegram Bot..."
    npm run start:bot
else
    echo "🎮 Detected Game Server Environment (Default)"
    echo "🚀 Starting Game Server..."
    npm start
fi
