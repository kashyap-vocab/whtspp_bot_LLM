# 🚀 AutoSherpa Startup Guide

This guide explains how to start both the Inventory Management System and WhatsApp Bot.

## 🎯 Quick Start Options

### **Option 1: Use Setup Scripts (Recommended)**

#### **Windows Users:**
1. Double-click `start-inventory.bat`
2. Choose your startup option:
   - **1** - Start Inventory System only
   - **2** - Start WhatsApp Bot only
   - **3** - Start both services

#### **Linux/Mac Users:**
1. Run `./setup-neon.sh`
2. Choose your startup option (1-3)

### **Option 2: Manual Commands**

#### **Start Inventory System Only:**
```bash
npm start
```
- Runs on port 3000
- Access at: http://localhost:3000

#### **Start WhatsApp Bot Only:**
```bash
npm run whatsapp
```
- Runs on port 3001
- Webhook at: http://localhost:3001/webhook

#### **Start Both Services:**
```bash
npm run both
```
- Inventory: http://localhost:3000
- WhatsApp Bot: http://localhost:3001

## 🔧 Prerequisites

### **1. Install Dependencies**
```bash
npm install
```

### **2. Configure Environment**
Create a `.env` file with:

```env
# NeonDB Configuration
DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here

# WhatsApp Configuration
WHATSAPP_API_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
VERIFY_TOKEN=auto

# Server Ports
PORT=3000
WHATSAPP_PORT=3001
```

## 📱 WhatsApp Bot Setup

### **1. Get WhatsApp Business API Credentials**
1. Go to [Meta Developer Console](https://developers.facebook.com/)
2. Create a WhatsApp Business App
3. Get your access token and phone number ID

### **2. Configure Webhook**
- **URL**: `https://your-domain.com/webhook`
- **Verify Token**: `auto` (or your custom token)
- **Webhook Fields**: `messages`, `message_deliveries`

### **3. Test the Bot**
1. Start the bot: `npm run whatsapp`
2. Send a message to your WhatsApp number
3. Check console logs for incoming messages

## 🚗 Inventory System Setup

### **1. Database Connection**
- The system automatically creates tables on first run
- Ensure your NeonDB connection string is correct
- Check console for "Database tables initialized successfully"

### **2. First Run**
1. Start the system: `npm start`
2. Register as a dealer at: http://localhost:3000/register
3. Login and start managing your inventory

### **3. Features Available**
- ✅ Dealer registration and login
- ✅ Excel upload with validation
- ✅ Image upload (4 per car)
- ✅ Inventory management
- ✅ WhatsApp bot integration
- ✅ PDF generation

## 🔄 Running Both Services

### **Development Mode (with auto-restart):**
```bash
npm run both:dev
```

### **Production Mode:**
```bash
npm run both
```

### **What Happens:**
1. **Inventory System** starts on port 3000
2. **WhatsApp Bot** starts on port 3001
3. Both share the same NeonDB database
4. Bot can access car inventory via API

## 📊 Service Status

### **Inventory System Health:**
- **URL**: http://localhost:3000
- **Status**: Shows dealer dashboard
- **Database**: Auto-creates tables

### **WhatsApp Bot Health:**
- **URL**: http://localhost:3001/health
- **Status**: Database connection test
- **Webhook**: http://localhost:3001/webhook

## 🚨 Troubleshooting

### **Port Already in Use:**
```bash
# Check what's using the port
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Kill the process
taskkill /PID <process_id> /F
```

### **Database Connection Issues:**
1. Check your `.env` file
2. Verify NeonDB project is active
3. Ensure connection string includes `?sslmode=require`

### **WhatsApp Bot Issues:**
1. Verify API credentials in `.env`
2. Check webhook configuration
3. Ensure webhook URL is accessible from internet

### **Inventory System Issues:**
1. Check database connection
2. Verify JWT_SECRET is set
3. Check console for error messages

## 🔗 Integration Points

### **WhatsApp Bot → Inventory System:**
- Bot can fetch car details via API
- Bot saves confirmations to database
- Bot generates PDFs automatically

### **Inventory System → WhatsApp Bot:**
- Car inventory accessible via API
- Image files served from uploads directory
- Confirmation records stored in database

## 📝 Logs and Monitoring

### **Inventory System Logs:**
- Database initialization
- User authentication
- File uploads
- API requests

### **WhatsApp Bot Logs:**
- Incoming messages
- API responses
- Webhook verification
- Error handling

## 🎉 Success Indicators

### **Inventory System Running:**
```
✅ Database tables initialized successfully
🚗 AutoSherpa Inventory System running on port 3000
🌐 Open http://localhost:3000 in your browser
```

### **WhatsApp Bot Running:**
```
🔧 WhatsApp Configuration:
📱 Phone Number ID: [your_id]
🔑 Token available: Yes
🤖 WhatsApp Bot running on port 3001
```

### **Both Services Running:**
- Inventory accessible at http://localhost:3000
- WhatsApp webhook at http://localhost:3001/webhook
- Database shared between both services
- Full integration working

## 🚀 Next Steps

After successful startup:
1. **Register** as a dealer in the inventory system
2. **Upload** your car inventory Excel files
3. **Upload** car images
4. **Test** WhatsApp bot integration
5. **Monitor** both services for any issues

Your AutoSherpa system is now fully operational! 🎯✨
