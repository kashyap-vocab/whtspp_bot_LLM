const axios = require('axios');

async function testAPI() {
    try {
        console.log('🔍 Testing API endpoint...');
        
        // Test the cars API endpoint
        const response = await axios.get('http://localhost:3000/api/debug/cars-images');
        
        console.log('✅ API Response:');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));
        
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

testAPI();
