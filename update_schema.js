const { pool } = require('./db');
const fs = require('fs');
const path = require('path');

async function updateSchema() {
    try {
        console.log('🔧 Updating database schema...');
        
        // Read the schema file
        const schemaPath = path.join(__dirname, 'db', 'schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        // Split the SQL into individual statements
        const statements = schemaSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`📋 Found ${statements.length} SQL statements to execute`);
        
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                try {
                    console.log(`🔨 Executing statement ${i + 1}/${statements.length}...`);
                    await pool.query(statement);
                    console.log(`✅ Statement ${i + 1} executed successfully`);
                } catch (error) {
                    if (error.code === '42P07') {
                        // Table already exists, this is fine
                        console.log(`ℹ️ Statement ${i + 1} skipped (already exists)`);
                    } else {
                        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
                    }
                }
            }
        }
        
        console.log('✅ Database schema update completed!');
        
        // Verify the new table exists
        const tableCheck = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'callback_requests'
        `);
        
        if (tableCheck.rows.length > 0) {
            console.log('✅ callback_requests table created successfully');
            
            // Check table structure
            const structureCheck = await pool.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'callback_requests'
                ORDER BY ordinal_position
            `);
            
            console.log('📋 Table structure:');
            structureCheck.rows.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
            });
        } else {
            console.log('❌ callback_requests table was not created');
        }
        
    } catch (error) {
        console.error('❌ Schema update failed:', error);
    } finally {
        await pool.end();
    }
}

// Check if server is running
async function checkServer() {
    try {
        await pool.query('SELECT 1');
        console.log('✅ Database connection successful, proceeding with schema update...');
        await updateSchema();
    } catch (error) {
        console.error('❌ Database connection failed. Please check your database configuration.');
        console.error('Make sure your .env file has the correct DATABASE_URL');
    }
}

checkServer();
