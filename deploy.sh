#!/bin/bash

echo "🚀 Deploying plaid-app..."

# Pull latest code
echo "📦 Pulling latest code..."
git pull origin main

# Install dependencies
echo "📥 Installing dependencies..."
npm install --production

# Check if .env exists
if [ ! -f .env ]; then
  echo "⚠️  .env file not found! Please create it:"
  echo "    nano .env"
  exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
  echo "📦 Installing PM2..."
  npm install -g pm2
fi

# Restart or start with PM2
if pm2 list | grep -q "plaid-app"; then
  echo "🔄 Restarting plaid-app..."
  pm2 restart plaid-app
else
  echo "▶️  Starting plaid-app..."
  pm2 start src/server.js --name plaid-app
fi

# Save PM2 process list
pm2 save

echo "✅ Deploy complete!"
echo "🌐 Server running on port 5009"
echo ""
echo "Useful commands:"
echo "  pm2 logs plaid-app     → loglarni ko'rish"
echo "  pm2 status             → holatini ko'rish"
echo "  pm2 restart plaid-app  → qayta ishga tushirish"