// Test Complete Browse Flow with Working API
const { handleBrowseUsedCars } = require('./utils/handleBrowseUsedCars');

console.log('🚀 Testing Complete Browse Flow with Working API...');

// Mock pool object for database queries
const mockPool = {
  query: async (query, params) => {
    console.log('📊 Mock DB Query:', query.substring(0, 50) + '...');
    // Return mock car data
    if (query.includes('SELECT DISTINCT budget')) {
      return { rows: [{ budget: 'Under ₹5 Lakhs' }, { budget: '₹5-10 Lakhs' }] };
    }
    return { rows: [] };
  }
};

async function testFlow() {
  console.log('\n=== Test 1: Browse Start with Intent Parsing ===');
  
  try {
    const result1 = await handleBrowseUsedCars(
      mockPool,
      { step: 'browse_start', preferences: {} },
      'I want to buy a sedan under 10 lakhs',
      '1234567890'
    );
    console.log('✅ Browse Start Result:', JSON.stringify(result1, null, 2));
  } catch (error) {
    console.error('❌ Browse Start Error:', error.message);
  }

  console.log('\n=== Test 2: Unrelated Topic Detection ===');
  
  try {
    const result2 = await handleBrowseUsedCars(
      mockPool,
      { step: 'browse_start', preferences: {} },
      'What is the weather today?',
      '1234567890'
    );
    console.log('✅ Unrelated Topic Result:', JSON.stringify(result2, null, 2));
  } catch (error) {
    console.error('❌ Unrelated Topic Error:', error.message);
  }

  console.log('\n=== Test 3: Option Validation ===');
  
  try {
    const result3 = await handleBrowseUsedCars(
      mockPool,
      { step: 'browse_budget', preferences: {} },
      'I want something under 5 lakhs',
      '1234567890'
    );
    console.log('✅ Option Validation Result:', JSON.stringify(result3, null, 2));
  } catch (error) {
    console.error('❌ Option Validation Error:', error.message);
  }

  console.log('\n=== Test 4: Step Input Validation ===');
  
  try {
    const result4 = await handleBrowseUsedCars(
      mockPool,
      { step: 'td_name', preferences: {} },
      'John Doe',
      '1234567890'
    );
    console.log('✅ Name Validation Result:', JSON.stringify(result4, null, 2));
  } catch (error) {
    console.error('❌ Name Validation Error:', error.message);
  }
}

testFlow().then(() => {
  console.log('\n🏁 All tests completed!');
  process.exit(0);
}).catch(err => {
  console.error('\n💥 Test suite crashed:', err);
  process.exit(1);
});
