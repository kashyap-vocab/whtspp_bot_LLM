#!/bin/bash

# Exit immediately if a command fails
set -e

echo "🚀 Starting deployment..."


# Pull latest code (optional, if using git)
# git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build if needed (optional, if you have a build step)
# npm run build

# Start your app
echo "▶️ Starting app with npm run both..."
npm run both

echo "✅ Deployment finished!"
