/**
 * User Profile Management Utility
 * Handles saving and retrieving user profiles for future reference
 */

const pool = require('../db');

/**
 * Save or update user profile
 * @param {Object} userData - User data object
 * @param {string} userData.phone - User's phone number (required)
 * @param {string} userData.name - User's name
 * @param {string} userData.location - User's location
 * @param {string} userData.preferred_brand - User's preferred car brand
 * @param {string} userData.preferred_type - User's preferred car type
 * @param {string} userData.budget_range - User's budget range
 * @returns {Promise<Object>} - Result object with success status and profile data
 */
async function saveUserProfile(userData) {
  try {
    if (!pool || typeof pool.query !== 'function') {
      console.error('❌ Database pool not available');
      throw new Error('Database connection not available');
    }

    const { phone, name, location, preferred_brand, preferred_type, budget_range } = userData;

    if (!phone) {
      throw new Error('Phone number is required');
    }

    // Check if user profile already exists
    const existingProfile = await pool.query(
      'SELECT * FROM user_profiles WHERE phone = $1',
      [phone]
    );

    if (existingProfile.rows.length > 0) {
      // Update existing profile
      const result = await pool.query(
        `UPDATE user_profiles 
         SET name = COALESCE($2, name),
             location = COALESCE($3, location),
             preferred_brand = COALESCE($4, preferred_brand),
             preferred_type = COALESCE($5, preferred_type),
             budget_range = COALESCE($6, budget_range),
             last_interaction = CURRENT_TIMESTAMP,
             total_interactions = total_interactions + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE phone = $1
         RETURNING *`,
        [phone, name, location, preferred_brand, preferred_type, budget_range]
      );

      console.log('✅ User profile updated:', result.rows[0]);
      return {
        success: true,
        profile: result.rows[0],
        action: 'updated'
      };
    } else {
      // Create new profile
      const result = await pool.query(
        `INSERT INTO user_profiles 
         (phone, name, location, preferred_brand, preferred_type, budget_range, last_interaction, total_interactions)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, 1)
         RETURNING *`,
        [phone, name, location, preferred_brand, preferred_type, budget_range]
      );

      console.log('✅ User profile created:', result.rows[0]);
      return {
        success: true,
        profile: result.rows[0],
        action: 'created'
      };
    }
  } catch (error) {
    console.error('❌ Error saving user profile:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get user profile by phone number
 * @param {string} phone - User's phone number
 * @returns {Promise<Object>} - User profile or null if not found
 */
async function getUserProfile(phone) {
  try {
    if (!pool || typeof pool.query !== 'function') {
      console.error('❌ Database pool not available');
      throw new Error('Database connection not available');
    }

    const result = await pool.query(
      'SELECT * FROM user_profiles WHERE phone = $1',
      [phone]
    );

    if (result.rows.length > 0) {
      console.log('✅ User profile found:', result.rows[0]);
      return result.rows[0];
    } else {
      console.log('ℹ️ No user profile found for phone:', phone);
      return null;
    }
  } catch (error) {
    console.error('❌ Error retrieving user profile:', error);
    return null;
  }
}

/**
 * Extract user preferences from session data
 * @param {Object} session - Session object
 * @returns {Object} - User preferences object
 */
function extractUserPreferences(session) {
  return {
    phone: session.td_phone || session.phone,
    name: session.td_name || session.name,
    location: session.location,
    preferred_brand: session.brand,
    preferred_type: session.type,
    budget_range: session.budget
  };
}

module.exports = {
  saveUserProfile,
  getUserProfile,
  extractUserPreferences
};
