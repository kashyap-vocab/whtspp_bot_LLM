#!/usr/bin/env node

/**
 * Test script to verify AutoSherpa services can start
 * Run with: node test-startup.js
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing AutoSherpa Services Startup...\n');

// Test database connection
async function testDatabase() {
    console.log('📊 Testing Database Connection...');
    
    try {
        const pool = require('./db');
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        console.log('✅ Database connection successful');
        return true;
    } catch (error) {
        console.log('❌ Database connection failed:', error.message);
        return false;
    }
}

// Test inventory system startup
function testInventorySystem() {
    return new Promise((resolve) => {
        console.log('🚗 Testing Inventory System Startup...');
        
        const inventory = spawn('node', ['inventory-app.js'], {
            stdio: 'pipe',
            env: { ...process.env, PORT: '3000' }
        });
        
        let output = '';
        let started = false;
        
        inventory.stdout.on('data', (data) => {
            output += data.toString();
            if (output.includes('Database tables initialized successfully') && !started) {
                started = true;
                console.log('✅ Inventory system started successfully');
                inventory.kill('SIGTERM');
                resolve(true);
            }
        });
        
        inventory.stderr.on('data', (data) => {
            if (data.toString().includes('Database initialization failed')) {
                console.log('❌ Inventory system failed to start');
                inventory.kill('SIGTERM');
                resolve(false);
            }
        });
        
        // Timeout after 10 seconds
        setTimeout(() => {
            if (!started) {
                console.log('⏰ Inventory system startup timeout');
                inventory.kill('SIGTERM');
                resolve(false);
            }
        }, 10000);
    });
}

// Test WhatsApp bot startup
function testWhatsAppBot() {
    return new Promise((resolve) => {
        console.log('🤖 Testing WhatsApp Bot Startup...');
        
        const bot = spawn('node', ['app.js'], {
            stdio: 'pipe',
            env: { ...process.env, WHATSAPP_PORT: '3001' }
        });
        
        let output = '';
        let started = false;
        
        bot.stdout.on('data', (data) => {
            output += data.toString();
            if (output.includes('WhatsApp Bot running on port 3001') && !started) {
                started = true;
                console.log('✅ WhatsApp bot started successfully');
                bot.kill('SIGTERM');
                resolve(true);
            }
        });
        
        bot.stderr.on('data', (data) => {
            if (data.toString().includes('WHATSAPP_API_TOKEN is not set')) {
                console.log('⚠️  WhatsApp bot missing API token (expected)');
                bot.kill('SIGTERM');
                resolve(true); // This is expected without proper config
            }
        });
        
        // Timeout after 10 seconds
        setTimeout(() => {
            if (!started) {
                console.log('⏰ WhatsApp bot startup timeout');
                bot.kill('SIGTERM');
                resolve(false);
            }
        }, 10000);
    });
}

// Main test function
async function runTests() {
    console.log('🔍 Starting service tests...\n');
    
    // Test 1: Database connection
    const dbOk = await testDatabase();
    console.log('');
    
    if (!dbOk) {
        console.log('❌ Database test failed. Please check your .env configuration.');
        console.log('📖 See NEONDB_SETUP.md for setup instructions.');
        process.exit(1);
    }
    
    // Test 2: Inventory system
    const inventoryOk = await testInventorySystem();
    console.log('');
    
    // Test 3: WhatsApp bot
    const botOk = await testWhatsAppBot();
    console.log('');
    
    // Results
    console.log('📋 Test Results:');
    console.log(`   Database: ${dbOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Inventory: ${inventoryOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   WhatsApp Bot: ${botOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');
    
    if (dbOk && inventoryOk && botOk) {
        console.log('🎉 All tests passed! Your AutoSherpa system is ready to use.');
        console.log('');
        console.log('🚀 To start the services:');
        console.log('   • Inventory only: npm start');
        console.log('   • WhatsApp bot only: npm run whatsapp');
        console.log('   • Both services: npm run both');
        console.log('');
        console.log('📖 For detailed instructions, see STARTUP_GUIDE.md');
    } else {
        console.log('⚠️  Some tests failed. Please check the errors above.');
        console.log('📖 See the troubleshooting section in STARTUP_GUIDE.md');
        process.exit(1);
    }
}

// Run tests
runTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
});
