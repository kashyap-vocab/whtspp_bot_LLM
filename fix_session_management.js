/**
 * Fix for Session State Management Issues in Car Valuation Flow
 * 
 * Issues Fixed:
 * 1. Session state not preserved when unrelated topics are detected
 * 2. Brand validation edge cases
 * 3. Step progression after unrelated topic handling
 */

// Issue #1: Session State Preservation Fix
function fixSessionStatePreservation() {
  console.log("🔧 Fixing Session State Preservation Issue");
  
  // The problem: When unrelated topics are detected, session.step is not preserved
  // The fix: Store the current step before unrelated topic check and restore it
  
  const fixCode = `
// BEFORE (Current problematic code):
case 'brand':
  const brandTopicCheck = await checkUnrelatedTopic(userMessage, 'car_valuation');
  if (brandTopicCheck.isUnrelated && brandTopicCheck.confidence > 0.7) {
    const brands = await getAllBrands(pool);
    return {
      message: "I'm here to help with car valuations! Which brand is your car?",
      options: [...brands, "Other brands"]
    };
  }

// AFTER (Fixed code):
case 'brand':
  // Store current step before unrelated topic check
  const currentStep = session.step;
  
  const brandTopicCheck = await checkUnrelatedTopic(userMessage, 'car_valuation');
  if (brandTopicCheck.isUnrelated && brandTopicCheck.confidence > 0.7) {
    // Preserve the current step
    session.step = currentStep;
    
    const brands = await getAllBrands(pool);
    return {
      message: "I'm here to help with car valuations! Which brand is your car?",
      options: [...brands, "Other brands"]
    };
  }
  `;
  
  console.log("✅ Session state preservation fix identified");
  return fixCode;
}

// Issue #2: Brand Validation Enhancement
function fixBrandValidation() {
  console.log("🔧 Fixing Brand Validation Edge Case");
  
  const fixCode = `
// BEFORE (Current problematic code):
if (predefinedOptions.includes(userMessage)) {
  // Get brands first for quick response
  const brands = await getAllBrands(pool);
  session.step = 'brand';
  return {
    message: "Great! I'll help you get a valuation for your car...",
    options: [...brands, "Other brands"]
  };
}

// AFTER (Fixed code):
if (predefinedOptions.includes(userMessage)) {
  // Get brands first for quick response
  const brands = await getAllBrands(pool);
  session.step = 'brand';
  return {
    message: "Great! I'll help you get a valuation for your car...",
    options: [...brands, "Other brands"]
  };
} else {
  // Check if it's an invalid input (contains numbers or special characters)
  const hasInvalidChars = /[0-9@#$%^&*()_+=\[\]{}|;':",./<>?]/.test(userMessage);
  if (hasInvalidChars && userMessage.length > 10) {
    const brands = await getAllBrands(pool);
    return {
      message: "I didn't understand that brand. Please select from the available options:",
      options: [...brands, "Other brands"]
    };
  }
}
  `;
  
  console.log("✅ Brand validation enhancement identified");
  return fixCode;
}

// Issue #3: Step Progression Logic Fix
function fixStepProgression() {
  console.log("🔧 Fixing Step Progression Logic");
  
  const fixCode = `
// BEFORE (Current problematic code):
// When user returns from unrelated topic, session.step might be lost

// AFTER (Fixed code):
// Add a helper function to maintain step context
function maintainStepContext(session, userMessage, currentStep) {
  // If user is returning from unrelated topic, preserve the step
  if (session.step !== currentStep && session.step !== 'start') {
    session.step = currentStep;
  }
}

// Use in each case:
case 'brand':
  maintainStepContext(session, userMessage, 'brand');
  // ... rest of the logic
  `;
  
  console.log("✅ Step progression logic fix identified");
  return fixCode;
}

// Create comprehensive fix
function createComprehensiveFix() {
  console.log("🚀 Creating Comprehensive Fix for All Issues");
  
  const comprehensiveFix = `
// COMPREHENSIVE FIX FOR CAR VALUATION FLOW ISSUES

// 1. Add helper function for step context maintenance
function maintainStepContext(session, userMessage, expectedStep) {
  // If session step is lost or incorrect, restore it
  if (session.step !== expectedStep && session.step !== 'start') {
    console.log(\`🔧 Restoring step context: \${session.step} -> \${expectedStep}\`);
    session.step = expectedStep;
  }
}

// 2. Enhanced unrelated topic handling with step preservation
async function handleUnrelatedTopicWithStepPreservation(session, userMessage, currentStep, flowContext) {
  const topicCheck = await checkUnrelatedTopic(userMessage, flowContext);
  if (topicCheck.isUnrelated && topicCheck.confidence > 0.7) {
    // Preserve the current step
    session.step = currentStep;
    return {
      isUnrelated: true,
      message: topicCheck.redirectMessage,
      options: ["🚗 Browse Used Cars", "💰 Get Car Valuation", "📞 Contact Our Team", "ℹ️ About Us"]
    };
  }
  return { isUnrelated: false };
}

// 3. Enhanced brand validation
function validateBrandInput(userMessage, availableBrands) {
  // Check for invalid characters
  const hasInvalidChars = /[0-9@#$%^&*()_+=\[\]{}|;':",./<>?]/.test(userMessage);
  
  // Check if it's clearly not a brand name
  if (hasInvalidChars && userMessage.length > 10) {
    return {
      isValid: false,
      reason: 'invalid_characters',
      message: 'I didn\'t understand that brand. Please select from the available options:'
    };
  }
  
  // Check for exact match
  if (availableBrands.includes(userMessage)) {
    return { isValid: true, matchedBrand: userMessage };
  }
  
  // Check for partial match
  const partialMatch = availableBrands.find(brand => 
    brand.toLowerCase().includes(userMessage.toLowerCase()) ||
    userMessage.toLowerCase().includes(brand.toLowerCase())
  );
  
  if (partialMatch) {
    return { isValid: true, matchedBrand: partialMatch };
  }
  
  return {
    isValid: false,
    reason: 'no_match',
    message: 'I didn\'t understand that brand. Please select from the available options:'
  };
}

// 4. Updated case handling with fixes
case 'brand':
  maintainStepContext(session, userMessage, 'brand');
  
  // Handle unrelated topics with step preservation
  const unrelatedResult = await handleUnrelatedTopicWithStepPreservation(session, userMessage, 'brand', 'car_valuation');
  if (unrelatedResult.isUnrelated) {
    return unrelatedResult;
  }
  
  // Enhanced brand validation
  const brands = await getAllBrands(pool);
  const brandValidation = validateBrandInput(userMessage, brands);
  
  if (!brandValidation.isValid) {
    return {
      message: brandValidation.message,
      options: [...brands, "Other brands"]
    };
  }
  
  // Continue with normal flow...
  session.brand = brandValidation.matchedBrand;
  session.step = 'model';
  // ... rest of the logic
  `;
  
  console.log("✅ Comprehensive fix created");
  return comprehensiveFix;
}

// Export the fixes
module.exports = {
  fixSessionStatePreservation,
  fixBrandValidation,
  fixStepProgression,
  createComprehensiveFix
};

// Run the analysis
if (require.main === module) {
  console.log("🔍 Analyzing Car Valuation Flow Issues");
  console.log("=" * 50);
  
  fixSessionStatePreservation();
  fixBrandValidation();
  fixStepProgression();
  createComprehensiveFix();
  
  console.log("\n🎯 ISSUE ANALYSIS COMPLETE");
  console.log("=" * 50);
  console.log("✅ Issue #1: Session State Preservation - Fix identified");
  console.log("✅ Issue #2: Brand Validation Edge Case - Fix identified");
  console.log("✅ Issue #3: Step Progression Logic - Fix identified");
  console.log("✅ Comprehensive fix created");
  console.log("\n📋 Next Steps:");
  console.log("1. Apply fixes to getCarValuation.js");
  console.log("2. Test fixes with updated test cases");
  console.log("3. Verify all issues are resolved");
}
