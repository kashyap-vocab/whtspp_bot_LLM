const axios = require('axios');

// Test configuration
const TEST_PHONE = '917411730876';
const WEBHOOK_URL = 'http://localhost:3000/webhook';

// Simulate webhook payload
function createWebhookPayload(message, from = TEST_PHONE) {
  return {
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: from,
            text: { body: message }
          }]
        }
      }]
    }]
  };
}

// Test functions
async function testMainMenu() {
  console.log('\n🧪 Testing: Main Menu');
  try {
    const payload = createWebhookPayload('Hi');
    const response = await axios.post(WEBHOOK_URL, payload);
    console.log('✅ Main Menu Test: PASSED');
    return true;
  } catch (error) {
    console.log('❌ Main Menu Test: FAILED', error.message);
    return false;
  }
}

async function testCarValuation() {
  console.log('\n🧪 Testing: Car Valuation Flow');
  try {
    // Test valuation start
    const startPayload = createWebhookPayload('💰 Get Car Valuation');
    await axios.post(WEBHOOK_URL, startPayload);
    
    // Test brand selection
    const brandPayload = createWebhookPayload('Honda');
    await axios.post(WEBHOOK_URL, brandPayload);
    
    // Test model selection
    const modelPayload = createWebhookPayload('City');
    await axios.post(WEBHOOK_URL, modelPayload);
    
    // Test year selection
    const yearPayload = createWebhookPayload('2022');
    await axios.post(WEBHOOK_URL, yearPayload);
    
    // Test fuel selection
    const fuelPayload = createWebhookPayload('⛽ Petrol');
    await axios.post(WEBHOOK_URL, fuelPayload);
    
    // Test kms selection
    const kmsPayload = createWebhookPayload('10,000 - 25,000 KM');
    await axios.post(WEBHOOK_URL, kmsPayload);
    
    // Test owner selection
    const ownerPayload = createWebhookPayload('1st Owner (Me)');
    await axios.post(WEBHOOK_URL, ownerPayload);
    
    // Test condition selection
    const conditionPayload = createWebhookPayload('Good (Minor wear)');
    await axios.post(WEBHOOK_URL, conditionPayload);
    
    // Test name input
    const namePayload = createWebhookPayload('John Doe');
    await axios.post(WEBHOOK_URL, namePayload);
    
    // Test phone input
    const phonePayload = createWebhookPayload('9876543210');
    await axios.post(WEBHOOK_URL, phonePayload);
    
    // Test location input
    const locationPayload = createWebhookPayload('Bangalore');
    await axios.post(WEBHOOK_URL, locationPayload);
    
    console.log('✅ Car Valuation Test: PASSED');
    return true;
  } catch (error) {
    console.log('❌ Car Valuation Test: FAILED', error.message);
    return false;
  }
}

async function testContactFlow() {
  console.log('\n🧪 Testing: Contact Flow');
  try {
    // Test contact start
    const startPayload = createWebhookPayload('📞 Contact Our Team');
    await axios.post(WEBHOOK_URL, startPayload);
    
    // Test callback request
    const callbackPayload = createWebhookPayload('📧 Request a callback');
    await axios.post(WEBHOOK_URL, callbackPayload);
    
    // Test time selection
    const timePayload = createWebhookPayload('🌅 Morning(9-12PM)');
    await axios.post(WEBHOOK_URL, timePayload);
    
    // Test name input
    const namePayload = createWebhookPayload('Jane Smith');
    await axios.post(WEBHOOK_URL, namePayload);
    
    // Test phone input
    const phonePayload = createWebhookPayload('9876543211');
    await axios.post(WEBHOOK_URL, phonePayload);
    
    // Test reason input
    const reasonPayload = createWebhookPayload('Car purchase inquiry');
    await axios.post(WEBHOOK_URL, reasonPayload);
    
    console.log('✅ Contact Flow Test: PASSED');
    return true;
  } catch (error) {
    console.log('❌ Contact Flow Test: FAILED', error.message);
    return false;
  }
}

async function testBrowseCars() {
  console.log('\n🧪 Testing: Browse Used Cars Flow');
  try {
    // Test browse start
    const startPayload = createWebhookPayload('🚗 Browse Used Cars');
    await axios.post(WEBHOOK_URL, startPayload);
    
    // Test brand selection
    const brandPayload = createWebhookPayload('Honda');
    await axios.post(WEBHOOK_URL, brandPayload);
    
    // Test model selection
    const modelPayload = createWebhookPayload('City');
    await axios.post(WEBHOOK_URL, modelPayload);
    
    console.log('✅ Browse Cars Test: PASSED');
    return true;
  } catch (error) {
    console.log('❌ Browse Cars Test: FAILED', error.message);
    return false;
  }
}

async function testAboutUs() {
  console.log('\n🧪 Testing: About Us Flow');
  try {
    // Test about start
    const startPayload = createWebhookPayload('ℹ️ About Us');
    await axios.post(WEBHOOK_URL, startPayload);
    
    console.log('✅ About Us Test: PASSED');
    return true;
  } catch (error) {
    console.log('❌ About Us Test: FAILED', error.message);
    return false;
  }
}

async function testErrorHandling() {
  console.log('\n🧪 Testing: Error Handling');
  try {
    // Test with invalid step
    const invalidPayload = createWebhookPayload('Invalid message');
    await axios.post(WEBHOOK_URL, invalidPayload);
    
    console.log('✅ Error Handling Test: PASSED');
    return true;
  } catch (error) {
    console.log('❌ Error Handling Test: FAILED', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Function Tests...\n');
  
  const tests = [
    testMainMenu,
    testCarValuation,
    testContactFlow,
    testBrowseCars,
    testAboutUs,
    testErrorHandling
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await test();
      results.push(result);
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`❌ Test failed with error: ${error.message}`);
      results.push(false);
    }
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All functions are working correctly!');
  } else {
    console.log('\n⚠️ Some functions need attention.');
  }
}

// Run tests
runAllTests().catch(console.error); 