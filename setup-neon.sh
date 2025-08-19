#!/bin/bash

echo "Setting up AutoSherpa Inventory System with NeonDB..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install npm first."
    exit 1
fi

echo "Node.js and npm are installed."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Error: Failed to install dependencies."
        exit 1
    fi
    echo "Dependencies installed successfully."
else
    echo "Dependencies already installed."
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file with NeonDB configuration..."
    cat > .env << EOF
# NeonDB Configuration
DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production

# Server Configuration
PORT=3000

# IMPORTANT: Replace the DATABASE_URL with your actual NeonDB connection string
# Get this from your NeonDB dashboard: https://console.neon.tech/
# Format: postgresql://username:password@hostname/database?sslmode=require
EOF
    echo ".env file created. Please edit it with your NeonDB credentials."
    echo ""
    echo "To get your NeonDB connection string:"
    echo "1. Go to https://console.neon.tech/"
    echo "2. Create a new project or select existing one"
    echo "3. Copy the connection string from the dashboard"
    echo "4. Replace the DATABASE_URL in .env file"
    echo ""
    echo "After editing .env, run: npm start"
    exit 0
fi

echo ".env file already exists."

# Start the application
echo "Starting the application..."
echo ""
echo "Choose an option:"
echo "1. Start Inventory System only"
echo "2. Start WhatsApp Bot only"
echo "3. Start both services"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo "Starting Inventory System..."
        npm start
        ;;
    2)
        echo "Starting WhatsApp Bot..."
        npm run whatsapp
        ;;
    3)
        echo "Starting both services..."
        npm run both
        ;;
    *)
        echo "Invalid choice. Starting Inventory System by default..."
        npm start
        ;;
esac
