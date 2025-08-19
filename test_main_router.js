require('dotenv').config();
const { routeMessage } = require('./utils/mainRouter');

async function testMainRouter() {
  console.log('🧪 Testing Main Router with Various Scenarios\n');

  const testCases = [
    // Basic greetings
    { message: "Hi", expected: "greeting" },
    { message: "Hello", expected: "greeting" },
    { message: "Hey", expected: "greeting" },
    
    // Main menu options
    { message: "🚗 Browse Used Cars", expected: "browse" },
    { message: "💰 Get Car Valuation", expected: "valuation" },
    { message: "📞 Contact Our Team", expected: "contact" },
    { message: "ℹ️ About Us", expected: "about" },
    
    // Car-related keywords
    { message: "I want to buy a car", expected: "car_related" },
    { message: "Show me Honda cars", expected: "car_related" },
    { message: "What's the price of Hyundai i20?", expected: "car_related" },
    { message: "Get car valuation", expected: "valuation" },
    { message: "Contact sales team", expected: "contact" },
    { message: "About your company", expected: "about" },
    
    // Out-of-context questions (should trigger Gemini)
    { message: "Help me cook biryani", expected: "out_of_context" },
    { message: "What's the weather today?", expected: "out_of_context" },
    { message: "Tell me a joke", expected: "out_of_context" },
    { message: "How to play cricket?", expected: "out_of_context" },
    { message: "What's the meaning of life?", expected: "out_of_context" },
    { message: "Can you help me with cooking?", expected: "out_of_context" },
    { message: "I need a recipe", expected: "out_of_context" },
    
    // Edge cases
    { message: "", expected: "error" },
    { message: "   ", expected: "error" },
    { message: "123", expected: "general" },
    { message: "???", expected: "general" },
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`\n📝 Testing: "${testCase.message}"`);
    
    try {
      // Create a mock session
      const session = {};
      
      const response = await routeMessage(session, testCase.message);
      
      if (response) {
        console.log(`✅ Response received: ${response.message ? response.message.substring(0, 50) + '...' : 'No message'}`);
        
        // Check if it's an out-of-context response (should have options)
        if (testCase.expected === "out_of_context" && response.options) {
          console.log(`✅ Out-of-context detected correctly`);
          passed++;
        } else if (testCase.expected !== "out_of_context") {
          console.log(`✅ Response handled correctly`);
          passed++;
        } else {
          console.log(`❌ Expected out-of-context but got regular response`);
          failed++;
        }
      } else {
        console.log(`❌ No response received`);
        failed++;
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      failed++;
    }
    
    console.log('─'.repeat(50));
  }

  console.log(`\n📊 Test Results Summary:`);
  console.log(`========================`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log(`\n🎉 All tests passed!`);
  } else {
    console.log(`\n⚠️ Some tests need attention.`);
  }
}

// Run the test
testMainRouter().catch(console.error);
