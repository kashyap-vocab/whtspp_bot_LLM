const { handleBrowseUsedCars } = require('./utils/handleBrowseUsedCars');
const pool = require('./db');

// Quick test scenarios without hitting API limits
async function quickTestScenarios() {
  console.log('🚀 === QUICK TEST SCENARIOS ===\n');
  
  // Test 1: Unrelated topic at booking_complete (should work with keyword fallback)
  console.log('🧪 TEST 1: Unrelated topic at booking_complete');
  const session1 = createTestSession('booking_complete', { 
    selectedCar: 'Honda Jazz Jazz EX',
    td_name: 'John Doe'
  });
  
  const unrelatedTests = [
    'I want to eat you',
    'What is the weather today?',
    'Tell me a joke',
    'I love pizza'
  ];
  
  let caughtCount = 0;
  for (const message of unrelatedTests) {
    try {
      const response = await handleBrowseUsedCars(pool, session1, message, '918125607196');
      const isRedirect = response.message.includes("I'm here to help you with cars!");
      if (isRedirect) {
        caughtCount++;
        console.log(`✅ CAUGHT: "${message}"`);
      } else {
        console.log(`❌ MISSED: "${message}" → ${response.message.substring(0, 50)}...`);
      }
    } catch (error) {
      console.log(`❌ ERROR: "${message}" → ${error.message}`);
    }
  }
  console.log(`📊 Booking Complete: ${caughtCount}/${unrelatedTests.length} caught\n`);
  
  // Test 2: Car-related message at booking_complete (should NOT be redirected)
  console.log('🚗 TEST 2: Car-related message at booking_complete');
  const carRelatedTests = [
    'I want to buy a car',
    'Show me cars',
    'Browse cars'
  ];
  
  let handledCount = 0;
  for (const message of carRelatedTests) {
    try {
      const response = await handleBrowseUsedCars(pool, session1, message, '918125607196');
      const isRedirect = response.message.includes("I'm here to help you with cars!");
      if (!isRedirect) {
        handledCount++;
        console.log(`✅ HANDLED: "${message}" → ${response.message.substring(0, 50)}...`);
      } else {
        console.log(`❌ WRONGLY REDIRECTED: "${message}"`);
      }
    } catch (error) {
      console.log(`❌ ERROR: "${message}" → ${error.message}`);
    }
  }
  console.log(`📊 Car Messages: ${handledCount}/${carRelatedTests.length} handled correctly\n`);
  
  // Test 3: Test drive flow with unrelated topics
  console.log('🚫 TEST 3: Unrelated topics in test drive flow');
  const testDriveSteps = ['td_name', 'td_phone', 'td_license'];
  
  for (const step of testDriveSteps) {
    const session = createTestSession(step, { 
      selectedCar: 'Honda Jazz Jazz EX',
      td_name: 'John Doe'
    });
    
    let caughtInStep = 0;
    for (const message of ['I want to eat you', 'What is the weather?']) {
      try {
        const response = await handleBrowseUsedCars(pool, session, message, '918125607196');
        const isRedirect = response.message.includes("I'm here to help you with cars!");
        if (isRedirect) {
          caughtInStep++;
        }
      } catch (error) {
        // Ignore errors for this quick test
      }
    }
    console.log(`📊 ${step}: ${caughtInStep}/2 unrelated messages caught`);
  }
  console.log();
  
  // Test 4: Name validation fix
  console.log('👤 TEST 4: Name validation fix');
  const nameSession = createTestSession('td_name', { 
    selectedCar: 'Honda Jazz Jazz EX'
  });
  
  const nameTests = ['Sai', 'John Doe', 'A', '123'];
  
  for (const name of nameTests) {
    try {
      const response = await handleBrowseUsedCars(pool, nameSession, name, '918125607196');
      if (response.message.includes('phone') || response.message.includes('Phone')) {
        console.log(`✅ ACCEPTED: "${name}" → Moved to phone step`);
      } else {
        console.log(`❌ REJECTED: "${name}" → ${response.message.substring(0, 50)}...`);
      }
    } catch (error) {
      console.log(`❌ ERROR: "${name}" → ${error.message}`);
    }
  }
  console.log();
  
  // Test 5: Phone validation
  console.log('📱 TEST 5: Phone validation');
  const phoneSession = createTestSession('td_phone', { 
    selectedCar: 'Honda Jazz Jazz EX',
    td_name: 'John Doe'
  });
  
  const phoneTests = ['9876543210', '987654321', 'abc123', '1234567890'];
  
  for (const phone of phoneTests) {
    try {
      const response = await handleBrowseUsedCars(pool, phoneSession, phone, '918125607196');
      if (response.message.includes('license') || response.message.includes('License')) {
        console.log(`✅ ACCEPTED: "${phone}" → Moved to license step`);
      } else {
        console.log(`❌ REJECTED: "${phone}" → ${response.message.substring(0, 50)}...`);
      }
    } catch (error) {
      console.log(`❌ ERROR: "${phone}" → ${error.message}`);
    }
  }
  console.log();
  
  console.log('🎉 === QUICK TEST SCENARIOS COMPLETED ===');
}

// Helper function to create test session
function createTestSession(step, data = {}) {
  return {
    step: step,
    budget: data.budget || null,
    type: data.type || null,
    brand: data.brand || null,
    userChoices: data.userChoices || {},
    filteredCars: data.filteredCars || [],
    carIndex: data.carIndex || 0,
    selectedCar: data.selectedCar || null,
    testDriveDate: data.testDriveDate || null,
    testDriveActualDate: data.testDriveActualDate || null,
    testDriveDateFormatted: data.testDriveDateFormatted || null,
    testDriveTime: data.testDriveTime || null,
    td_name: data.td_name || null,
    td_phone: data.td_phone || null,
    td_license: data.td_license || null,
    td_location_mode: data.td_location_mode || null,
    td_home_address: data.td_home_address || null
  };
}

// Run the quick tests
quickTestScenarios().catch(console.error);
