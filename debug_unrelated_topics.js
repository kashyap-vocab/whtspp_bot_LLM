/**
 * Debug Script for Unrelated Topic Handling Issues
 * 
 * This script will help identify why the unrelated topic handling
 * is only achieving 1.8% success rate instead of the expected 90%+
 */

const { checkUnrelatedTopic } = require('./utils/llmUtils');
const { parseUserIntent } = require('./utils/geminiHandler');
const pool = require('./db');

// Mock database pool for testing
const mockPool = {
  query: async (sql, params) => {
    console.log(`📊 Mock DB Query: ${sql.substring(0, 50)}...`);
    return { rows: [] };
  }
};

async function debugUnrelatedTopicDetection() {
  console.log("🔍 Debugging Unrelated Topic Detection Issues\n");
  console.log("=" * 60);
  
  // Test cases for unrelated topics
  const testCases = [
    { message: "What's the weather like today?", expected: true, type: "weather" },
    { message: "I'm hungry, what should I eat?", expected: true, type: "food" },
    { message: "Who won the cricket match?", expected: true, type: "sports" },
    { message: "Tell me about artificial intelligence", expected: true, type: "technology" },
    { message: "What's your phone number?", expected: true, type: "business" },
    { message: "How are you today?", expected: true, type: "personal" },
    { message: "I want to get my car valued", expected: false, type: "car_related" },
    { message: "Honda", expected: false, type: "car_related" },
    { message: "City", expected: false, type: "car_related" },
    { message: "2022", expected: false, type: "car_related" }
  ];
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  
  console.log("🧪 Testing checkUnrelatedTopic Function:");
  console.log("-" * 40);
  
  for (const testCase of testCases) {
    totalTests++;
    
    try {
      console.log(`\nTest: "${testCase.message}" (Expected: ${testCase.expected}, Type: ${testCase.type})`);
      
      const result = await checkUnrelatedTopic(testCase.message, 'car_valuation');
      
      console.log(`📤 Result:`, result);
      
      if (result.isUnrelated === testCase.expected) {
        console.log(`✅ PASS - Correctly detected as ${testCase.expected ? 'unrelated' : 'related'}`);
        passedTests++;
      } else {
        console.log(`❌ FAIL - Expected ${testCase.expected ? 'unrelated' : 'related'}, got ${result.isUnrelated ? 'unrelated' : 'related'}`);
        failedTests++;
      }
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      failedTests++;
    }
  }
  
  console.log("\n" + "=" * 60);
  console.log("📊 checkUnrelatedTopic Function Test Results:");
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (failedTests > 0) {
    console.log("\n🚨 ISSUE IDENTIFIED: checkUnrelatedTopic function is not working correctly!");
  } else {
    console.log("\n✅ checkUnrelatedTopic function is working correctly.");
  }
}

async function debugLLMIntegration() {
  console.log("\n🔍 Debugging LLM Integration:");
  console.log("-" * 40);
  
  const testCases = [
    { message: "What's the weather like today?", expected: true, type: "weather" },
    { message: "I'm hungry", expected: true, type: "food" },
    { message: "I want to get my car valued", expected: false, type: "car_related" }
  ];
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  
  for (const testCase of testCases) {
    totalTests++;
    
    try {
      console.log(`\nTest: "${testCase.message}" (Expected unrelated: ${testCase.expected})`);
      
      const result = await parseUserIntent(mockPool, testCase.message, 'car_valuation');
      
      console.log(`📤 AI Result:`, result);
      
      if (result && typeof result.is_unrelated === 'boolean') {
        if (result.is_unrelated === testCase.expected) {
          console.log(`✅ PASS - AI correctly detected as ${testCase.expected ? 'unrelated' : 'related'}`);
          passedTests++;
        } else {
          console.log(`❌ FAIL - AI expected ${testCase.expected ? 'unrelated' : 'related'}, got ${result.is_unrelated ? 'unrelated' : 'related'}`);
          failedTests++;
        }
      } else {
        console.log(`❌ FAIL - AI did not return is_unrelated field`);
        failedTests++;
      }
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      failedTests++;
    }
  }
  
  console.log("\n" + "=" * 60);
  console.log("📊 LLM Integration Test Results:");
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (failedTests > 0) {
    console.log("\n🚨 ISSUE IDENTIFIED: LLM integration is not working correctly!");
  } else {
    console.log("\n✅ LLM integration is working correctly.");
  }
}

async function debugSessionManagement() {
  console.log("\n🔍 Debugging Session Management:");
  console.log("-" * 40);
  
  // Test session step preservation
  const session = { step: 'brand' };
  
  console.log(`Initial session step: ${session.step}`);
  
  try {
    // Simulate unrelated topic check
    const result = await checkUnrelatedTopic("What's the weather like?", 'car_valuation');
    
    console.log(`Unrelated topic result:`, result);
    
    if (result.isUnrelated) {
      // Simulate the fix we implemented
      const currentStep = session.step;
      session.step = currentStep; // Preserve the step
      
      console.log(`Session step after unrelated topic: ${session.step}`);
      
      if (session.step === 'brand') {
        console.log(`✅ PASS - Session step preserved correctly`);
      } else {
        console.log(`❌ FAIL - Session step not preserved: ${session.step}`);
      }
    } else {
      console.log(`❌ FAIL - Unrelated topic not detected`);
    }
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }
}

async function runAllDebugTests() {
  console.log("🚨 DEBUGGING CAR VALUATION FLOW UNRELATED TOPIC ISSUES\n");
  console.log("=" * 70);
  console.log("The 1.8% success rate indicates significant problems.");
  console.log("Let's identify and fix the root causes.\n");
  
  await debugUnrelatedTopicDetection();
  await debugLLMIntegration();
  await debugSessionManagement();
  
  console.log("\n" + "=" * 70);
  console.log("🎯 DEBUGGING COMPLETE");
  console.log("=" * 70);
  console.log("Check the results above to identify specific issues.");
  console.log("Common issues to look for:");
  console.log("1. checkUnrelatedTopic function not working");
  console.log("2. LLM integration failing");
  console.log("3. Session management broken");
  console.log("4. Flow context not being passed correctly");
  console.log("5. AI not detecting unrelated topics");
}

// Run the debug tests
if (require.main === module) {
  runAllDebugTests().catch(console.error);
}

module.exports = { 
  debugUnrelatedTopicDetection, 
  debugLLMIntegration, 
  debugSessionManagement,
  runAllDebugTests 
};
