const axios = require('axios');

async function createTestUser() {
    try {
        console.log('🔍 Creating test user...');
        
        const userData = {
            username: 'testuser',
            email: 'test@example.com',
            password: 'testpass123',
            companyName: 'Test Auto Dealer',
            phone: '1234567890',
            address: '123 Test Street, Test City'
        };
        
        const response = await axios.post('http://localhost:3000/api/register', userData);
        
        console.log('✅ Test user created successfully!');
        console.log('User ID:', response.data.user.id);
        console.log('Username:', response.data.user.username);
        console.log('Email:', response.data.user.email);
        
        // Now test login
        console.log('\n🔐 Testing login with new user...');
        
        const loginResponse = await axios.post('http://localhost:3000/api/login', {
            username: 'testuser',
            password: 'testpass123'
        });
        
        if (loginResponse.data.token) {
            console.log('✅ Login successful!');
            console.log('Token received:', loginResponse.data.token.substring(0, 20) + '...');
            
            // Test template download
            console.log('\n📥 Testing template download...');
            
            const templateResponse = await axios.get('http://localhost:3000/api/download-template', {
                headers: {
                    'Authorization': `Bearer ${loginResponse.data.token}`
                },
                responseType: 'arraybuffer'
            });
            
            console.log('✅ Template download successful!');
            console.log('Status:', templateResponse.status);
            console.log('Content-Type:', templateResponse.headers['content-type']);
            console.log('Content-Length:', templateResponse.headers['content-length']);
            console.log('Content-Disposition:', templateResponse.headers['content-disposition']);
            
            // Check if it's a valid Excel file
            const buffer = Buffer.from(templateResponse.data);
            console.log(`📊 File size: ${buffer.length} bytes`);
            
            if (buffer.length > 1000) {
                console.log('✅ File size looks good for an Excel file');
            } else {
                console.log('⚠️ File size seems small');
            }
            
            // Check file signature (Excel files start with PK)
            if (buffer.toString('ascii', 0, 2) === 'PK') {
                console.log('✅ File signature indicates valid Excel file (ZIP format)');
            } else {
                console.log('⚠️ File signature doesn\'t match Excel format');
            }
            
        } else {
            console.log('❌ Login failed');
        }
        
    } catch (error) {
        if (error.response) {
            console.error('❌ API Error Response:');
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('❌ Network Error:', error.message);
        }
    }
}

// Check if server is running
async function checkServer() {
    try {
        await axios.get('http://localhost:3000/api/debug/cars-images');
        console.log('✅ Server is running, proceeding with user creation...');
        await createTestUser();
    } catch (error) {
        console.error('❌ Server is not running. Please start the server first with: node inventory-app.js');
    }
}

checkServer();
