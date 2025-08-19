const axios = require('axios');
const fs = require('fs');

async function testTemplateDownload() {
    try {
        console.log('🔍 Testing template download endpoint...');
        
        // First, we need to get a valid token by logging in
        console.log('📝 Logging in to get authentication token...');
        
        const loginResponse = await axios.post('http://localhost:3000/api/login', {
            username: 'testuser',
            password: 'testpass123'
        });
        
        if (loginResponse.data.token) {
            console.log('✅ Login successful, got token');
            
            // Test the template download endpoint
            console.log('📥 Downloading template...');
            
            const templateResponse = await axios.get('http://localhost:3000/api/download-template', {
                headers: {
                    'Authorization': `Bearer ${loginResponse.data.token}`
                },
                responseType: 'arraybuffer' // Important for binary data
            });
            
            console.log('✅ Template download successful!');
            console.log('Status:', templateResponse.status);
            console.log('Content-Type:', templateResponse.headers['content-type']);
            console.log('Content-Length:', templateResponse.headers['content-length']);
            console.log('Content-Disposition:', templateResponse.headers['content-disposition']);
            
            // Save the template to verify it's a valid Excel file
            const filename = 'downloaded_template_test.xlsx';
            fs.writeFileSync(filename, templateResponse.data);
            console.log(`💾 Template saved as: ${filename}`);
            
            // Check file size
            const stats = fs.statSync(filename);
            console.log(`📊 File size: ${stats.size} bytes`);
            
            if (stats.size > 1000) {
                console.log('✅ File size looks good (Excel files are typically >1KB)');
            } else {
                console.log('⚠️ File size seems small, might not be a valid Excel file');
            }
            
            // Clean up test file
            fs.unlinkSync(filename);
            console.log('🧹 Test file cleaned up');
            
        } else {
            console.log('❌ Login failed - no token received');
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
        console.log('✅ Server is running, proceeding with template test...');
        await testTemplateDownload();
    } catch (error) {
        console.error('❌ Server is not running. Please start the server first with: node inventory-app.js');
    }
}

checkServer();
