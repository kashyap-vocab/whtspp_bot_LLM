const xlsx = require('xlsx');
const pool = require('../db');

async function importStockData() {
  try {
    console.log('📊 Reading Excel file...');
    const workbook = xlsx.readFile('./Stock Data - 28 July.xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    console.log(`📋 Found ${rows.length} rows in the Excel file`);
    
    // Log the first row to see the column structure
    if (rows.length > 0) {
      console.log('📝 Column headers:', Object.keys(rows[0]));
      console.log('📄 Sample row:', rows[0]);
    }

    // Table already exists, no need to create

    // Clear existing data
    await pool.query('DELETE FROM cars');
    console.log('🗑️ Cleared existing cars data');

    let importedCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
      try {
        // Map Excel columns to database columns
        // Adjust these mappings based on your Excel structure
        const make = row['Make'] || row['Brand'] || row['make'] || '';
        const model = row['Model'] || row['model'] || '';
        const variant = row['Variant'] || row['variant'] || row['Version'] || '';
        const manufacturingYear = parseInt(row['Manufacturing Year'] || row['Year'] || row['manufacturing_year']) || 2020;
        const fuelType = row['Fuel Type'] || row['Fuel'] || row['fuel_type'] || 'Petrol';
        const mileageKm = parseInt(row['Mileage (KM)'] || row['Mileage'] || row['KMs'] || row['mileage_km']) || 0;
        const estimatedSellingPrice = row['Estimated Selling Price'] || row['Price'] || row['Estimated Price'] || row['estimated_selling_price'] || '0';
        const type = row['Type'] || row['Body Type'] || row['type'] || 'Sedan';

        // Skip if essential data is missing
        if (!make || !model) {
          skippedCount++;
          continue;
        }

        // Debug price value
        if (importedCount < 5) {
          console.log(`🔍 Sample car ${importedCount + 1}: ${make} ${model} - Price: "${estimatedSellingPrice}" (type: ${typeof estimatedSellingPrice})`);
        }

        await pool.query(`
          INSERT INTO cars (brand, model, variant, year, fuel_type, mileage, price, type, color, engine_cc, transmission, status, registration_number)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          make.trim(),
          model.trim(),
          variant ? variant.trim() : '',
          manufacturingYear,
          fuelType.trim(),
          mileageKm,
          estimatedSellingPrice.toString(),
          type.trim(),
          row['Color'] || 'Unknown',
          parseInt(row['Cubic Capacity (CC)']) || 0,
          row['Transmission Type'] || 'Manual',
          'available',
          row['Registration Number'] || 'N/A'
        ]);

        importedCount++;
      } catch (error) {
        console.error('❌ Error importing row:', row, error.message);
        skippedCount++;
      }
    }

    console.log(`✅ Import completed!`);
    console.log(`📊 Successfully imported: ${importedCount} cars`);
    console.log(`⚠️ Skipped: ${skippedCount} rows`);

    // Show statistics
    const stats = await pool.query('SELECT brand, COUNT(*) as count FROM cars GROUP BY brand ORDER BY count DESC');
    console.log('\n📈 Cars by brand:');
    stats.rows.forEach(row => {
      console.log(`   ${row.brand}: ${row.count} cars`);
    });

    // Show price ranges
    const priceStats = await pool.query(`
      SELECT 
        CASE 
          WHEN CAST(price AS INTEGER) < 500000 THEN 'Under ₹5 Lakhs'
          WHEN CAST(price AS INTEGER) < 1000000 THEN '₹5-10 Lakhs'
          WHEN CAST(price AS INTEGER) < 1500000 THEN '₹10-15 Lakhs'
          WHEN CAST(price AS INTEGER) < 2000000 THEN '₹15-20 Lakhs'
          ELSE 'Above ₹20 Lakhs'
        END as price_range,
        COUNT(*) as count
      FROM cars 
      GROUP BY price_range 
      ORDER BY MIN(CAST(price AS INTEGER))
    `);
    
    console.log('\n💰 Cars by price range:');
    priceStats.rows.forEach(row => {
      console.log(`   ${row.price_range}: ${row.count} cars`);
    });

  } catch (error) {
    console.error('❌ Error importing stock data:', error);
  } finally {
    await pool.end();
  }
}

importStockData(); 