@echo off
echo Starting AutoSherpa Inventory System...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo Node.js and npm are installed.

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo Error: Failed to install dependencies.
        pause
        exit /b 1
    )
    echo Dependencies installed successfully.
) else (
    echo Dependencies already installed.
)

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo Creating .env file with NeonDB configuration...
    (
        echo # NeonDB Configuration
        echo DATABASE_URL=postgresql://neondb_owner:npg_wH57jYeGnfts@ep-polished-star-ab5tvvgr-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
        echo.
        echo # JWT Configuration
        echo JWT_SECRET=7e8d0785505aa0e11aabebcd90b398153ec1b21fb3e4ba175da3718f650197672345f33845adf62a7bc343b205d6e05cd0c4f8b0d49ade5ef8a90645e6faadae
        echo.
        echo # Server Configuration
        echo PORT=3000
        echo.
        echo # IMPORTANT: Replace the DATABASE_URL with your actual NeonDB connection string
        echo # Get this from your NeonDB dashboard: https://console.neon.tech/
        echo # Format: postgresql://username:password@hostname/database?sslmode=require
    ) > .env
    echo .env file created. Please edit it with your NeonDB credentials.
    echo.
    echo To get your NeonDB connection string:
    echo 1. Go to https://console.neon.tech/
    echo 2. Create a new project or select existing one
    echo 3. Copy the connection string from the dashboard
    echo 4. Replace the DATABASE_URL in .env file
    echo.
    pause
    exit /b 0
)

echo .env file already exists.

REM Start the application
echo Starting the application...
echo.
echo Choose an option:
echo 1. Start Inventory System only
echo 2. Start WhatsApp Bot only  
echo 3. Start both services
echo.
set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" (
    echo Starting Inventory System...
    npm start
) else if "%choice%"=="2" (
    echo Starting WhatsApp Bot...
    npm run whatsapp
) else if "%choice%"=="3" (
    echo Starting both services...
    npm run both
) else (
    echo Invalid choice. Starting Inventory System by default...
    npm start
)

pause
