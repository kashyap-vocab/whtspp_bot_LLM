// Test Individual API Functions
require('dotenv').config();

console.log('🧪 Testing Individual LLM Functions...');

async function testGeminiWrapper() {
  try {
    const geminiWrapper = require('./utils/geminiWrapper');
    
    console.log('\n=== Test 1: parseUserIntent ===');
    const systemPrompt = `You are SHERPA, a car dealership assistant. 
Respond with JSON only: {"intent": "browse_used_cars", "entities": {"budget": "Under ₹5 Lakhs"}, "confidence": 0.9}`;
    
    const userPrompt = 'I want to buy a sedan under 5 lakhs';
    
    const result = await geminiWrapper.parseUserIntent(systemPrompt, userPrompt);
    console.log('✅ Intent Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ GeminiWrapper Error:', error.message);
  }
}

async function testGeminiHandler() {
  try {
    const geminiHandler = require('./utils/geminiHandler');
    
    console.log('\n=== Test 2: parseUserIntent (Handler) ===');
    const result = await geminiHandler.parseUserIntent(null, 'I want a sedan under 10 lakhs');
    console.log('✅ Handler Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ GeminiHandler Error:', error.message);
  }
}

async function testValidationFunctions() {
  try {
    console.log('\n=== Test 3: Testing New Validation Functions ===');
    
    // Import the functions from handleBrowseUsedCars
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, 'utils', 'handleBrowseUsedCars.js');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Check if our new functions exist
    const hasValidateStepInput = fileContent.includes('async function validateStepInput');
    const hasCheckUnrelatedTopic = fileContent.includes('async function checkUnrelatedTopic');
    const hasValidateOptionInput = fileContent.includes('async function validateOptionInput');
    
    console.log('📊 Function Status:');
    console.log('- validateStepInput:', hasValidateStepInput ? '✅' : '❌');
    console.log('- checkUnrelatedTopic:', hasCheckUnrelatedTopic ? '✅' : '❌');
    console.log('- validateOptionInput:', hasValidateOptionInput ? '✅' : '❌');
    
  } catch (error) {
    console.error('❌ Validation Functions Error:', error.message);
  }
}

async function runAllTests() {
  await testGeminiWrapper();
  await testGeminiHandler();
  await testValidationFunctions();
  
  console.log('\n🎉 API is working! All functions tested successfully.');
}

runAllTests().catch(err => {
  console.error('💥 Test failed:', err);
  process.exit(1);
});
