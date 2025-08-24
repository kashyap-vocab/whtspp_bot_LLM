const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');
const pool = require('./db');

// Cloudinary configuration
let cloudinary = null;
let cloudinaryStorage = null;

if (process.env.CLOUDINARY_CLOUD_NAME) {
    try {
        cloudinary = require('cloudinary').v2;
        cloudinaryStorage = require('multer-storage-cloudinary');
        
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });
        
        console.log('☁️ Cloudinary configured successfully');
    } catch (error) {
        console.log('⚠️ Cloudinary packages not installed, falling back to local storage');
    }
} else {
    console.log('📁 Using local file storage (set CLOUDINARY_CLOUD_NAME to use Cloudinary)');
}

// Helper function to get image URL (works with both Cloudinary and local storage)
function getImageUrl(imagePath) {
    if (!imagePath) return null;
    
    // If it's already a Cloudinary URL, return as is
    if (imagePath.startsWith('http')) {
        return imagePath;
    }
    
    // If it's a local path and we're using Cloudinary, this shouldn't happen
    if (cloudinary && imagePath.startsWith('uploads/')) {
        console.warn('⚠️ Local image path found but Cloudinary is active:', imagePath);
        return null;
    }
    
    // For local storage, construct the full URL
    if (imagePath.startsWith('uploads/')) {
        const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
        return `${baseUrl}/${imagePath}`;
    }
    
    return imagePath;
}

const app = express();
const PORT = process.env.PORT || 3000;

// Database initialization function
async function initializeDatabase() {
    try {
        const client = await pool.connect();
        
        // Check if tables exist, create only if they don't exist
        const tableExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'dealers'
            );
        `);
        
        if (!tableExists.rows[0].exists) {
            console.log('📋 Creating new database tables...');
            
            // Create tables in correct order
            await client.query(`
                CREATE TABLE dealers (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    company_name VARCHAR(100),
                    phone VARCHAR(20),
                    address TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            await client.query(`
                CREATE TABLE cars (
                    id SERIAL PRIMARY KEY,
                    dealer_id INTEGER REFERENCES dealers(id) ON DELETE CASCADE,
                    registration_number VARCHAR(20) UNIQUE NOT NULL,
                    brand VARCHAR(50) NOT NULL,
                    model VARCHAR(50) NOT NULL,
                    variant VARCHAR(100),
                    type VARCHAR(50),
                    year INTEGER,
                    fuel_type VARCHAR(20),
                    transmission VARCHAR(20),
                    mileage INTEGER,
                    price DECIMAL(12,2),
                    color VARCHAR(30),
                    engine_cc INTEGER,
                    power_bhp INTEGER,
                    seats INTEGER,
                    description TEXT,
                    status VARCHAR(20) DEFAULT 'available',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            await client.query(`
                CREATE TABLE car_images (
                    id SERIAL PRIMARY KEY,
                    car_id INTEGER REFERENCES cars(id) ON DELETE CASCADE,
                    image_path VARCHAR(255) NOT NULL,
                    image_type VARCHAR(20) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            await client.query(`
                CREATE TABLE bot_confirmations (
                    id SERIAL PRIMARY KEY,
                    car_id INTEGER REFERENCES cars(id) ON DELETE CASCADE,
                    whatsapp_number VARCHAR(20),
                    customer_name VARCHAR(100),
                    confirmation_type VARCHAR(50),
                    message_content TEXT,
                    pdf_path VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            await client.query(`
                CREATE TABLE callback_requests (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    phone VARCHAR(20) NOT NULL,
                    reason TEXT,
                    preferred_time VARCHAR(50),
                    status VARCHAR(20) DEFAULT 'pending',
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Create indexes
            await client.query('CREATE INDEX idx_cars_registration_number ON cars(registration_number)');
            await client.query('CREATE INDEX idx_cars_dealer_id ON cars(dealer_id)');
            await client.query('CREATE INDEX idx_car_images_car_id ON car_images(car_id)');
            await client.query('CREATE INDEX idx_bot_confirmations_car_id ON bot_confirmations(car_id)');
            await client.query('CREATE INDEX idx_callback_requests_phone ON callback_requests(phone)');
            await client.query('CREATE INDEX idx_callback_requests_status ON callback_requests(status)');
            
            // Create function for updating timestamps
            await client.query(`
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ language 'plpgsql';
            `);
            
            // Create triggers for updated_at
            await client.query(`
                DROP TRIGGER IF EXISTS update_callback_requests_updated_at ON callback_requests;
                CREATE TRIGGER update_callback_requests_updated_at 
                BEFORE UPDATE ON callback_requests
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            `);
            
            console.log('✅ Database tables created successfully');
        }
        
        client.release();
        console.log('✅ Database initialization completed');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Serve uploaded files (for local development)
if (!cloudinary) {
    app.use('/uploads', express.static('uploads'));
    console.log('📁 Static file serving enabled for local uploads');
} else {
    console.log('☁️ Cloudinary storage active - local file serving disabled');
}

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files are allowed'));
        }
    }
});

// Configure image upload storage based on environment
let imageUploadStorage;

if (cloudinary && cloudinaryStorage) {
    // Use Cloudinary storage
    imageUploadStorage = cloudinaryStorage.CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'autosherpa/cars',
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            transformation: [
                { width: 800, height: 600, crop: 'limit' },
                { quality: 'auto:good' }
            ]
        }
    });
    console.log('☁️ Using Cloudinary storage for images');
} else {
    // Use local storage as fallback
    imageUploadStorage = multer.diskStorage({
        destination: function (req, file, cb) {
            // Get registration number from the request body
            const registrationNumber = req.body.registrationNumber;
            
            if (!registrationNumber || registrationNumber === 'unknown') {
                // Save to a temporary directory if no registration number
                const tempDir = 'uploads/cars/temp';
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }
                cb(null, tempDir);
            } else {
                // Save to the proper car directory
                const carDir = `uploads/cars/${registrationNumber}/`;
                if (!fs.existsSync(carDir)) {
                    fs.mkdirSync(carDir, { recursive: true });
                }
                cb(null, carDir);
            }
        },
        filename: function (req, file, cb) {
            // For now, use timestamp to avoid conflicts, we'll rename them properly in the API
            const timestamp = Date.now();
            const filename = `temp_${timestamp}_${file.originalname}`;
            
            console.log(`📸 Multer saving image as: ${filename}`);
            cb(null, filename);
        }
    });
    console.log('📁 Using local storage for images');
}

const imageUpload = multer({
    storage: imageUploadStorage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const token = req.session.token || req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.redirect('/login');
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret', (err, user) => {
        if (err) {
            req.session.destroy();
            return res.redirect('/login');
        }
        req.user = user;
        next();
    });
};

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/upload-cars', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'upload-cars.html'));
});

app.get('/upload-images', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'upload-images.html'));
});

app.get('/view-cars', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'view-cars.html'));
});

app.get('/bot-confirmations', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'bot-confirmations.html'));
});

// Test drive bookings page
app.get('/test-drive-bookings', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-drive-bookings.html'));
});

// Car valuations page
app.get('/car-valuations', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'car-valuations.html'));
});

// API test page for debugging
app.get('/test-api', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-api.html'));
});

// Debug endpoint to check users in database
app.get('/api/debug/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, email, company_name, created_at FROM dealers ORDER BY created_at DESC');
        res.json({
            message: 'Users in database',
            count: result.rows.length,
            users: result.rows
        });
    } catch (error) {
        console.error('Debug users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Debug endpoint to check cars and images status
app.get('/api/debug/cars-images', authenticateToken, async (req, res) => {
    try {
        // Get all cars with their image information
        const result = await pool.query(`
            SELECT 
                c.id,
                c.registration_number,
                c.brand,
                c.model,
                c.status,
                COUNT(ci.id) as image_count,
                array_agg(ci.image_path) as image_paths,
                array_agg(ci.image_type) as image_types
            FROM cars c
            LEFT JOIN car_images ci ON c.id = ci.car_id
            GROUP BY c.id, c.registration_number, c.brand, c.model, c.status
            ORDER BY c.created_at DESC
        `);
        
        res.json({
            message: 'Cars and images status',
            total_cars: result.rows.length,
            cars: result.rows
        });
    } catch (error) {
        console.error('Debug cars-images error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API Routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, companyName, phone, address } = req.body;
        
        console.log('📝 Registration attempt for:', { username, email, companyName });
        
        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM dealers WHERE username = $1 OR email = $2',
            [username, email]
        );
        
        console.log('🔍 Existing user check:', existingUser.rows.length, 'users found');
        
        if (existingUser.rows.length > 0) {
            console.log('❌ User already exists:', username);
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        
        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        console.log('🔐 Password hashed successfully');
        
        // Insert new dealer
        const result = await pool.query(
            'INSERT INTO dealers (username, email, password_hash, company_name, phone, address) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, company_name',
            [username, email, passwordHash, companyName, phone, address]
        );
        
        console.log('✅ User created successfully:', result.rows[0]);
        console.log('🆔 Generated Dealer ID:', result.rows[0].id);
        
        res.json({ 
            message: 'Registration successful',
            user: result.rows[0],
            dealerId: result.rows[0].id
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('🔐 Login attempt for:', username);
        
        // Find user
        const result = await pool.query(
            'SELECT id, username, email, password_hash, company_name FROM dealers WHERE username = $1 OR email = $1',
            [username]
        );
        
        console.log('🔍 Database query result:', result.rows.length, 'users found');
        
        if (result.rows.length === 0) {
            console.log('❌ No user found with username/email:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        console.log('✅ User found:', { id: user.id, username: user.username, email: user.email });
        
        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        console.log('🔑 Password check result:', isValidPassword);
        
        if (!isValidPassword) {
            console.log('❌ Invalid password for user:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            process.env.JWT_SECRET || 'your-jwt-secret',
            { expiresIn: '24h' }
        );
        
        // Store token in session
        req.session.token = token;
        req.session.user = { id: user.id, username: user.username, email: user.email, companyName: user.company_name };
        
        res.json({ 
            message: 'Login successful',
            token: token,
            user: { id: user.id, username: user.username, email: user.email, companyName: user.company_name }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logout successful' });
});

app.post('/api/upload-cars', authenticateToken, upload.single('excelFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const workbook = xlsx.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet);
        
        // Debug: Log the first row to see actual column names
        if (rows.length > 0) {
            console.log('🔍 Excel columns found:', Object.keys(rows[0]));
            console.log('🔍 First row sample:', rows[0]);
        }
        
        const results = [];
        const errors = [];
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNumber = i + 2; // Excel rows start from 1, and we have header
            
            // Map Excel columns to system fields - Updated for Book1.xlsx structure
            const columnMapping = {
                'registration_number': ['Registration Number'],
                'brand': ['Make'],
                'model': ['Model'],
                'variant': ['Variant'],
                'type': ['Type', 'Body Type', 'Car Type'],
                'year': ['Manufacturing Year'],
                'fuel_type': ['Fuel Type'],
                'transmission': ['Transmission Type'],
                'mileage': ['Mileage (KM)'],
                'price': ['Estimated Selling Price'],
                'color': ['Color'],
                'engine_cc': ['Cubic Capacity (CC)']
            };
            
            // Debug: Log the column mapping
            console.log('🔍 Column mapping:', columnMapping);
            
            // Check for required fields with column mapping - Updated for Book1.xlsx
            const requiredFields = ['registration_number', 'brand', 'model', 'variant', 'year', 'fuel_type', 'transmission', 'mileage', 'price'];
            const missingFields = [];
            
            requiredFields.forEach(field => {
                const possibleColumns = columnMapping[field];
                let value = null;
                
                // Try to find value in mapped columns
                for (const col of possibleColumns) {
                    if (row[col] !== undefined && row[col] !== null && row[col].toString().trim() !== '') {
                        value = row[col];
                        break;
                    }
                }
                
                if (!value) {
                    missingFields.push(field);
                    console.log(`Value is empty for field: ${field} in row ${rowNumber}. Tried columns: ${possibleColumns.join(', ')}`);
                }
            });
            
            if (missingFields.length > 0) {
                errors.push({
                    row: rowNumber,
                    message: `Missing required fields: ${missingFields.join(', ')}`
                });
                continue;
            }
            
            try {
                // Get mapped values first for validation
                const getValue = (field) => {
                    const possibleColumns = columnMapping[field];
                    if (!possibleColumns || !Array.isArray(possibleColumns)) {
                        console.log(`⚠️ No column mapping found for field: ${field}`);
                        return null;
                    }
                    
                    for (const col of possibleColumns) {
                        if (row[col] !== undefined && row[col] !== null && row[col].toString().trim() !== '') {
                            return row[col];
                        }
                    }
                    return null;
                };
                
                // Check if car already exists using mapped registration number
                const registrationNumber = getValue('registration_number');
                if (!registrationNumber) {
                    errors.push({
                        row: rowNumber,
                        message: `Missing registration number`
                    });
                    continue;
                }
                
                const existingCar = await pool.query(
                    'SELECT id FROM cars WHERE registration_number = $1',
                    [registrationNumber]
                );
                
                if (existingCar.rows.length > 0) {
                    errors.push({
                        row: rowNumber,
                        message: `Car with registration number ${registrationNumber} already exists`
                    });
                    continue;
                }
                
                // Get all required values with proper error handling
                const brand = getValue('brand');
                const model = getValue('model');
                const variant = getValue('variant');
                const year = getValue('year');
                const fuelType = getValue('fuel_type');
                const transmission = getValue('transmission');
                const mileage = getValue('mileage');
                const price = getValue('price');
                const color = getValue('color');
                
                // Debug: Log the extracted values
                console.log(`🔍 Row ${rowNumber} values:`, {
                    registrationNumber, brand, model, variant, year, fuelType, transmission, mileage, price, color
                });
                
                // Insert car with mapped values
                const carResult = await pool.query(
                    `INSERT INTO cars (
                        dealer_id, registration_number, brand, model, variant, type, year, 
                        fuel_type, transmission, mileage, price, color, engine_cc, 
                        power_bhp, seats, description
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
                    RETURNING id, registration_number`,
                    [
                        req.user.id, 
                        registrationNumber, 
                        brand, 
                        model, 
                        variant,
                        getValue('type') || null,
                        year ? parseInt(year) : null, 
                        fuelType, 
                        transmission, 
                        mileage ? parseInt(mileage) : null,
                        price ? parseFloat(price) : 0,
                        color || null, 
                        row['Cubic Capacity (CC)'] ? parseInt(row['Cubic Capacity (CC)']) : null,
                        null, // power_bhp not in your Excel
                        null, // seats not in your Excel
                        `RC Status: ${row['RC Status'] || 'N/A'}, Expiry: ${row['RC Expiry Date'] || 'N/A'}, Engine: ${row['Engine Number'] || 'N/A'}, Chassis: ${row['Chassis Number'] || 'N/A'}, Emission: ${row['Emission Norms'] || 'N/A'}, Insurance: ${row['Insurance Type'] || 'N/A'} Exp: ${row['Insurance Expiry Date'] || 'N/A'}, Ready: ${row['Ready for Sales'] || 'N/A'}`
                    ]
                );
                
                results.push({
                    row: rowNumber,
                    message: `Car ${registrationNumber} imported successfully`,
                    carId: carResult.rows[0].id
                });
                
            } catch (error) {
                errors.push({
                    row: rowNumber,
                    message: `Error importing car: ${error.message}`
                });
            }
        }
        
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        
        res.json({
            message: 'Import completed',
            results: results,
            errors: errors,
            totalProcessed: rows.length,
            successful: results.length,
            failed: errors.length
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Template download endpoint
app.get('/api/download-template', authenticateToken, (req, res) => {
    try {
        // Create sample data based on the expected Excel structure
        const templateData = [
            {
                'Registration Number': 'MH12AB1234',
                'Make': 'Honda',
                'Model': 'City',
                'Variant': 'VX CVT',
                'Type': 'Sedan',
                'Manufacturing Year': '2022',
                'Fuel Type': 'Petrol',
                'Transmission Type': 'CVT',
                'Mileage (KM)': '15000',
                'Estimated Selling Price': '850000',
                'Color': 'White',
                'Cubic Capacity (CC)': '1498',
                'RC Status': 'Active',
                'RC Expiry Date': '2025-12-31',
                'Engine Number': 'ENG123456789',
                'Chassis Number': 'CHS123456789',
                'Emission Norms': 'BS6',
                'Insurance Type': 'Comprehensive',
                'Insurance Expiry Date': '2024-12-31',
                'Ready for Sales': 'Yes'
            },
            {
                'Registration Number': 'KA01CD5678',
                'Make': 'Hyundai',
                'Model': 'Creta',
                'Variant': 'SX Executive',
                'Type': 'SUV',
                'Manufacturing Year': '2021',
                'Fuel Type': 'Diesel',
                'Transmission Type': 'Manual',
                'Mileage (KM)': '25000',
                'Estimated Selling Price': '950000',
                'Color': 'Black',
                'Cubic Capacity (CC)': '1493',
                'RC Status': 'Active',
                'RC Expiry Date': '2026-06-30',
                'Engine Number': 'ENG987654321',
                'Chassis Number': 'CHS987654321',
                'Emission Norms': 'BS6',
                'Insurance Type': 'Third Party',
                'Insurance Expiry Date': '2025-06-30',
                'Ready for Sales': 'Yes'
            }
        ];

        // Create workbook and worksheet
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(templateData);

        // Set column widths for better readability
        const columnWidths = [
            { wch: 20 }, // Registration Number
            { wch: 15 }, // Make
            { wch: 15 }, // Model
            { wch: 20 }, // Variant
            { wch: 18 }, // Manufacturing Year
            { wch: 12 }, // Fuel Type
            { wch: 18 }, // Transmission Type
            { wch: 15 }, // Mileage (KM)
            { wch: 20 }, // Estimated Selling Price
            { wch: 12 }, // Color
            { wch: 18 }, // Cubic Capacity (CC)
            { wch: 12 }, // RC Status
            { wch: 15 }, // RC Expiry Date
            { wch: 20 }, // Engine Number
            { wch: 20 }, // Chassis Number
            { wch: 15 }, // Emission Norms
            { wch: 18 }, // Insurance Type
            { wch: 20 }, // Insurance Expiry Date
            { wch: 15 }  // Ready for Sales
        ];
        worksheet['!cols'] = columnWidths;

        // Add worksheet to workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Car Inventory Template');

        // Set response headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="car_inventory_template.xlsx"');

        // Convert workbook to buffer and send
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.send(buffer);

    } catch (error) {
        console.error('Template download error:', error);
        res.status(500).json({ error: 'Failed to generate template' });
    }
});

app.post('/api/upload-car-images', authenticateToken, imageUpload.array('images', 4), async (req, res) => {
    try {
        const { registrationNumber, imageTypes, imageIndices } = req.body;
        
        if (!registrationNumber) {
            return res.status(400).json({ error: 'Registration number is required' });
        }
        
        // Find the car
        const carResult = await pool.query(
            'SELECT id FROM cars WHERE registration_number = $1 AND dealer_id = $2',
            [registrationNumber, req.user.id]
        );
        
        if (carResult.rows.length === 0) {
            return res.status(404).json({ error: 'Car not found' });
        }
        
        const carId = carResult.rows[0].id;
        const uploadedImages = [];
        
        // Parse imageTypes and imageIndices if they're JSON strings
        let parsedTypes = [];
        let parsedIndices = [];
        
        if (typeof imageTypes === 'string') {
            try {
                parsedTypes = JSON.parse(imageTypes);
            } catch (e) {
                console.error('❌ Error parsing imageTypes:', e);
                parsedTypes = ['front', 'back', 'side', 'interior'];
            }
        } else if (Array.isArray(imageTypes)) {
            parsedTypes = imageTypes;
        } else {
            parsedTypes = ['front', 'back', 'side', 'interior'];
        }
        
        if (typeof imageIndices === 'string') {
            try {
                parsedIndices = JSON.parse(imageIndices);
            } catch (e) {
                console.error('❌ Error parsing imageIndices:', e);
                parsedIndices = [0, 1, 2, 3];
            }
        } else if (Array.isArray(imageIndices)) {
            parsedIndices = imageIndices;
        } else {
            parsedIndices = [0, 1, 2, 3];
        }
        
        console.log(`📸 Received imageTypes:`, parsedTypes);
        console.log(`📸 Received imageIndices:`, parsedIndices);
        console.log(`📸 Received files:`, req.files.map(f => f.filename));
        
        // Process uploaded images
        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const imageType = parsedTypes[i] || 'unknown';
            const imageIndex = parsedIndices[i] || i; // Use provided index or fallback to loop index
            
            let imagePath;
            let filename;
            
            if (cloudinary && file.url) {
                // Cloudinary upload - file.url contains the Cloudinary URL
                imagePath = file.url;
                filename = `${registrationNumber}_${parseInt(imageIndex) + 1}`;
                console.log(`☁️ Cloudinary image uploaded: ${imagePath}`);
            } else {
                // Local upload - handle file moving and path creation
                filename = `${registrationNumber}_${parseInt(imageIndex) + 1}.jpg`;
                
                // Determine the correct car directory
                const carDir = path.join('uploads', 'cars', registrationNumber);
                if (!fs.existsSync(carDir)) {
                    fs.mkdirSync(carDir, { recursive: true });
                }
                
                // Move file from temp location to correct car directory
                const oldPath = file.path;
                const newPath = path.join(carDir, filename);
                
                try {
                    // Move the file to the correct location
                    fs.renameSync(oldPath, newPath);
                    console.log(`📸 Moved file: ${path.basename(oldPath)} -> ${filename}`);
                } catch (moveError) {
                    console.error(`❌ Error moving file: ${moveError.message}`);
                    // Continue with the old path if move fails
                }
                
                // Create the new standardized path for easier WhatsApp bot fetching
                imagePath = `uploads/cars/${registrationNumber}/${filename}`;
                console.log(`📸 Local image saved: ${imagePath}`);
            }
            
            console.log(`📸 Processing image ${i + 1}: ${filename} -> ${imagePath} (type: ${imageType}, index: ${imageIndex})`);
            
            // Save image record to database with the path (Cloudinary URL or local path)
            const imageResult = await pool.query(
                'INSERT INTO car_images (car_id, image_path, image_type) VALUES ($1, $2, $3) RETURNING id',
                [carId, imagePath, imageType]
            );
            
            uploadedImages.push({
                id: imageResult.rows[0].id,
                path: imagePath,
                type: imageType,
                filename: filename,
                sequence: parseInt(imageIndex) + 1
            });
        }
        
        console.log(`✅ Successfully uploaded ${uploadedImages.length} images for car ${registrationNumber}`);
        
        res.json({
            message: 'Images uploaded successfully',
            carId: carId,
            registrationNumber: registrationNumber,
            images: uploadedImages
        });
        
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/cars', authenticateToken, async (req, res) => {
    try {
        console.log(`📊 Fetching cars for dealer ${req.user.id}...`);
        
        // First get all cars for the dealer
        const carsResult = await pool.query(
            `SELECT c.* FROM cars c WHERE c.dealer_id = $1 ORDER BY c.created_at DESC`,
            [req.user.id]
        );
        
        console.log(`📊 Found ${carsResult.rows.length} cars in database`);
        
        // Then get images for each car
        const carsWithImages = [];
        
        for (const car of carsResult.rows) {
            const imagesResult = await pool.query(
                `SELECT image_path, image_type FROM car_images WHERE car_id = $1 ORDER BY id`,
                [car.id]
            );
            
            // Ensure image_paths is always an array, even if empty
            const imagePaths = imagesResult.rows.map(row => getImageUrl(row.image_path)).filter(Boolean);
            const imageTypes = imagesResult.rows.map(row => row.image_type);
            
            carsWithImages.push({
                ...car,
                image_paths: imagePaths,
                image_types: imageTypes
            });
            
            console.log(`🚗 Car ${car.registration_number}: ${imagePaths.length} images`);
        }
        
        console.log(`✅ Returning ${carsWithImages.length} cars with images`);
        
        res.json(carsWithImages);
    } catch (error) {
        console.error('❌ Fetch cars error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/bot-confirmations', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT bc.*, c.registration_number, c.brand, c.model
             FROM bot_confirmations bc
             JOIN cars c ON bc.car_id = c.id
             WHERE c.dealer_id = $1
             ORDER BY bc.created_at DESC`,
            [req.user.id]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Fetch confirmations error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint for test drive bookings
app.get('/api/test-drive-bookings', authenticateToken, async (req, res) => {
    try {
        console.log(`📊 Fetching test drive bookings for dealer ${req.user.id}...`);
        
        // Get all test drive bookings (simplified query)
        const result = await pool.query(
            `SELECT * FROM test_drives ORDER BY created_at DESC`
        );
        
        console.log(`✅ Found ${result.rows.length} test drive bookings`);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Fetch test drive bookings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint for car valuations
app.get('/api/car-valuations', authenticateToken, async (req, res) => {
    try {
        console.log(`📊 Fetching car valuations for dealer ${req.user.id}...`);
        
        // Get car valuations from the existing table structure
        const result = await pool.query(
            `SELECT 
                id,
                name,
                phone,
                brand,
                model,
                year,
                fuel,
                kms as mileage,
                owner,
                condition,
                location,
                submitted_at as created_at
             FROM car_valuations 
             ORDER BY submitted_at DESC`
        );
        
        console.log(`✅ Found ${result.rows.length} car valuations`);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Fetch car valuations error:', error);
        // If table doesn't exist, return empty array
        res.json([]);
    }
});

// API endpoint to generate PDF for test drive bookings
app.get('/api/test-drive-bookings/pdf', authenticateToken, async (req, res) => {
    try {
        console.log(`📊 Generating PDF for test drive bookings...`);
        
        // Get all test drive bookings
        const result = await pool.query(
            `SELECT * FROM test_drives ORDER BY created_at DESC`
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No test drive bookings found' });
        }
        
        const pdfPath = await generateTestDriveBookingsPDF(result.rows);
        
        res.download(pdfPath, 'test-drive-bookings.pdf', (err) => {
            if (err) {
                console.error('Error sending PDF:', err);
            }
            // Clean up the temporary PDF file
            fs.unlink(pdfPath, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting temporary PDF:', unlinkErr);
            });
        });
        
    } catch (error) {
        console.error('❌ Generate test drive bookings PDF error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint to generate PDF for car valuations
app.get('/api/car-valuations/pdf', authenticateToken, async (req, res) => {
    try {
        console.log(`📊 Generating PDF for car valuations...`);
        
        // Get car valuations
        const result = await pool.query(
            `SELECT 
                id,
                name,
                phone,
                brand,
                model,
                year,
                fuel,
                kms as mileage,
                owner,
                condition,
                location,
                submitted_at as created_at
             FROM car_valuations 
             ORDER BY submitted_at DESC`
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No car valuations found' });
        }
        
        const pdfPath = await generateCarValuationsPDF(result.rows);
        
        res.download(pdfPath, 'car-valuations.pdf', (err) => {
            if (err) {
                console.error('Error sending PDF:', err);
            }
            // Clean up the temporary PDF file
            fs.unlink(pdfPath, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting temporary PDF:', unlinkErr);
            });
        });
        
    } catch (error) {
        console.error('❌ Generate car valuations PDF error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/save-confirmation', authenticateToken, async (req, res) => {
    try {
        const { carId, whatsappNumber, customerName, confirmationType, messageContent } = req.body;
        
        // Verify car belongs to dealer
        const carResult = await pool.query(
            'SELECT id FROM cars WHERE id = $1 AND dealer_id = $2',
            [carId, req.user.id]
        );
        
        if (carResult.rows.length === 0) {
            return res.status(404).json({ error: 'Car not found' });
        }
        
        // Generate PDF
        const pdfPath = await generateConfirmationPDF({
            carId,
            whatsappNumber,
            customerName,
            confirmationType,
            messageContent,
            dealerId: req.user.id
        });
        
        // Save confirmation to database
        const result = await pool.query(
            `INSERT INTO bot_confirmations 
             (car_id, whatsapp_number, customer_name, confirmation_type, message_content, pdf_path)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [carId, whatsappNumber, customerName, confirmationType, messageContent, pdfPath]
        );
        
        res.json({
            message: 'Confirmation saved successfully',
            confirmationId: result.rows[0].id,
            pdfPath: pdfPath
        });
        
    } catch (error) {
        console.error('Save confirmation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PDF Generation function
async function generateConfirmationPDF(data) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            const pdfPath = `uploads/confirmations/confirmation-${Date.now()}.pdf`;
            
            // Ensure directory exists
            const dir = path.dirname(pdfPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            const stream = fs.createWriteStream(pdfPath);
            doc.pipe(stream);
            
            // Add content to PDF
            doc.fontSize(20).text('Car Dealership Confirmation', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString()}`);
            doc.moveDown();
            doc.text(`Customer: ${data.customerName}`);
            doc.text(`WhatsApp: ${data.whatsappNumber}`);
            doc.text(`Type: ${data.confirmationType}`);
            doc.moveDown();
            doc.text('Message:');
            doc.fontSize(10).text(data.messageContent);
            
            doc.end();
            
            stream.on('finish', () => {
                resolve(pdfPath);
            });
            
            stream.on('error', reject);
            
        } catch (error) {
            reject(error);
        }
    });
}

// PDF Generation function for test drive bookings
async function generateTestDriveBookingsPDF(bookings) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            const pdfPath = `uploads/reports/test-drive-bookings-${Date.now()}.pdf`;
            
            // Ensure directory exists
            const dir = path.dirname(pdfPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            const stream = fs.createWriteStream(pdfPath);
            doc.pipe(stream);
            
            // Add header
            doc.fontSize(24).text('Test Drive Bookings Report', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, { align: 'center' });
            doc.moveDown(2);
            
            // Add summary
            doc.fontSize(16).text(`Total Bookings: ${bookings.length}`);
            doc.moveDown();
            
            // Add each booking
            bookings.forEach((booking, index) => {
                doc.fontSize(14).text(`Booking ${index + 1}:`, { underline: true });
                doc.fontSize(12).text(`Customer: ${booking.name || 'N/A'}`);
                doc.text(`Phone: ${booking.phone || 'N/A'}`);
                doc.text(`Car: ${booking.car || 'N/A'}`);
                doc.text(`Date & Time: ${booking.datetime ? new Date(booking.datetime).toLocaleString() : 'N/A'}`);
                doc.text(`Has License: ${booking.has_dl ? 'Yes' : 'No'}`);
                doc.text(`Created: ${booking.created_at ? new Date(booking.created_at).toLocaleDateString() : 'N/A'}`);
                
                if (index < bookings.length - 1) {
                    doc.moveDown();
                    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
                    doc.moveDown();
                }
            });
            
            doc.end();
            
            stream.on('finish', () => {
                resolve(pdfPath);
            });
            
            stream.on('error', reject);
            
        } catch (error) {
            reject(error);
        }
    });
}

// PDF Generation function for car valuations
async function generateCarValuationsPDF(valuations) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            const pdfPath = `uploads/reports/car-valuations-${Date.now()}.pdf`;
            
            // Ensure directory exists
            const dir = path.dirname(pdfPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            const stream = fs.createWriteStream(pdfPath);
            doc.pipe(stream);
            
            // Add header
            doc.fontSize(24).text('Car Valuations Report', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, { align: 'center' });
            doc.moveDown(2);
            
            // Add summary
            doc.fontSize(16).text(`Total Valuations: ${valuations.length}`);
            doc.moveDown();
            
            // Add each valuation
            valuations.forEach((valuation, index) => {
                doc.fontSize(14).text(`Valuation ${index + 1}:`, { underline: true });
                doc.fontSize(12).text(`Customer: ${valuation.name || 'N/A'}`);
                doc.text(`Phone: ${valuation.phone || 'N/A'}`);
                doc.text(`Car: ${valuation.brand || 'N/A'} ${valuation.model || 'N/A'}`);
                doc.text(`Year: ${valuation.year || 'N/A'}`);
                doc.text(`Fuel: ${valuation.fuel || 'N/A'}`);
                doc.text(`Mileage: ${valuation.mileage || 'N/A'} km`);
                doc.text(`Owner: ${valuation.owner || 'N/A'}`);
                doc.text(`Condition: ${valuation.condition || 'N/A'}`);
                doc.text(`Location: ${valuation.location || 'N/A'}`);
                doc.text(`Submitted: ${valuation.created_at ? new Date(valuation.created_at).toLocaleDateString() : 'N/A'}`);
                
                if (index < valuations.length - 1) {
                    doc.moveDown();
                    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
                    doc.moveDown();
                }
            });
            
            doc.end();
            
            stream.on('finish', () => {
                resolve(pdfPath);
            });
            
            stream.on('error', reject);
            
        } catch (error) {
            reject(error);
        }
    });
}

// Function to clean up old image paths and update to new naming convention
async function cleanupOldImagePaths() {
    try {
        console.log('🧹 Starting cleanup of old image paths...');
        
        // First, clean up the old "undefined" directory
        await cleanupUndefinedDirectory();
        
        // Get all cars with images
        const carsResult = await pool.query(`
            SELECT DISTINCT c.id, c.registration_number, c.brand, c.model
            FROM cars c
            JOIN car_images ci ON c.id = ci.car_id
        `);
        
        console.log(`🔍 Found ${carsResult.rows.length} cars with images in database`);
        
        let updatedCount = 0;
        
        for (const car of carsResult.rows) {
            const registrationNumber = car.registration_number;
            const carDir = path.join('uploads', 'cars', registrationNumber);
            
            console.log(`🔍 Checking car ${registrationNumber} at directory: ${carDir}`);
            
            if (fs.existsSync(carDir)) {
                // Check what images actually exist in the directory
                const files = fs.readdirSync(carDir);
                const imageFiles = files.filter(file => 
                    file.match(new RegExp(`^${registrationNumber}_\\d+\\.(jpg|jpeg|png|gif)$`, 'i'))
                );
                
                console.log(`📁 Found ${imageFiles.length} properly named images for ${registrationNumber}:`, imageFiles);
                
                if (imageFiles.length > 0) {
                    // Update database with new image paths
                    for (let i = 0; i < imageFiles.length; i++) {
                        const imageFile = imageFiles[i];
                        const newImagePath = `uploads/cars/${registrationNumber}/${imageFile}`;
                        const imageType = ['front', 'back', 'side', 'interior'][i] || 'additional';
                        
                        // Check if this image path already exists
                        const existingImage = await pool.query(
                            'SELECT id FROM car_images WHERE car_id = $1 AND image_type = $2',
                            [car.id, imageType]
                        );
                        
                        if (existingImage.rows.length > 0) {
                            // Update existing record
                            await pool.query(
                                'UPDATE car_images SET image_path = $1 WHERE car_id = $2 AND image_type = $3',
                                [newImagePath, car.id, imageType]
                            );
                            console.log(`✅ Updated existing image path for ${registrationNumber}: ${imageFile}`);
                        } else {
                            // Insert new record
                            await pool.query(
                                'INSERT INTO car_images (car_id, image_path, image_type) VALUES ($1, $2, $3)',
                                [car.id, newImagePath, imageType]
                            );
                            console.log(`✅ Inserted new image path for ${registrationNumber}: ${imageFile}`);
                        }
                        
                        updatedCount++;
                    }
                } else {
                    console.log(`⚠️ No properly named images found for ${registrationNumber}`);
                }
            } else {
                console.log(`❌ Directory not found for ${registrationNumber}: ${carDir}`);
            }
        }
        
        console.log(`🧹 Cleanup completed. Updated ${updatedCount} image paths.`);
        
    } catch (error) {
        console.error('❌ Error during image path cleanup:', error);
    }
}

// Function to clean up the old "undefined" directory
async function cleanupUndefinedDirectory() {
    try {
        const undefinedDir = path.join('uploads', 'cars', 'undefined');
        
        if (!fs.existsSync(undefinedDir)) {
            console.log('📁 No undefined directory found');
            return;
        }
        
        console.log('🧹 Cleaning up undefined directory...');
        
        const files = fs.readdirSync(undefinedDir);
        console.log(`📋 Found ${files.length} files in undefined directory`);
        
        // Group files by registration number pattern
        const fileGroups = {};
        
        files.forEach(file => {
            // Look for patterns like KA13AB0997_1.jpg
            const match = file.match(/^([A-Z]{2}\d{2}[A-Z]{2}\d{4})_(\d+)\.(jpg|jpeg|png|gif)$/i);
            if (match) {
                const regNumber = match[1];
                const sequence = match[2];
                
                if (!fileGroups[regNumber]) {
                    fileGroups[regNumber] = [];
                }
                fileGroups[regNumber].push({ file, sequence: parseInt(sequence) });
            }
        });
        
        console.log(`📊 Found ${Object.keys(fileGroups).length} car groups in undefined directory`);
        
        // Move files to correct directories
        for (const [regNumber, fileList] of Object.entries(fileGroups)) {
            const carDir = path.join('uploads', 'cars', regNumber);
            
            // Create car directory if it doesn't exist
            if (!fs.existsSync(carDir)) {
                fs.mkdirSync(carDir, { recursive: true });
                console.log(`📁 Created directory: ${carDir}`);
            }
            
            // Sort files by sequence number
            fileList.sort((a, b) => a.sequence - b.sequence);
            
            // Move each file
            for (const { file, sequence } of fileList) {
                const oldPath = path.join(undefinedDir, file);
                const newPath = path.join(carDir, file);
                
                try {
                    fs.renameSync(oldPath, newPath);
                    console.log(`✅ Moved ${file} to ${carDir}`);
                } catch (error) {
                    console.error(`❌ Error moving ${file}: ${error.message}`);
                }
            }
        }
        
        // Remove the undefined directory if it's empty
        try {
            const remainingFiles = fs.readdirSync(undefinedDir);
            if (remainingFiles.length === 0) {
                fs.rmdirSync(undefinedDir);
                console.log('🗑️ Removed empty undefined directory');
            } else {
                console.log(`⚠️ ${remainingFiles.length} files remain in undefined directory`);
            }
        } catch (error) {
            console.error(`❌ Error removing undefined directory: ${error.message}`);
        }
        
    } catch (error) {
        console.error('❌ Error during undefined directory cleanup:', error);
    }
}



// Upload car images API route
app.post('/api/upload-car-images', authenticateToken, upload.array('images', 4), async (req, res) => {
    try {
        const { carId, registrationNumber } = req.body;
        const sequences = req.body.sequences;
        
        if (!carId || !registrationNumber || !req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Missing required data' });
        }
        
        // Verify car belongs to the authenticated dealer
        const carResult = await pool.query(
            'SELECT id FROM cars WHERE id = $1 AND dealer_id = $2',
            [carId, req.user.id]
        );
        
        if (carResult.rows.length === 0) {
            return res.status(404).json({ error: 'Car not found' });
        }
        
        const carDir = path.join('uploads', 'cars', registrationNumber);
        
        // Create car directory if it doesn't exist
        if (!fs.existsSync(carDir)) {
            fs.mkdirSync(carDir, { recursive: true });
        }
        
        let uploadedCount = 0;
        const uploadedFiles = [];
        
        // Process each uploaded image
        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const sequence = parseInt(sequences[i]) || (i + 1);
            
            // Generate filename with registration number and sequence
            const fileExtension = path.extname(file.originalname);
            const filename = `${registrationNumber}_${sequence}${fileExtension}`;
            const filePath = path.join(carDir, filename);
            
            try {
                // Move file to car directory
                fs.renameSync(file.path, filePath);
                
                // Save image record to database
                await pool.query(
                    'INSERT INTO car_images (car_id, image_path, image_type) VALUES ($1, $2, $3)',
                    [carId, path.join('uploads', 'cars', registrationNumber, filename), getImageType(sequence)]
                );
                
                uploadedCount++;
                uploadedFiles.push(filename);
                
                console.log(`✅ Uploaded image: ${filename} for car ${registrationNumber}`);
            } catch (error) {
                console.error(`❌ Error processing image ${filename}:`, error);
            }
        }
        
        if (uploadedCount === 0) {
            return res.status(500).json({ error: 'Failed to upload any images' });
        }
        
        res.json({
            message: 'Images uploaded successfully',
            uploadedCount,
            uploadedFiles,
            carId,
            registrationNumber
        });
        
    } catch (error) {
        console.error('Upload car images error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper function to determine image type based on sequence
function getImageType(sequence) {
    const types = ['front', 'back', 'side', 'interior'];
    return types[sequence - 1] || 'other';
}



// Start server
async function startServer() {
    try {
        // Initialize database first
        await initializeDatabase();
        
        // Clean up old image paths
        await cleanupOldImagePaths();
        
        // Start the server
        app.listen(PORT, () => {
            console.log(`🚗 AutoSherpa Inventory System running on port ${PORT}`);
            console.log(`🌐 Open http://localhost:${PORT} in your browser`);
            console.log(`📱 WhatsApp Bot can be started with: npm run whatsapp`);
            console.log(`🔄 Both services can be started with: npm run both`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;