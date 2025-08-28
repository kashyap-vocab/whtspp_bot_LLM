const xlsx = require('xlsx');
const { pool } = require('../db');

async function importExcel() {
  const workbook = xlsx.readFile('./data/brand_models.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);

  await pool.query(`CREATE TABLE IF NOT EXISTS car_brands_models (
    id SERIAL PRIMARY KEY,
    brand TEXT NOT NULL,
    model TEXT NOT NULL
  )`);

  for (const row of rows) {
    const brand = row.Brand?.trim();
    const model = row.Model?.trim();

    if (brand && model) {
      await pool.query(
        'INSERT INTO car_brands_models (brand, model) VALUES ($1, $2)',
        [brand, model]
      );
    }
  }

  console.log('✅ Data imported to Neon DB');
  process.exit();
}

importExcel().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
