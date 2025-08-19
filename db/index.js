const { Pool } = require('pg');
require('dotenv').config();

console.log('🔍 Database connection setup:');
console.log('🔍 DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('🔍 DATABASE_URL length:', process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0);

// NeonDB connection configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test the connection
pool.on('connect', () => {
    console.log('✅ Connected to NeonDB successfully');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
});

console.log('🔍 Pool created successfully, type:', typeof pool);
console.log('🔍 Pool has query method:', typeof pool.query === 'function');

module.exports = pool;
