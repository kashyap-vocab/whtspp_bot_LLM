const pool = require('./db');

async function checkDatabase() {
  try {
    console.log('🔍 Checking database contents...\n');
    
    // Check total cars
    const totalCars = await pool.query('SELECT COUNT(*) as count FROM cars');
    console.log(`📊 Total cars in database: ${totalCars.rows[0].count}\n`);
    
    // Check brands
    const brands = await pool.query('SELECT DISTINCT brand, COUNT(*) as count FROM cars GROUP BY brand ORDER BY count DESC');
    console.log('🚗 Brands available:');
    brands.rows.forEach(row => {
      console.log(`   ${row.brand}: ${row.count} cars`);
    });
    console.log();
    
    // Check types
    const types = await pool.query('SELECT DISTINCT type, COUNT(*) as count FROM cars GROUP BY type ORDER BY count DESC');
    console.log('🏷️ Car types available:');
    types.rows.forEach(row => {
      console.log(`   ${row.type}: ${row.count} cars`);
    });
    console.log();
    
    // Check Kia cars specifically
    const kiaCars = await pool.query('SELECT brand, model, type, price FROM cars WHERE brand = $1', ['Kia']);
    console.log('🚗 Kia cars available:');
    if (kiaCars.rows.length === 0) {
      console.log('   No Kia cars found');
    } else {
      kiaCars.rows.forEach(row => {
        console.log(`   ${row.brand} ${row.model} (${row.type}) - ₹${row.price}`);
      });
    }
    console.log();
    
    // Check hatchback cars
    const hatchbackCars = await pool.query('SELECT brand, model, type, price FROM cars WHERE type = $1', ['Hatchback']);
    console.log('🚗 Hatchback cars available:');
    if (hatchbackCars.rows.length === 0) {
      console.log('   No hatchback cars found');
    } else {
      hatchbackCars.rows.forEach(row => {
        console.log(`   ${row.brand} ${row.model} (${row.type}) - ₹${row.price}`);
      });
    }
    console.log();
    
    // Check cars in ₹10-15 Lakhs range
    const budgetCars = await pool.query('SELECT brand, model, type, price FROM cars WHERE CAST(price AS NUMERIC) >= 1000000 AND CAST(price AS NUMERIC) <= 1500000');
    console.log('💰 Cars in ₹10-15 Lakhs range:');
    if (budgetCars.rows.length === 0) {
      console.log('   No cars found in this price range');
    } else {
      budgetCars.rows.forEach(row => {
        console.log(`   ${row.brand} ${row.model} (${row.type}) - ₹${row.price}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase();