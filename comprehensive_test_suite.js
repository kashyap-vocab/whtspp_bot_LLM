const { handleBrowseUsedCars } = require('./utils/handleBrowseUsedCars');
const pool = require('./db');

// Test data and configurations
const UNRELATED_MESSAGES = [
  'I want to eat you',
  'What is the weather today?',
  'Tell me a joke',
  'I love pizza',
  'I hate this',
  'How to cook pasta?',
  'I love football',
  'What movie should I watch?',
  'I need help with my job',
  'My family is visiting',
  'I want to kill someone',
  'I am sick today',
  'School is boring',
  'Money is tight',
  'I love music'
];

const CAR_RELATED_MESSAGES = [
  'I want to buy a car',
  'Show me cars',
  'What cars do you have?',
  'Browse cars',
  'I need a vehicle',
  'Looking for a sedan',
  'Honda cars please',
  'Budget is 10 lakhs',
  'I want to test drive',
  'Book a test drive'
];

const BUDGET_OPTIONS = [
  'Under ₹5 Lakhs',
  '₹5-10 Lakhs', 
  '₹10-15 Lakhs',
  '₹15-20 Lakhs',
  'Above ₹20 Lakhs'
];

const CAR_TYPES = ['Hatchback', 'SUV', 'Sedan'];
const CAR_BRANDS = ['Honda', 'Maruti', 'Hyundai', 'Toyota'];

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

// Test function for unrelated topic detection
async function testUnrelatedDetection(step, stepName) {
  console.log(`\n🧪 === TESTING UNRELATED DETECTION: ${stepName} ===`);
  
  const session = createTestSession(step);
  let caughtCount = 0;
  let missedCount = 0;
  
  for (const message of UNRELATED_MESSAGES) {
    try {
      const response = await handleBrowseUsedCars(pool, session, message, '918125607196');
      
      const isRedirect = response.message.includes("I'm here to help you with cars!");
      if (isRedirect) {
        caughtCount++;
        console.log(`✅ CAUGHT: "${message}"`);
      } else {
        missedCount++;
        console.log(`❌ MISSED: "${message}" → ${response.message.substring(0, 50)}...`);
      }
    } catch (error) {
      console.error(`❌ ERROR: "${message}" → ${error.message}`);
      missedCount++;
    }
  }
  
  console.log(`📊 ${stepName} Results: ${caughtCount}/${UNRELATED_MESSAGES.length} caught, ${missedCount} missed`);
  return { caught: caughtCount, missed: missedCount };
}

// Test function for car-related message handling
async function testCarRelatedHandling(step, stepName) {
  console.log(`\n🚗 === TESTING CAR-RELATED HANDLING: ${stepName} ===`);
  
  const session = createTestSession(step);
  let handledCount = 0;
  let errorCount = 0;
  
  for (const message of CAR_RELATED_MESSAGES) {
    try {
      const response = await handleBrowseUsedCars(pool, session, message, '918125607196');
      
      const isRedirect = response.message.includes("I'm here to help you with cars!");
      if (!isRedirect) {
        handledCount++;
        console.log(`✅ HANDLED: "${message}" → ${response.message.substring(0, 50)}...`);
      } else {
        console.log(`❌ WRONGLY REDIRECTED: "${message}"`);
        errorCount++;
      }
    } catch (error) {
      console.error(`❌ ERROR: "${message}" → ${error.message}`);
      errorCount++;
    }
  }
  
  console.log(`📊 ${stepName} Results: ${handledCount}/${CAR_RELATED_MESSAGES.length} handled correctly, ${errorCount} errors`);
  return { handled: handledCount, errors: errorCount };
}

// Test budget parsing combinations
async function testBudgetParsing() {
  console.log(`\n💰 === TESTING BUDGET PARSING COMBINATIONS ===`);
  
  const budgetTests = [
    { input: '5 lakhs', expected: '₹5-10 Lakhs' },
    { input: '10 lakh budget', expected: '₹10-15 Lakhs' },
    { input: 'under 5 lakh', expected: 'Under ₹5 Lakhs' },
    { input: 'above 20 lakhs', expected: 'Above ₹20 Lakhs' },
    { input: '15 lakhs', expected: '₹15-20 Lakhs' },
    { input: '₹8 lakhs', expected: '₹5-10 Lakhs' },
    { input: '12 lakh budget', expected: '₹10-15 Lakhs' },
    { input: '18 lakhs', expected: '₹15-20 Lakhs' }
  ];
  
  const session = createTestSession('browse_budget');
  let successCount = 0;
  
  for (const test of budgetTests) {
    try {
      const response = await handleBrowseUsedCars(pool, session, test.input, '918125607196');
      
      // Check if budget was correctly parsed (session should have budget set)
      if (response.message.includes('Great!') || response.message.includes('Which brand')) {
        successCount++;
        console.log(`✅ "${test.input}" → Parsed correctly`);
      } else {
        console.log(`❌ "${test.input}" → ${response.message.substring(0, 50)}...`);
      }
    } catch (error) {
      console.error(`❌ ERROR: "${test.input}" → ${error.message}`);
    }
  }
  
  console.log(`📊 Budget Parsing Results: ${successCount}/${budgetTests.length} successful`);
  return successCount;
}

// Test car type parsing combinations
async function testTypeParsing() {
  console.log(`\n🚙 === TESTING CAR TYPE PARSING COMBINATIONS ===`);
  
  const typeTests = [
    { input: 'hatchback', expected: 'Hatchback' },
    { input: 'SUV', expected: 'SUV' },
    { input: 'sedan', expected: 'Sedan' },
    { input: 'I want a hatchback', expected: 'Hatchback' },
    { input: 'show me SUVs', expected: 'SUV' },
    { input: 'sedan cars', expected: 'Sedan' },
    { input: 'small car', expected: 'Hatchback' },
    { input: 'big car', expected: 'SUV' }
  ];
  
  const session = createTestSession('browse_type', { budget: '₹10-15 Lakhs' });
  let successCount = 0;
  
  for (const test of typeTests) {
    try {
      const response = await handleBrowseUsedCars(pool, session, test.input, '918125607196');
      
      if (response.message.includes('Great!') || response.message.includes('Which brand')) {
        successCount++;
        console.log(`✅ "${test.input}" → Parsed correctly`);
      } else {
        console.log(`❌ "${test.input}" → ${response.message.substring(0, 50)}...`);
      }
    } catch (error) {
      console.error(`❌ ERROR: "${test.input}" → ${error.message}`);
    }
  }
  
  console.log(`📊 Type Parsing Results: ${successCount}/${typeTests.length} successful`);
  return successCount;
}

// Test brand parsing combinations
async function testBrandParsing() {
  console.log(`\n🏭 === TESTING BRAND PARSING COMBINATIONS ===`);
  
  const brandTests = [
    { input: 'honda', expected: 'Honda' },
    { input: 'maruti', expected: 'Maruti' },
    { input: 'hyundai', expected: 'Hyundai' },
    { input: 'toyota', expected: 'Toyota' },
    { input: 'I want Honda', expected: 'Honda' },
    { input: 'show me Maruti cars', expected: 'Maruti' },
    { input: 'Hyundai please', expected: 'Hyundai' },
    { input: 'Toyota vehicles', expected: 'Toyota' }
  ];
  
  const session = createTestSession('browse_brand', { 
    budget: '₹10-15 Lakhs', 
    type: 'Hatchback' 
  });
  let successCount = 0;
  
  for (const test of brandTests) {
    try {
      const response = await handleBrowseUsedCars(pool, session, test.input, '918125607196');
      
      if (response.message.includes('Great!') || response.message.includes('cars available')) {
        successCount++;
        console.log(`✅ "${test.input}" → Parsed correctly`);
      } else {
        console.log(`❌ "${test.input}" → ${response.message.substring(0, 50)}...`);
      }
    } catch (error) {
      console.error(`❌ ERROR: "${test.input}" → ${error.message}`);
    }
  }
  
  console.log(`📊 Brand Parsing Results: ${successCount}/${brandTests.length} successful`);
  return successCount;
}

// Test test drive flow scenarios
async function testTestDriveFlow() {
  console.log(`\n🚗 === TESTING TEST DRIVE FLOW SCENARIOS ===`);
  
  const testDriveScenarios = [
    {
      name: 'Complete Test Drive Booking',
      steps: [
        { step: 'test_drive_date', input: 'Tomorrow', expected: 'time selection' },
        { step: 'test_drive_time', input: 'Morning', expected: 'name collection' },
        { step: 'td_name', input: 'John Doe', expected: 'phone collection' },
        { step: 'td_phone', input: '9876543210', expected: 'license check' },
        { step: 'td_license', input: 'Yes', expected: 'location mode' },
        { step: 'td_location_mode', input: 'Showroom pickup', expected: 'confirmation' }
      ]
    },
    {
      name: 'Test Drive with Home Pickup',
      steps: [
        { step: 'test_drive_date', input: 'Today', expected: 'time selection' },
        { step: 'test_drive_time', input: 'Afternoon', expected: 'name collection' },
        { step: 'td_name', input: 'Jane Smith', expected: 'phone collection' },
        { step: 'td_phone', input: '8765432109', expected: 'license check' },
        { step: 'td_license', input: 'Yes', expected: 'location mode' },
        { step: 'td_location_mode', input: 'Home pickup', expected: 'address collection' },
        { step: 'td_home_address', input: '123 Main Street, Bangalore', expected: 'confirmation' }
      ]
    }
  ];
  
  let totalSuccess = 0;
  let totalTests = 0;
  
  for (const scenario of testDriveScenarios) {
    console.log(`\n📋 Testing: ${scenario.name}`);
    
    let session = createTestSession('test_drive_date', { 
      selectedCar: 'Honda Jazz Jazz EX' 
    });
    
    let scenarioSuccess = 0;
    
    for (const testStep of scenario.steps) {
      try {
        session.step = testStep.step;
        const response = await handleBrowseUsedCars(pool, session, testStep.input, '918125607196');
        
        // Check if we moved to next step or got expected response
        if (response.message.includes('Great!') || 
            response.message.includes('confirmation') ||
            response.message.includes('phone') ||
            response.message.includes('license') ||
            response.message.includes('location') ||
            response.message.includes('address')) {
          scenarioSuccess++;
          console.log(`✅ ${testStep.step}: "${testStep.input}" → Success`);
        } else {
          console.log(`❌ ${testStep.step}: "${testStep.input}" → ${response.message.substring(0, 50)}...`);
        }
        
        totalTests++;
      } catch (error) {
        console.error(`❌ ERROR in ${testStep.step}: ${error.message}`);
        totalTests++;
      }
    }
    
    console.log(`📊 ${scenario.name}: ${scenarioSuccess}/${scenario.steps.length} successful`);
    totalSuccess += scenarioSuccess;
  }
  
  console.log(`📊 Test Drive Flow Results: ${totalSuccess}/${totalTests} successful`);
  return totalSuccess;
}

// Test unrelated topics in test drive flow
async function testUnrelatedInTestDrive() {
  console.log(`\n🚫 === TESTING UNRELATED TOPICS IN TEST DRIVE FLOW ===`);
  
  const testDriveSteps = [
    'td_name',
    'td_phone', 
    'td_license',
    'td_location_mode',
    'td_home_address'
  ];
  
  let totalCaught = 0;
  let totalTests = 0;
  
  for (const step of testDriveSteps) {
    const session = createTestSession(step, { 
      selectedCar: 'Honda Jazz Jazz EX',
      td_name: 'John Doe'
    });
    
    let caughtInStep = 0;
    
    for (const message of UNRELATED_MESSAGES.slice(0, 5)) { // Test first 5 unrelated messages
      try {
        const response = await handleBrowseUsedCars(pool, session, message, '918125607196');
        
        const isRedirect = response.message.includes("I'm here to help you with cars!");
        if (isRedirect) {
          caughtInStep++;
          totalCaught++;
        }
        
        totalTests++;
      } catch (error) {
        console.error(`❌ ERROR in ${step}: ${error.message}`);
        totalTests++;
      }
    }
    
    console.log(`📊 ${step}: ${caughtInStep}/5 unrelated messages caught`);
  }
  
  console.log(`📊 Test Drive Unrelated Detection: ${totalCaught}/${totalTests} caught`);
  return totalCaught;
}

// Main test runner
async function runComprehensiveTests() {
  console.log('🚀 === COMPREHENSIVE TEST SUITE STARTING ===\n');
  
  const results = {
    unrelatedDetection: {},
    carRelatedHandling: {},
    parsingTests: {},
    testDriveFlow: 0,
    testDriveUnrelated: 0
  };
  
  // Test unrelated detection in all flow steps
  const flowSteps = [
    { step: 'browse_start', name: 'Browse Start' },
    { step: 'browse_budget', name: 'Browse Budget' },
    { step: 'browse_type', name: 'Browse Type' },
    { step: 'browse_brand', name: 'Browse Brand' },
    { step: 'td_name', name: 'Test Drive Name' },
    { step: 'td_phone', name: 'Test Drive Phone' },
    { step: 'td_license', name: 'Test Drive License' },
    { step: 'booking_complete', name: 'Booking Complete' }
  ];
  
  for (const flowStep of flowSteps) {
    results.unrelatedDetection[flowStep.name] = await testUnrelatedDetection(flowStep.step, flowStep.name);
    results.carRelatedHandling[flowStep.name] = await testCarRelatedHandling(flowStep.step, flowStep.name);
  }
  
  // Test parsing combinations
  results.parsingTests.budget = await testBudgetParsing();
  results.parsingTests.type = await testTypeParsing();
  results.parsingTests.brand = await testBrandParsing();
  
  // Test test drive flow
  results.testDriveFlow = await testTestDriveFlow();
  results.testDriveUnrelated = await testUnrelatedInTestDrive();
  
  // Print final summary
  console.log('\n🎯 === FINAL TEST SUMMARY ===');
  
  console.log('\n📊 Unrelated Topic Detection:');
  let totalUnrelatedCaught = 0;
  let totalUnrelatedTests = 0;
  for (const [stepName, result] of Object.entries(results.unrelatedDetection)) {
    totalUnrelatedCaught += result.caught;
    totalUnrelatedTests += result.caught + result.missed;
    console.log(`  ${stepName}: ${result.caught}/${result.caught + result.missed} caught`);
  }
  console.log(`  OVERALL: ${totalUnrelatedCaught}/${totalUnrelatedTests} caught (${Math.round(totalUnrelatedCaught/totalUnrelatedTests*100)}%)`);
  
  console.log('\n📊 Car-Related Message Handling:');
  let totalCarHandled = 0;
  let totalCarTests = 0;
  for (const [stepName, result] of Object.entries(results.carRelatedHandling)) {
    totalCarHandled += result.handled;
    totalCarTests += result.handled + result.errors;
    console.log(`  ${stepName}: ${result.handled}/${result.handled + result.errors} handled correctly`);
  }
  console.log(`  OVERALL: ${totalCarHandled}/${totalCarTests} handled correctly (${Math.round(totalCarHandled/totalCarTests*100)}%)`);
  
  console.log('\n📊 Parsing Tests:');
  console.log(`  Budget Parsing: ${results.parsingTests.budget}/8 successful`);
  console.log(`  Type Parsing: ${results.parsingTests.type}/8 successful`);
  console.log(`  Brand Parsing: ${results.parsingTests.brand}/8 successful`);
  
  console.log('\n📊 Test Drive Flow:');
  console.log(`  Complete Flow: ${results.testDriveFlow} steps successful`);
  console.log(`  Unrelated Detection: ${results.testDriveUnrelated} caught`);
  
  console.log('\n🎉 === TEST SUITE COMPLETED ===');
}

// Run the tests
runComprehensiveTests().catch(console.error);
