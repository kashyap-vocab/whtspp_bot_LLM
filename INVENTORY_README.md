# AutoSherpa Car Dealership Inventory Management System

A comprehensive inventory management system for car dealerships with WhatsApp bot integration, Excel upload capabilities, image management, and PDF generation.

## Features

- **User Authentication**: Dealer registration and login system
- **Excel Import**: Upload car details via Excel with validation
- **Image Management**: Upload up to 4 images per car (front, back, side, interior)
- **Inventory Management**: View, search, and filter car inventory
- **WhatsApp Bot Integration**: Fetch car details and save confirmations
- **PDF Generation**: Automatically generate PDFs from bot interactions
- **Responsive UI**: Modern, mobile-friendly interface

## Prerequisites

- **Node.js** (v14 or higher)
- **npm** (comes with Node.js)
- **NeonDB Account** (PostgreSQL-as-a-Service)

## Quick Start

### 1. Clone/Download the Project
```bash
git clone <repository-url>
cd Autosherpa_Whatsapp_final
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up NeonDB

#### Option A: Use the Batch Script (Windows)
1. Double-click `start-inventory.bat`
2. It will create a `.env` file automatically
3. Edit the `.env` file with your NeonDB credentials

#### Option B: Manual Setup
1. Go to [NeonDB Console](https://console.neon.tech/)
2. Create a new project or select an existing one
3. Copy the connection string from your dashboard
4. Create a `.env` file in the project root:

```env
# NeonDB Configuration
DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production

# Server Configuration
PORT=3000
```

### 4. Initialize Database
The system will automatically create the required tables when you first run it.

### 5. Start the Application
```bash
# For development (with auto-restart)
npm run dev

# For production
npm start
```

### 6. Access the Application
Open your browser and navigate to:
- **Main Page**: `http://localhost:3000`
- **Dashboard**: `http://localhost:3000/dashboard` (after login)

## Usage Guide

### 1. Dealer Registration
- Visit the registration page
- Fill in your details (username, email, password, company info)
- Submit to create your account

### 2. Login
- Use your registered credentials to log in
- You'll be redirected to the dashboard

### 3. Upload Car Details
- Go to "Upload Cars" from the dashboard
- Download the sample Excel template
- Fill in car details (registration number, brand, model, etc.)
- Upload the Excel file
- The system validates all fields and logs empty values to console

### 4. Upload Car Images
- Go to "Upload Images" from the dashboard
- Enter the car's registration number
- Upload up to 4 images (front, back, side, interior)
- Images are saved using the registration number

### 5. View Inventory
- Go to "View Cars" from the dashboard
- Search and filter cars by various criteria
- Export filtered results to CSV
- View detailed car information

### 6. WhatsApp Bot Integration
- The bot can fetch car details from your uploaded inventory
- All bot confirmations are automatically saved
- View confirmations in the "Bot Confirmations" section
- Download PDFs of bot interactions

## API Endpoints

### Authentication
- `POST /api/register` - Dealer registration
- `POST /api/login` - Dealer login
- `POST /api/logout` - Dealer logout

### Car Management
- `POST /api/upload-cars` - Upload Excel with car details
- `POST /api/upload-images` - Upload car images
- `GET /api/cars` - Get car inventory
- `GET /api/cars/:id` - Get specific car details

### Bot Confirmations
- `GET /api/bot-confirmations` - Get bot confirmation records
- `POST /api/bot-confirmations` - Save new bot confirmation

## Database Schema

The system uses the following tables:
- `dealers` - Dealer information and authentication
- `cars` - Car details and specifications
- `car_images` - Image paths linked to cars
- `bot_confirmations` - WhatsApp bot interaction records

## File Structure

```
Autosherpa_Whatsapp_final/
├── app.js                 # Main Express application
├── db/
│   ├── index.js          # Database connection (NeonDB)
│   └── schema.sql        # Database schema
├── public/               # Frontend files
│   ├── index.html        # Landing page
│   ├── register.html     # Registration page
│   ├── login.html        # Login page
│   ├── dashboard.html    # Main dashboard
│   ├── upload-cars.html  # Excel upload page
│   ├── upload-images.html # Image upload page
│   ├── view-cars.html    # Inventory view page
│   └── bot-confirmations.html # Bot confirmations page
├── utils/                # Utility functions
├── package.json          # Dependencies and scripts
└── start-inventory.bat   # Windows startup script
```

## Security Features

- **Password Hashing**: Uses bcrypt for secure password storage
- **JWT Authentication**: Secure token-based authentication
- **Session Management**: Express-session for user sessions
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Protection**: Parameterized queries with pg library

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify your NeonDB connection string in `.env`
   - Ensure your NeonDB project is active
   - Check if the database exists

2. **Port Already in Use**
   - Change the PORT in `.env` file
   - Kill processes using the current port

3. **Upload Errors**
   - Check file size limits
   - Ensure Excel file format is correct
   - Verify image file types (PNG, JPG, JPEG)

4. **Authentication Issues**
   - Clear browser cache and cookies
   - Check JWT_SECRET in `.env`
   - Verify user credentials

### Logs
- Check console output for detailed error messages
- Empty field validations are logged to console during Excel uploads

## Integration with WhatsApp Bot

The system is designed to integrate with your existing WhatsApp bot:
- Bot can fetch car inventory via API endpoints
- All bot interactions are automatically saved
- PDFs are generated for each confirmation
- Images and car details are accessible to the bot

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify your NeonDB configuration
3. Check console logs for error details
4. Ensure all dependencies are properly installed

## License

This project is licensed under the ISC License.

## Image Management

### New Image Naming Convention

The system now uses a standardized image naming convention for easier WhatsApp bot integration:

**File Structure:**
```
uploads/cars/
├── MH12AB1234/
│   ├── MH12AB1234_1.jpg (Front view)
│   ├── MH12AB1234_2.jpg (Back view)
│   ├── MH12AB1234_3.jpg (Side view)
│   └── MH12AB1234_4.jpg (Interior view)
├── KA01CD5678/
│   ├── KA01CD5678_1.jpg (Front view)
│   ├── KA01CD5678_2.jpg (Back view)
│   ├── KA01CD5678_3.jpg (Side view)
│   └── KA01CD5678_4.jpg (Interior view)
```

**Benefits:**
- ✅ **Predictable paths**: Easy to construct image URLs
- ✅ **WhatsApp bot friendly**: Direct access without database queries
- ✅ **Consistent naming**: Same pattern across all cars
- ✅ **Easy debugging**: Clear file organization
- ✅ **Scalable**: Works with any number of cars

**WhatsApp Bot Usage:**
```javascript
// Direct image URL construction
const imageUrl = `http://yourdomain.com/uploads/cars/MH12AB1234/MH12AB1234_1.jpg`;

// First image (front view)
const frontImage = `${baseUrl}/uploads/cars/${registrationNumber}/${registrationNumber}_1.jpg`;

// Additional images
const backImage = `${baseUrl}/uploads/cars/${registrationNumber}/${registrationNumber}_2.jpg`;
const sideImage = `${baseUrl}/uploads/cars/${registrationNumber}/${registrationNumber}_3.jpg`;
const interiorImage = `${baseUrl}/uploads/cars/${registrationNumber}/${registrationNumber}_4.jpg`;
```

### Image Upload Process

1. **Select Car**: Choose a car by registration number
2. **Upload Images**: Upload 4 images (Front, Back, Side, Interior)
3. **Automatic Naming**: System automatically names files using the convention
4. **Database Storage**: Image paths are stored in the database for reference
5. **WhatsApp Ready**: Images are immediately available for WhatsApp bot

### Supported Image Formats

- **JPG/JPEG**: Recommended for best compatibility
- **PNG**: Supported for transparent images
- **GIF**: Supported for animated images
- **File Size**: Recommended under 5MB per image
