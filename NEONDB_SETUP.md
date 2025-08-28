# NeonDB Setup Guide for AutoSherpa Inventory System

This guide will help you set up NeonDB (PostgreSQL-as-a-Service) for your AutoSherpa inventory system.

## What is NeonDB?

NeonDB is a serverless PostgreSQL service that provides:
- **Free Tier**: 3GB storage, 0.5GB RAM
- **Automatic Scaling**: Scales based on usage
- **Built-in Connection Pooling**: Optimized for web applications
- **Global Distribution**: Low-latency access worldwide
- **No Installation Required**: Fully managed service

## Step-by-Step Setup

### 1. Create NeonDB Account

1. Go to [https://console.neon.tech/](https://console.neon.tech/)
2. Click "Sign Up" and create an account
3. Verify your email address

### 2. Create a New Project

1. Log in to NeonDB Console
2. Click "Create Project"
3. Choose a project name (e.g., "autosherpa-inventory")
4. Select a region close to you
5. Click "Create Project"

### 3. Get Your Connection String

1. In your project dashboard, click "Connection Details"
2. Copy the connection string that looks like:
   ```
   postgresql://username:password@hostname/database?sslmode=require
   ```

### 4. Configure Your Application

#### Option A: Use the Setup Scripts

**Windows Users:**
- Double-click `start-inventory.bat`
- Edit the created `.env` file with your NeonDB connection string

**Linux/Mac Users:**
- Run `./setup-neon.sh`
- Edit the created `.env` file with your NeonDB connection string

#### Option B: Manual Setup

1. Create a `.env` file in your project root
2. Add your configuration:

```env
# NeonDB Configuration
DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production

# Server Configuration
PORT=3000
```

### 5. Start Your Application

```bash
# Install dependencies (if not done already)
npm install

# Start the application
npm start
```

## Database Schema

The system will automatically create all required tables when you first run it:
- `dealers` - Dealer accounts and information
- `cars` - Car inventory details
- `car_images` - Car image storage
- `bot_confirmations` - WhatsApp bot interactions

## Connection Testing

When you start the application, you should see:
```
Connected to NeonDB successfully
```

If you see connection errors, check:
1. Your connection string in `.env`
2. Your NeonDB project is active
3. Your IP is not blocked by NeonDB

## Benefits of Using NeonDB

✅ **No Installation**: No need to install PostgreSQL locally
✅ **Automatic Backups**: Daily backups included
✅ **Scalability**: Automatically scales with your usage
✅ **Security**: Built-in SSL and security features
✅ **Monitoring**: Built-in performance monitoring
✅ **Free Tier**: Start with 3GB storage for free

## Troubleshooting

### Connection Issues
- Ensure your connection string includes `?sslmode=require`
- Check if your NeonDB project is active
- Verify username and password are correct

### Performance Issues
- NeonDB automatically scales, but free tier has limits
- Monitor your usage in the NeonDB dashboard
- Consider upgrading if you exceed free tier limits

### SSL Issues
- NeonDB requires SSL connections
- The connection string should include `?sslmode=require`
- If you get SSL errors, check your connection string format

## Support

- **NeonDB Documentation**: [https://neon.tech/docs](https://neon.tech/docs)
- **NeonDB Community**: [https://community.neon.tech/](https://community.neon.tech/)
- **AutoSherpa Issues**: Check the main README.md for troubleshooting

## Next Steps

After setting up NeonDB:
1. Start your application with `npm start`
2. Register as a dealer at `http://localhost:3000/register`
3. Upload your car inventory Excel files
4. Upload car images
5. Integrate with your WhatsApp bot

Your inventory system is now ready to use with NeonDB! 🚗✨
