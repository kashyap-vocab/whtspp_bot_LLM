#!/bin/bash

# Exit immediately if a command fails
set -e

echo "🚀 Starting deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run both apps in background
echo "▶ Starting both apps..."
npm run start 

echo "✅ Deployment finished! Both apps are running."
wait  # keeps script alive until both processes exit