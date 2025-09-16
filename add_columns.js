const pool = require('./db');

async function addColumns() {
  try {
    console.log('Adding missing columns to cars table...');
    
    await pool.query('ALTER TABLE cars ADD COLUMN IF NOT EXISTS mileage INTEGER');
    console.log('✅ Added mileage column');
    
    await pool.query('ALTER TABLE cars ADD COLUMN IF NOT EXISTS engine_cc INTEGER');
    console.log('✅ Added engine_cc column');
    
    await pool.query('ALTER TABLE cars ADD COLUMN IF NOT EXISTS transmission VARCHAR(50)');
    console.log('✅ Added transmission column');
    
    await pool.query('ALTER TABLE cars ADD COLUMN IF NOT EXISTS color VARCHAR(50)');
    console.log('✅ Added color column');
    
    await pool.query('ALTER TABLE cars ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'available\'');
    console.log('✅ Added status column');
    
    console.log('🎉 All columns added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding columns:', error.message);
  } finally {
    await pool.end();
  }
}

addColumns();
