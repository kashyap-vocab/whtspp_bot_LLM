// Retry function for database queries
async function retryQuery(pool, queryFn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await queryFn();
    } catch (error) {
      console.error(`Database query attempt ${i + 1} failed:`, error.message);
      
      // Don't retry for certain types of errors
      if (error.code === '42P01' || error.code === '42703') {
        // Table doesn't exist or column doesn't exist - don't retry
        throw error;
      }
      
      if (i === maxRetries - 1) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, i) * 1000;
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function getAllBrands(pool) {
  try {
    // Get brands from your actual cars inventory
    const res = await retryQuery(pool, async () => {
      return await pool.query('SELECT DISTINCT brand FROM cars WHERE brand IS NOT NULL ORDER BY brand');
    });
    
    if (res.rows.length > 0) {
      const brands = res.rows.map(row => row.brand);
      console.log(`📈 Found ${brands.length} brands in database:`, brands);
      // Limit to 10 brands for WhatsApp list compatibility
      return brands.slice(0, 10);
    }
    
    console.log('📭 No brands found in database, returning defaults');
    return ['Hyundai', 'Maruti', 'Honda', 'Tata', 'Mahindra'];
  } catch (error) {
    console.error('Error fetching brands from cars table:', error);
    // Return default brands if database query fails
    return ['Hyundai', 'Maruti', 'Honda', 'Tata', 'Mahindra'];
  }
}

async function getModelsByBrand(pool, brand) {
  try {
    // Get models from your actual cars inventory
    const res = await retryQuery(pool, async () => {
      return await pool.query('SELECT DISTINCT model FROM cars WHERE brand = $1 AND model IS NOT NULL ORDER BY model', [brand]);
    });
    
    if (res.rows.length > 0) {
      const models = res.rows.map(row => row.model);
      console.log(`📈 Found ${models.length} models for brand ${brand}:`, models);
      // Limit to 10 models for WhatsApp list compatibility
      return models.slice(0, 10);
    }
    
    console.log(`📭 No models found for brand ${brand}, returning defaults`);
    return ['City', 'Swift', 'i20', 'Nexon', 'XUV'];
  } catch (error) {
    console.error('Error fetching models from cars table:', error);
    // Return default models if database query fails
    return ['City', 'Swift', 'i20', 'Nexon', 'XUV'];
  }
}

function formatRupees(amount) {
  if (typeof amount === 'string') {
    // Convert string to number for formatting
    const numAmount = parseInt(amount);
    if (!isNaN(numAmount)) {
      return `₹${numAmount.toLocaleString('en-IN')}`;
    }
    return amount; // Return as-is if not a valid number
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

async function getAvailableTypes(pool, budget) {
  try {
    // Query the database to get actual car types from your Excel data
    // We'll infer the type from the model/variant names
    let query = 'SELECT DISTINCT model, variant FROM cars WHERE 1=1';
    let params = [];
    let paramCount = 0;
    
    // Filter by budget range
    if (budget && budget !== 'Any') {
      let minPrice = 0;
      let maxPrice = 999999999;
      
      if (budget.includes('Under ₹5')) {
        maxPrice = 500000;
      } else if (budget.includes('₹5-10')) {
        minPrice = 500000;
        maxPrice = 1000000;
      } else if (budget.includes('₹10-15')) {
        minPrice = 1000000;
        maxPrice = 1500000;
      } else if (budget.includes('₹15-20')) {
        minPrice = 1500000;
        maxPrice = 2000000;
      } else if (budget.includes('Above ₹20')) {
        minPrice = 2000000;
      }
      
      paramCount++;
      query += ` AND CAST(price AS NUMERIC) >= $${paramCount}`;
      params.push(minPrice);
      
      if (maxPrice < 999999999) {
        paramCount++;
        query += ` AND CAST(price AS NUMERIC) <= $${paramCount}`;
        params.push(maxPrice);
      }
    }
    
    query += ' ORDER BY model, variant';
    
    console.log('🔍 Types query:', query);
    console.log('📊 Types params:', params);
    
    // Use retry mechanism for the query
    const res = await retryQuery(pool, async () => {
      return await pool.query(query, params);
    });
    
    // Infer car types from model names
    const typeMap = new Map();
    res.rows.forEach(row => {
      const model = row.model?.toLowerCase() || '';
      const variant = row.variant?.toLowerCase() || '';
      
      // Map common model names to car types
      if (model.includes('swift') || model.includes('i10') || model.includes('alto') || model.includes('celerio')) {
        typeMap.set('Hatchback', true);
      } else if (model.includes('city') || model.includes('verna') || model.includes('amaze') || model.includes('dzire')) {
        typeMap.set('Sedan', true);
      } else if (model.includes('creta') || model.includes('venue') || model.includes('brezza') || model.includes('xuv')) {
        typeMap.set('SUV', true);
      } else if (model.includes('thar') || model.includes('scorpio')) {
        typeMap.set('SUV', true);
      } else if (model.includes('innova') || model.includes('ertiga') || model.includes('carens')) {
        typeMap.set('MUV', true);
      }
    });
    
    // Convert to array and add default types if none found
    const types = Array.from(typeMap.keys());
    if (types.length === 0) {
      types.push('Hatchback', 'Sedan', 'SUV', 'MUV');
    }
    
    console.log(`📈 Found ${types.length} car types from database:`, types);
    return types;
  } catch (error) {
    console.error('Error fetching car types:', error);
    // Return default types if database query fails
    return ['Hatchback', 'Sedan', 'SUV', 'MUV'];
  }
}

async function getAvailableBrands(pool, budget, type) {
  try {
    // Build query to get available brands from your actual cars table
    let query = 'SELECT DISTINCT brand FROM cars WHERE brand IS NOT NULL';
    let params = [];
    let paramCount = 0;
    
    // Filter by type (infer from model/variant names)
    if (type && type !== 'Any' && type !== 'all') {
      let typeConditions = [];
      
      if (type === 'Hatchback') {
        typeConditions = ["model ILIKE '%swift%'", "model ILIKE '%i10%'", "model ILIKE '%alto%'", "model ILIKE '%celerio%'"];
      } else if (type === 'Sedan') {
        typeConditions = ["model ILIKE '%city%'", "model ILIKE '%verna%'", "model ILIKE '%amaze%'", "model ILIKE '%dzire%'"];
      } else if (type === 'SUV') {
        typeConditions = ["model ILIKE '%creta%'", "model ILIKE '%venue%'", "model ILIKE '%brezza%'", "model ILIKE '%xuv%'", "model ILIKE '%thar%'", "model ILIKE '%scorpio%'"];
      } else if (type === 'MUV') {
        typeConditions = ["model ILIKE '%innova%'", "model ILIKE '%ertiga%'", "model ILIKE '%carens%'"];
      }
      
      if (typeConditions.length > 0) {
        query += ` AND (${typeConditions.join(' OR ')})`;
      }
    }
    
    // Filter by budget range
    if (budget && budget !== 'Any') {
      let minPrice = 0;
      let maxPrice = 999999999;
      
      if (budget.includes('Under ₹5')) {
        maxPrice = 500000;
      } else if (budget.includes('₹5-10')) {
        minPrice = 500000;
        maxPrice = 1000000;
      } else if (budget.includes('₹10-15')) {
        minPrice = 1000000;
        maxPrice = 1500000;
      } else if (budget.includes('₹15-20')) {
        minPrice = 1500000;
        maxPrice = 2000000;
      } else if (budget.includes('Above ₹20')) {
        minPrice = 2000000;
      }
      
      paramCount++;
      query += ` AND CAST(price AS NUMERIC) >= $${paramCount}`;
      params.push(minPrice);
      
      if (maxPrice < 999999999) {
        paramCount++;
        query += ` AND CAST(price AS NUMERIC) <= $${paramCount}`;
        params.push(maxPrice);
      }
    }
    
    query += ' ORDER BY brand';
    
    console.log('🔍 Brands query:', query);
    console.log('📊 Brands params:', params);
    
    // Use retry mechanism for the main query
    const res = await retryQuery(pool, async () => {
      return await pool.query(query, params);
    });
    
    const brands = res.rows.map(row => row.brand);
    console.log(`📈 Found ${brands.length} brands with available cars:`, brands);
    // Limit to 10 brands for WhatsApp list compatibility
    return brands.slice(0, 10);
  } catch (error) {
    console.error('Error fetching brands:', error);
    // Return default brands if database query fails
    return ['Hyundai', 'Maruti', 'Honda', 'Tata', 'Mahindra'];
  }
}

async function getCarsByFilter(pool, budget, type, brand) {
  try {
    let query = 'SELECT * FROM cars WHERE 1=1'; // Start with a valid WHERE clause
    let params = [];
    let paramCount = 0;

    // Filter by brand
    if (brand && brand !== 'Any' && brand !== 'all') {
      paramCount++;
      query += ` AND brand = $${paramCount}`;
      params.push(brand);
    }

    // Filter by type (infer from model/variant names)
    if (type && type !== 'Any' && type !== 'all') {
      let typeConditions = [];
      
      if (type === 'Hatchback') {
        typeConditions = ["model ILIKE '%swift%'", "model ILIKE '%i10%'", "model ILIKE '%alto%'", "model ILIKE '%celerio%'"];
      } else if (type === 'Sedan') {
        typeConditions = ["model ILIKE '%city%'", "model ILIKE '%verna%'", "model ILIKE '%amaze%'", "model ILIKE '%dzire%'"];
      } else if (type === 'SUV') {
        typeConditions = ["model ILIKE '%creta%'", "model ILIKE '%venue%'", "model ILIKE '%brezza%'", "model ILIKE '%xuv%'", "model ILIKE '%thar%'", "model ILIKE '%scorpio%'"];
      } else if (type === 'MUV') {
        typeConditions = ["model ILIKE '%innova%'", "model ILIKE '%ertiga%'", "model ILIKE '%carens%'"];
      }
      
      if (typeConditions.length > 0) {
        query += ` AND (${typeConditions.join(' OR ')})`;
      }
    }

    // Filter by budget range
    if (budget && budget !== 'Any') {
      let minPrice = 0;
      let maxPrice = 999999999;
      
      if (budget.includes('Under ₹5')) {
        maxPrice = 500000;
      } else if (budget.includes('₹5-10')) {
        minPrice = 500000;
        maxPrice = 1000000;
      } else if (budget.includes('₹10-15')) {
        minPrice = 1000000;
        maxPrice = 1500000;
      } else if (budget.includes('₹15-20')) {
        minPrice = 1500000;
        maxPrice = 2000000;
      } else if (budget.includes('Above ₹20')) {
        minPrice = 2000000;
      }
      
      paramCount++;
      query += ` AND CAST(price AS NUMERIC) >= $${paramCount}`;
      params.push(minPrice);
      
      if (maxPrice < 999999999) {
        paramCount++;
        query += ` AND CAST(price AS NUMERIC) <= $${paramCount}`;
        params.push(maxPrice);
      }
    }

    query += ' ORDER BY CAST(price AS NUMERIC) ASC LIMIT 20';
    
    console.log('🔍 Query:', query);
    console.log('📊 Params:', params);
    
    // Use retry mechanism for the query
    const res = await retryQuery(pool, async () => {
      return await pool.query(query, params);
    });
    
    console.log(`📈 Found ${res.rows.length} cars matching criteria`);
    return res.rows;
  } catch (error) {
    console.error('Error fetching cars by filter:', error);
    return [];
  }
}

// Function to get car images from database
async function getCarImages(pool, carId) {
  try {
    const res = await retryQuery(pool, async () => {
      return await pool.query('SELECT image_path, image_type FROM car_images WHERE car_id = $1 ORDER BY image_type', [carId]);
    });
    
    const images = res.rows.map(row => ({
      path: row.image_path,
      type: row.image_type
    }));
    
    console.log(`📸 Found ${images.length} images for car ${carId}`);
    return images;
  } catch (error) {
    console.error('Error fetching car images:', error);
    return [];
  }
}

// Function to get car images by registration number using the new naming convention
async function getCarImagesByRegistration(pool, registrationNumber) {
  try {
    // Check if images exist in the new naming convention: uploads/cars/registrationNumber_1.jpg, etc.
    const fs = require('fs');
    const path = require('path');
    
    const carImageDir = path.join('uploads', 'cars', registrationNumber);
    
    if (!fs.existsSync(carImageDir)) {
      console.log(`📁 Image directory not found: ${carImageDir}`);
      return [];
    }
    
    // Read directory and find images with the new naming pattern
    const files = fs.readdirSync(carImageDir);
    const imageFiles = files.filter(file => 
      file.match(/^[^_]+_\d+\.(jpg|jpeg|png|gif)$/i) && 
      file.startsWith(registrationNumber + '_')
    );
    
    // Sort images by sequence number (1, 2, 3, 4)
    imageFiles.sort((a, b) => {
      const seqA = parseInt(a.match(/_(\d+)\./)[1]);
      const seqB = parseInt(b.match(/_(\d+)\./)[1]);
      return seqA - seqB;
    });
    
    console.log(`📸 Found ${imageFiles.length} images in directory for ${registrationNumber}:`, imageFiles);
    
    // Create image objects with the new path structure
    const images = imageFiles.map((filename, index) => {
      const imagePath = `uploads/cars/${registrationNumber}/${filename}`;
      const imageType = ['front', 'back', 'side', 'interior'][index] || 'additional';
      
      return {
        path: imagePath,
        type: imageType,
        filename: filename,
        sequence: index + 1
      };
    });
    
    return images;
  } catch (error) {
    console.error('Error fetching car images by registration:', error);
    return [];
  }
}

// Simple function to get image URLs by registration number (for WhatsApp bot)
function getImageUrlsByRegistration(registrationNumber, baseUrl = null) {
  const base = baseUrl || 'http://localhost:3000';
  const imageUrls = [];
  
  // Check for images 1-4 using the new naming convention
  for (let i = 1; i <= 4; i++) {
    const imagePath = `uploads/cars/${registrationNumber}/${registrationNumber}_${i}.jpg`;
    imageUrls.push({
      url: `${base}/${imagePath}`,
      sequence: i,
      type: ['front', 'back', 'side', 'interior'][i - 1] || 'additional'
    });
  }
  
  return imageUrls;
}

module.exports = {
  getAllBrands,
  getModelsByBrand,
  formatRupees,
  getAvailableTypes,
  getAvailableBrands,
  getCarsByFilter,
  getCarImages,
  getCarImagesByRegistration,
  getImageUrlsByRegistration
};
