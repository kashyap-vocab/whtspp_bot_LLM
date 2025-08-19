require('dotenv').config();
const { handleOutOfContextQuestion, isOutOfContext } = require('./utils/geminiHandler');

async function testGeminiIntegration() {
  console.log('🧪 Testing Gemini API Integration\n');

  // Test cases
  const testCases = [
    "Help me cook biryani",
    "What's the weather today?",
    "Tell me a joke",
    "How to play cricket?",
    "I want to buy a car", // This should NOT trigger out-of-context
    "Show me Honda cars", // This should NOT trigger out-of-context
    "What's the price of Hyundai i20?", // This should NOT trigger out-of-context
    "Can you help me with cooking?", // This should trigger out-of-context
    "What's the meaning of life?", // This should trigger out-of-context
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Testing: "${testCase}"`);
    
    // Test out-of-context detection
    const isOutOfContextResult = isOutOfContext(testCase);
    console.log(`🔍 Is out of context: ${isOutOfContextResult}`);
    
    if (isOutOfContextResult) {
      console.log('🤖 Calling Gemini API...');
      try {
        const response = await handleOutOfContextQuestion(testCase);
        console.log(`✅ Gemini Response: ${response.substring(0, 100)}...`);
      } catch (error) {
        console.error(`❌ Error: ${error.message}`);
      }
    } else {
      console.log('✅ Message is car-related, no Gemini call needed');
    }
    
    console.log('─'.repeat(50));
  }
}

// Run the test
testGeminiIntegration().catch(console.error);
