require('dotenv').config();
const { routeMessage } = require('./utils/mainRouter');

async function testIntegration() {
  console.log('🧪 Testing Complete Integration Flow\n');

  // Simulate a conversation session
  const session = {};
  let stepCount = 0;

  const conversationSteps = [
    {
      name: "Initial greeting",
      message: "Hi",
      expectedBehavior: "Should show main menu or Gemini response"
    },
    {
      name: "Out-of-context question",
      message: "Help me cook biryani",
      expectedBehavior: "Should trigger Gemini and redirect to car services"
    },
    {
      name: "Browse cars option",
      message: "🚗 Browse Used Cars",
      expectedBehavior: "Should start browse flow"
    },
    {
      name: "Select brand",
      message: "Honda",
      expectedBehavior: "Should show Honda models"
    },
    {
      name: "Select model",
      message: "City",
      expectedBehavior: "Should show City variants"
    },
    {
      name: "Another out-of-context question",
      message: "What's the weather like?",
      expectedBehavior: "Should trigger Gemini and redirect back"
    },
    {
      name: "Continue with car selection",
      message: "🚗 Browse Used Cars",
      expectedBehavior: "Should restart browse flow"
    },
    {
      name: "Get valuation",
      message: "💰 Get Car Valuation",
      expectedBehavior: "Should start valuation flow"
    },
    {
      name: "Select brand for valuation",
      message: "Hyundai",
      expectedBehavior: "Should show Hyundai models for valuation"
    },
    {
      name: "Contact team",
      message: "📞 Contact Our Team",
      expectedBehavior: "Should start contact flow"
    },
    {
      name: "About us",
      message: "ℹ️ About Us",
      expectedBehavior: "Should show about us information"
    }
  ];

  console.log('🔄 Starting conversation simulation...\n');

  for (const step of conversationSteps) {
    stepCount++;
    console.log(`\n${stepCount}. ${step.name}`);
    console.log(`📝 Message: "${step.message}"`);
    console.log(`🎯 Expected: ${step.expectedBehavior}`);
    
    try {
      const response = await routeMessage(session, step.message);
      
      if (response) {
        console.log(`✅ Response: ${response.message ? response.message.substring(0, 100) + '...' : 'No message'}`);
        
        // Check if it has options (menu)
        if (response.options && response.options.length > 0) {
          console.log(`📋 Menu options: ${response.options.length} available`);
        }
        
        // Check session state
        console.log(`🧠 Session step: ${session.step || 'none'}`);
        
      } else {
        console.log(`⚠️ No response received`);
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
    
    console.log('─'.repeat(60));
  }

  console.log('\n📊 Integration Test Summary:');
  console.log('=============================');
  console.log(`✅ Total steps tested: ${stepCount}`);
  console.log(`🧠 Final session state: ${JSON.stringify(session, null, 2)}`);
  console.log('\n🎉 Integration test completed!');
}

// Test specific scenarios
async function testSpecificScenarios() {
  console.log('\n🔍 Testing Specific Scenarios\n');

  const scenarios = [
    {
      name: "Empty message handling",
      message: "",
      session: {}
    },
    {
      name: "Whitespace message handling", 
      message: "   ",
      session: {}
    },
    {
      name: "Random characters",
      message: "???",
      session: {}
    },
    {
      name: "Numbers only",
      message: "123",
      session: {}
    },
    {
      name: "Very long message",
      message: "This is a very long message that should test how the system handles lengthy input from users who might be typing a lot of text to see if there are any issues with processing or response generation",
      session: {}
    }
  ];

  for (const scenario of scenarios) {
    console.log(`\n📝 Testing: ${scenario.name}`);
    console.log(`💬 Message: "${scenario.message}"`);
    
    try {
      const response = await routeMessage(scenario.session, scenario.message);
      
      if (response) {
        console.log(`✅ Handled successfully`);
        console.log(`📄 Response preview: ${response.message ? response.message.substring(0, 50) + '...' : 'No message'}`);
      } else {
        console.log(`⚠️ No response (expected for some cases)`);
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
}

// Run both tests
async function runAllTests() {
  await testIntegration();
  await testSpecificScenarios();
}

runAllTests().catch(console.error);
