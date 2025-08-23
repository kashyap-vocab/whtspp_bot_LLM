-- Create dealers table
CREATE TABLE IF NOT EXISTS dealers (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    company_name VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create cars table
CREATE TABLE IF NOT EXISTS cars (
    id SERIAL PRIMARY KEY,
    dealer_id INTEGER REFERENCES dealers(id) ON DELETE CASCADE,
    registration_number VARCHAR(20) UNIQUE NOT NULL,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    variant VARCHAR(100),
    type VARCHAR(50), -- Added type column for car body type (SUV, Sedan, Hatchback, etc.)
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
);

-- Create car_images table
CREATE TABLE IF NOT EXISTS car_images (
    id SERIAL PRIMARY KEY,
    car_id INTEGER REFERENCES cars(id) ON DELETE CASCADE,
    image_path VARCHAR(255) NOT NULL,
    image_type VARCHAR(20) NOT NULL, -- 'front', 'back', 'side', 'interior'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create bot_confirmations table
CREATE TABLE IF NOT EXISTS bot_confirmations (
    id SERIAL PRIMARY KEY,
    car_id INTEGER REFERENCES cars(id) ON DELETE CASCADE,
    whatsapp_number VARCHAR(20),
    customer_name VARCHAR(100),
    confirmation_type VARCHAR(50), -- 'inquiry', 'test_drive', 'purchase'
    message_content TEXT,
    pdf_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create callback_requests table for WhatsApp bot contact flow
CREATE TABLE IF NOT EXISTS callback_requests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    reason TEXT,
    preferred_time VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'contacted', 'completed'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cars_registration_number ON cars(registration_number);
CREATE INDEX IF NOT EXISTS idx_cars_dealer_id ON cars(dealer_id);
CREATE INDEX IF NOT EXISTS idx_car_images_car_id ON car_images(car_id);
CREATE INDEX IF NOT EXISTS idx_bot_confirmations_car_id ON bot_confirmations(car_id);
CREATE INDEX IF NOT EXISTS idx_callback_requests_phone ON callback_requests(phone);
CREATE INDEX IF NOT EXISTS idx_callback_requests_status ON callback_requests(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_dealers_updated_at BEFORE UPDATE ON dealers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON cars
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_callback_requests_updated_at BEFORE UPDATE ON callback_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
