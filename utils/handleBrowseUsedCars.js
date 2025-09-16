const { formatRupees, getAvailableTypes, getAvailableBrands, getCarsByFilter , getCarImagesByRegistration} = require('./carData');
const { getNextAvailableDays, getTimeSlots, getActualDateFromSelection, getActualDateFromDaySelection } = require('./timeUtils');
const { validateBudget, validateCarType, validateBrand, validateName, validatePhoneNumber, createValidationErrorMessage } = require('./inputValidation');
const { parseDateTimeInput, convertToSessionFormat } = require('./dateTimeParser');
const { saveUserProfile, extractUserPreferences } = require('./userProfileManager');
const fs = require('fs');
const path = require('path');

// Import database connection
const pool = require('../db');
const { parseUserIntent } = require('./geminiHandler');
const { 
  checkUnrelatedTopic, 
  validateStepInput, 
  validateOptionInput
} = require('./llmUtils');

// LLM validation functions are now imported from modular llmUtils.js
// This ensures reusability across different flows without conflicts

// Note: The original validateStepInput function is now imported from llmUtils
// The following duplicate function definition has been removed to prevent conflicts

// Note: The original checkUnrelatedTopic function is now imported from llmUtils
// The following duplicate function definition has been removed to prevent conflicts
// All duplicate function bodies removed

// Helper function to construct image URL using the new naming convention
// Only returns URL if image exists in database
async function constructImageUrl(registrationNumber, sequenceNumber, baseUrl = null) {
  try {
    const pool = require('../db');
    
    // Check if this specific image exists in the database
    const res = await pool.query(`
      SELECT ci.image_path
      FROM car_images ci
      JOIN cars c ON ci.car_id = c.id
      WHERE c.registration_number = $1 AND ci.image_type = $2 
      LIMIT 1
    `, [registrationNumber, ['front', 'back', 'side', 'interior'][sequenceNumber - 1]]);
    
    if (res.rows.length === 0) {
      console.log(`📸 No image found for ${registrationNumber} sequence ${sequenceNumber}`);
      return null;
    }
    
    const base ='http://27.111.72.50:3000';
    const imagePath = res.rows[0].image_path;
    
    // Return Cloudinary URL if it's already a full URL, otherwise construct local URL
    if (imagePath.startsWith('http')) {
      return imagePath;
    } else {
      return `${base}/${imagePath}`;
    }
    
  } catch (error) {
    console.error('Error constructing image URL:', error);
    return null;
  }
}

// Helper function to check if an image URL is publicly accessible
function isPubliclyAccessible(baseUrl) {
  return baseUrl && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1');
}

// Helper function to detect budget change requests
function isBudgetChangeRequest(userMessage) {
  const lowerMsg = userMessage.toLowerCase();
  const budgetKeywords = [
    'budget', 'price', 'cost', 'lakh', 'lakhs', 'crore', 'crores', '₹', 'rupees',
    'under', 'above', 'between', 'range', 'afford', 'expensive', 'cheap'
  ];
  
  const changeKeywords = [
    'change', 'modify', 'update', 'different', 'new', 'switch', 'instead'
  ];
  
  const hasBudgetKeyword = budgetKeywords.some(keyword => lowerMsg.includes(keyword));
  const hasChangeKeyword = changeKeywords.some(keyword => lowerMsg.includes(keyword));
  
  // Check if it's a budget option
  const budgetOptions = [
    "under ₹5 lakhs", "₹5-10 lakhs", "₹10-15 lakhs", "₹15-20 lakhs", "above ₹20 lakhs",
    "Under ₹5 Lakhs", "₹5-10 Lakhs", "₹10-15 Lakhs", "₹15-20 Lakhs", "Above ₹20 Lakhs"
  ];
  const isBudgetOption = budgetOptions.some(option => 
    lowerMsg.includes(option.toLowerCase())
  );
  
  return (hasBudgetKeyword && hasChangeKeyword) || isBudgetOption;
}

// Helper function to detect if user is asking unrelated questions or needs guidance
function needsHumanAssistance(userMessage, currentStep) {
  const lowerMsg = userMessage.toLowerCase();
  
  // Unrelated questions or confusion indicators
  const confusionKeywords = [
    'what', 'how', 'why', 'when', 'where', 'help', 'confused', 'lost', 'stuck',
    'don\'t understand', 'not working', 'error', 'problem', 'issue', 'wrong',
    'different', 'other', 'else', 'instead', 'change', 'modify', 'update'
  ];
  
  // Off-topic questions
  const offTopicKeywords = [
    'weather', 'food', 'movie', 'music', 'sports', 'news', 'politics', 'travel',
    'hotel', 'restaurant', 'shopping', 'clothes', 'health', 'education', 'job'
  ];
  
  // Check if it's a question or confusion
  const isQuestion = lowerMsg.includes('?') || confusionKeywords.some(keyword => lowerMsg.includes(keyword));
  const isOffTopic = offTopicKeywords.some(keyword => lowerMsg.includes(keyword));
  
  // Check if user seems lost in the flow
  const isLost = currentStep && !['hi', 'hello', 'start', 'begin'].includes(lowerMsg) && 
                 !userMessage.match(/^[0-9]+$/) && // Not just a number
                 !userMessage.includes('₹') && // Not a budget
                 userMessage.length > 10; // Not a short selection
  
  return isQuestion || isOffTopic || isLost;
}

// Helper function to provide human-like assistance
function getHumanAssistanceMessage(currentStep, userChoices = {}) {
  const choices = userChoices;
  let message = "I understand you might be feeling a bit lost! 😊 Let me help you navigate this step by step.\n\n";
  
  // Show current progress
  if (choices.budget || choices.type || choices.brand) {
    message += "📋 Your current selections:\n";
    if (choices.budget) message += `💰 Budget: ${choices.budget}\n`;
    if (choices.type) message += `🚗 Type: ${choices.type}\n`;
    if (choices.brand) message += `🏷️ Brand: ${choices.brand}\n`;
    message += "\n";
  }
  
  // Provide context-aware guidance
  switch (currentStep) {
    case 'browse_budget':
      message += "🎯 **What we need now**: Your budget range\n\n";
      message += "This helps me show you cars you can actually afford! Just pick one of the options below:";
      break;
    case 'browse_type':
      message += "🎯 **What we need now**: Car type preference\n\n";
      message += "This helps narrow down to your preferred style of car. Choose from the options below:";
      break;
    case 'browse_brand':
      message += "🎯 **What we need now**: Brand preference\n\n";
      message += "This helps me show you cars from brands you trust. Pick your favorite from below:";
      break;
    case 'show_more_cars':
      message += "🎯 **What you can do now**: Browse cars or modify your search\n\n";
      message += "You can browse more cars, change your criteria, or modify specific choices.";
      break;
    default:
      message += "🎯 **Let's find your perfect car!**\n\n";
      message += "I'll guide you through selecting your budget, car type, and brand preferences.";
  }
  
  return message;
}

async function handleBrowseUsedCars(pool, session, userMessage, phone) {
  // Input validation
  if (!userMessage || typeof userMessage !== 'string') {
    userMessage = '';
  }
  userMessage = userMessage.toString().trim();
  
  // Handle empty messages
  if (!userMessage) {
    return {
      message: "I didn't receive your message. Could you please try again?",
      options: ["🚗 Browse Cars", "💰 Get Car Valuation", "📞 Contact Us"]
    };
  }
  
  // Handle menu option selection - treat as start browsing
  if (userMessage === "🚗 Browse Used Cars" || userMessage === "🚗 Browse Cars") {
    userMessage = "I want to browse cars";
  }
  
  const step = session.step || 'browse_start';

  // Budget options constant
  const BUDGET_OPTIONS = [
    "Under ₹5 Lakhs",
    "₹5-10 Lakhs",
    "₹10-15 Lakhs",
    "₹15-20 Lakhs",
    "Above ₹20 Lakhs"
  ];

  // Check for budget change requests at any point (except during test drive form filling)
  if (isBudgetChangeRequest(userMessage) && !step.startsWith('td_') && step !== 'human_assistance') {
    
    // Validate if it's a valid budget option
    const budgetValidation = validateBudget(userMessage);
    if (budgetValidation.isValid) {
      const newBudget = budgetValidation.matchedOption;
      const currentBudget = session.budget;
      
      if (currentBudget && currentBudget !== newBudget) {
        // Budget change confirmation
        session.pendingBudgetChange = newBudget;
        return {
          message: `I see you want to change your budget from ${currentBudget} to ${newBudget}. This will update your car search results.\n\nDo you want to proceed with this budget change?`,
          options: ["Yes, change budget", "No, keep current budget", "Show me options"]
        };
      } else if (!currentBudget) {
        // First budget selection
        session.budget = newBudget;
        session.userChoices = session.userChoices || {};
        session.userChoices.budget = newBudget;
        
        // Check if type and brand were already provided by AI parsing
        if (session.type && session.brand) {
          session.step = 'show_cars';
          
          const cars = await getCarsByFilter(pool, session.budget, session.type, session.brand);
          session.filteredCars = cars;
          session.carIndex = 0;
          
          if (cars.length === 0) {
            return {
              message: `Sorry, no cars found matching your criteria (${session.type}, ${session.brand}) in ${newBudget}. Let's try different options.`,
              options: ["Change criteria"]
            };
          }
          
          const carDisplay = await getCarDisplayChunk(session, pool);
          return carDisplay || { message: "No cars to display at the moment.", options: ["Change criteria"] };
        } else if (session.type) {
          if (session.brand && session.brand !== 'all') {
            session.step = 'show_cars';
            
            const cars = await getCarsByFilter(pool, session.budget, session.type, session.brand);
            session.filteredCars = cars;
            session.carIndex = 0;
            
            if (cars.length === 0) {
              return {
                message: `Sorry, no cars found matching your criteria (${session.type}, ${session.brand}) in ${session.budget}. Let's try different options.`,
                options: ["Change criteria"]
              };
            }
            
            const carDisplay = await getCarDisplayChunk(session, pool);
          return carDisplay || { message: "No cars to display at the moment.", options: ["Change criteria"] };
          } else {
            session.step = 'browse_brand';
            
            const brands = await getAvailableBrands(pool, session.budget, session.type);
            return {
              message: `Perfect! ${newBudget} gives you excellent options. Which brand do you prefer?`,
              options: ['all Brand', ...brands]
            };
          }
        } else {
          session.step = 'browse_type';
          
          const types = await getAvailableTypes(pool, session.budget);
          return {
            message: `Perfect! ${newBudget} gives you excellent options. What type of car do you prefer?`,
            options: ['all Type', ...types]
          };
        }
      }
    } else {
      // Invalid budget - show options
      return {
        message: `I didn't recognize that budget range. Here are the available options:`,
        options: BUDGET_OPTIONS
      };
    }
  }

  // Handle budget change confirmation
  if (userMessage === "Yes, change budget" && session.pendingBudgetChange) {
    const newBudget = session.pendingBudgetChange;
    const oldBudget = session.budget;
    
    session.budget = newBudget;
    session.userChoices = session.userChoices || {};
    session.userChoices.budget = newBudget;
    delete session.pendingBudgetChange;
    
    // Update car search with new budget
    if (session.type && session.brand) {
      session.step = 'show_more_cars';
      const cars = await getCarsByFilter(pool, session.budget, session.type, session.brand);
      session.filteredCars = cars;
      session.carIndex = 0;
      
      if (cars.length === 0) {
        return {
          message: `Budget updated to ${newBudget}! However, no cars found matching your criteria (${session.type}, ${session.brand}). Let's try different options.`,
          options: ["Change criteria", "Change My Choices"]
        };
      }
      
      return await getCarDisplayChunk(session, pool);
    } else {
      // Continue with the flow from current step
      session.step = 'browse_type';
      const types = await getAvailableTypes(pool, session.budget);
      return {
        message: `Budget updated to ${newBudget}! What type of car do you prefer?`,
        options: ['all Type', ...types]
      };
    }
  }
  
  if (userMessage === "No, keep current budget" && session.pendingBudgetChange) {
    delete session.pendingBudgetChange;
    return {
      message: `No problem! Keeping your current budget: ${session.budget}. Let's continue.`,
      options: ["Continue browsing", "Change My Choices"]
    };
  }
  
  if (userMessage === "Show me options" && session.pendingBudgetChange) {
    return {
      message: `Here are the available budget options:`,
      options: BUDGET_OPTIONS
    };
  }


  // Handle "Start over" from any step
  if (userMessage === '🔄 Start over' || userMessage.toLowerCase() === 'start over') {
    Object.keys(session).forEach(key => {
      if (key !== 'step') delete session[key];
    });
    session.step = 'browse_start';
    return {
      message: "🔄 Starting fresh! What would you like to do?",
      options: ["Browse Used Cars", "Get Car Valuation", "Contact Us", "About Us"]
    };
  }

  switch (step) {
    case 'browse_start':
      // Check for unrelated topics first
      const topicCheck = await checkUnrelatedTopic(userMessage, 'browse_used_cars');
      if (topicCheck.isUnrelated && topicCheck.confidence > 0.7) {
        return {
          message: topicCheck.redirectMessage,
          options: ["🚗 Browse Used Cars", "💰 Get Car Valuation", "📞 Contact Our Team", "ℹ️ About Us"]
        };
      }

      // Skip AI processing for predefined menu options
      const predefinedOptions = [
        '🚗 Browse Used Cars', '💰 Get Car Valuation', '📞 Contact Our Team', 'ℹ️ About Us',
        'Under ₹5 Lakhs', '₹5-10 Lakhs', '₹10-15 Lakhs', '₹15-20 Lakhs', 'Above ₹20 Lakhs',
        'Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury', 'Show me all types',
        'Maruti Suzuki', 'Hyundai', 'Tata', 'Mahindra', 'Kia', 'All brand'
      ];
      
      if (predefinedOptions.includes(userMessage)) {
        return {
          message: "Great! Let's find your perfect car. First, what's your budget range?",
          options: BUDGET_OPTIONS
        };
      }

      // Auto-apply AI suggestions for browse_start
      try {
        const ai = await parseUserIntent(pool, userMessage);
        const threshold = parseFloat(process.env.AI_PROPOSAL_CONFIDENCE || '0.75');
        if (ai && ai.confidence >= threshold && (ai.intent === 'browse' || ai.intent === 'browse_used_cars' || !ai.intent)) {
          const e = ai.entities || {};
          // Auto-apply if at least one of budget/type/brand is present and valid
          if (e.brand || e.type || e.budget) {
            // Apply extracted entities directly
            if (e.budget) session.budget = e.budget;
            if (e.type) session.type = e.type === 'all Type' ? 'all' : e.type;
            if (e.brand) session.brand = e.brand === 'all Brand' ? 'all' : e.brand;
            
            // Enhanced skip logic - ask for missing requirements in order
            if (!session.budget) {
              session.step = 'browse_budget';
              return {
                message: "Great! I found some preferences. What's your budget range?",
                options: BUDGET_OPTIONS
              };
            } else if (!session.type) {
              session.step = 'browse_type';
              const types = await getAvailableTypes(pool, session.budget);
              return {
                message: `Perfect! ${session.budget} gives you excellent options. What type of car do you prefer?`,
                options: ['all Type', ...types]
              };
            } else if (!session.brand) {
              session.step = 'browse_brand';
              const brands = await getAvailableBrands(pool, session.budget, session.type);
              return {
                message: `Excellent! What brand do you prefer?`,
                options: ['all Brand', ...brands]
              };
            } else {
              // All requirements present, show cars
              session.step = 'show_more_cars';
              const cars = await getCarsByFilter(pool, session.budget, session.type, session.brand);
              session.filteredCars = cars;
              session.carIndex = 0;
              
              if (cars.length === 0) {
                return {
                  message: `Sorry, no cars found matching your criteria (${session.type}, ${session.brand}) in ${session.budget}. Let's try different options.`,
                  options: ["Change criteria"]
                };
              }
              
              const carDisplay = await getCarDisplayChunk(session, pool);
          return carDisplay || { message: "No cars to display at the moment.", options: ["Change criteria"] };
            }
          }
        }
      } catch (e) { /* AI auto-apply skipped */ }

      // Always start with budget selection for new browse conversations
      session.step = 'browse_budget';
      return {
        message: "Great choice! Let's find your perfect car. First, what's your budget range?",
        options: BUDGET_OPTIONS
      };

    case 'browse_budget':
      // Check for unrelated topics first
      const budgetTopicCheck = await checkUnrelatedTopic(userMessage, 'browse_used_cars');
      if (budgetTopicCheck.isUnrelated && budgetTopicCheck.confidence > 0.7) {
        return {
          message: "I'm here to help with cars! What's your budget range?",
          options: BUDGET_OPTIONS
        };
      }

      // AI parsing for budget, type, and brand extraction (try first)
      try {
        const ai = await parseUserIntent(pool, userMessage);
        if (ai && ai.confidence > 0.6 && (ai.intent === 'browse' || ai.intent === 'browse_used_cars')) {
          const e = ai.entities || {};
          
          // Extract budget from AI
          if (e.budget) {
            session.budget = e.budget;
          }
          
          // Extract type and brand if provided
          if (e.type) {
            session.type = e.type;
          }
          
          if (e.brand) {
            session.brand = e.brand;
          }
          
          // If AI extracted budget, skip validation and proceed with enhanced logic
          if (session.budget) {
            session.userChoices = session.userChoices || {};
            session.userChoices.budget = session.budget;
            
            // Enhanced skip logic - ask for missing requirements in order
            if (!session.type) {
              session.step = 'browse_type';
              const types = await getAvailableTypes(pool, session.budget);
              return {
                message: `Perfect! ${session.budget} gives you excellent options. What type of car do you prefer?`,
                options: ['all Type', ...types]
              };
            } else if (!session.brand) {
              session.step = 'browse_brand';
              const brands = await getAvailableBrands(pool, session.budget, session.type);
              return {
                message: `Excellent! Which brand do you prefer?`,
                options: ['all Brand', ...brands]
              };
            } else {
              // All requirements present, show cars
              session.step = 'show_cars';
              const cars = await getCarsByFilter(pool, session.budget, session.type, session.brand);
              session.filteredCars = cars;
              session.carIndex = 0;
              
              if (cars.length === 0) {
                return {
                  message: `Sorry, no cars found matching your criteria (${session.type}, ${session.brand}) in ${session.budget}. Let's try different options.`,
                  options: ["Change criteria"]
                };
              }
              
              const carDisplay = await getCarDisplayChunk(session, pool);
          return carDisplay || { message: "No cars to display at the moment.", options: ["Change criteria"] };
            }
          }
        }
      } catch (error) {
        // AI parsing failed, continue with manual validation
      }
      
      // Check if user needs human assistance (only if AI parsing didn't work)
      if (needsHumanAssistance(userMessage, step)) {
        const assistanceMessage = getHumanAssistanceMessage(step, session.userChoices);
        return {
          message: "What's your budget range?",
          options: BUDGET_OPTIONS
        };
      }
      
      
      // First check if user typed something instead of selecting from options
      const optionCheck = await validateOptionInput(userMessage, BUDGET_OPTIONS, { step: 'browse_budget' });
      
      if (optionCheck.matchesOption && optionCheck.confidence > 0.7) {
        // User typed something that matches an option, use the matched option
        userMessage = optionCheck.matchedOption;
      } else if (!BUDGET_OPTIONS.includes(userMessage)) {
        // User typed something that doesn't match any option, check if it's budget-related
        const budgetValidation = validateBudget(userMessage);
        if (!budgetValidation.isValid) {
          return {
            message: "I didn't understand that. Please select your budget range:",
            options: BUDGET_OPTIONS
          };
        } else {
          // It's a valid budget, use it
          userMessage = budgetValidation.matchedOption;
        }
      }
      
      // Now validate the final budget selection
      const finalBudgetValidation = validateBudget(userMessage);
      if (!finalBudgetValidation.isValid) {
        return {
          message: "I didn't understand that. Please select your budget range:",
          options: BUDGET_OPTIONS
        };
      }
      
      session.budget = finalBudgetValidation.matchedOption;
      session.userChoices = session.userChoices || {};
      session.userChoices.budget = finalBudgetValidation.matchedOption;
      
      // Check if type and brand were already provided by AI parsing
      if (session.type && session.brand) {
        session.step = 'show_cars';
        
        const cars = await getCarsByFilter(pool, session.budget, session.type, session.brand);
        session.filteredCars = cars;
        session.carIndex = 0;
        
        if (cars.length === 0) {
          return {
            message: `Sorry, no cars found matching your criteria (${session.type}, ${session.brand}) in ${budgetValidation.matchedOption}. Let's try different options.`,
            options: ["Change criteria"]
          };
        }
        
        const carDisplay = await getCarDisplayChunk(session, pool);
        return carDisplay || { message: "No cars to display at the moment.", options: ["Change criteria"] };
      } else if (session.type) {
        if (session.brand && session.brand !== 'all') {
          session.step = 'show_cars';
          
          const cars = await getCarsByFilter(pool, session.budget, session.type, session.brand);
          session.filteredCars = cars;
          session.carIndex = 0;
          
          if (cars.length === 0) {
            return {
              message: `Sorry, no cars found matching your criteria (${session.type}, ${session.brand}) in ${session.budget}. Let's try different options.`,
              options: ["Change criteria"]
            };
          }
          
          const carDisplay = await getCarDisplayChunk(session, pool);
          return carDisplay || { message: "No cars to display at the moment.", options: ["Change criteria"] };
        } else {
          session.step = 'browse_brand';
          
          const brands = await getAvailableBrands(pool, session.budget, session.type);
          return {
            message: `Perfect! ${budgetValidation.matchedOption} gives you excellent options. Which brand do you prefer?`,
            options: ['all Brand', ...brands]
          };
        }
      } else {
        session.step = 'browse_type';
        
        const types = await getAvailableTypes(pool, session.budget);
        return {
          message: `Perfect! ${budgetValidation.matchedOption} gives you excellent options. What type of car do you prefer?`,
          options: ['all Type', ...types]
        };
      }

    case 'browse_type':
      // Check for unrelated topics first
      const typeTopicCheck = await checkUnrelatedTopic(userMessage, 'browse_used_cars');
      if (typeTopicCheck.isUnrelated && typeTopicCheck.confidence > 0.7) {
        const types = await getAvailableTypes(pool, session.budget);
        return {
          message: "I'm here to help with cars! What type of car do you prefer?",
          options: ['all Type', ...types]
        };
      }

      // Get available types for validation
      const availableTypes = await getAvailableTypes(pool, session.budget);
      const TYPE_OPTIONS = ['all Type', ...availableTypes];
      
      // Check if user typed something instead of selecting from options
      const typeOptionCheck = await validateOptionInput(userMessage, TYPE_OPTIONS, { step: 'browse_type' });
      
      if (typeOptionCheck.matchesOption && typeOptionCheck.confidence > 0.7) {
        // User typed something that matches an option, use the matched option
        userMessage = typeOptionCheck.matchedOption;
      } else if (!TYPE_OPTIONS.includes(userMessage)) {
        // User typed something that doesn't match any option, check if it's type-related
        const preliminaryTypeValidation = validateCarType(userMessage);
        if (!preliminaryTypeValidation.isValid) {
          return {
            message: "I didn't understand that. Please select a car type:",
            options: TYPE_OPTIONS
          };
        } else {
          // It's a valid type, use it
          userMessage = preliminaryTypeValidation.matchedOption;
        }
      }
      
      const typeValidation = validateCarType(userMessage);
      if (!typeValidation.isValid) {
        // Handle special keywords
        if (typeValidation.reason === 'special_keyword') {
          if (userMessage.toLowerCase() === 'start over') {
            session.step = 'browse_start';
            return {
              message: "Is there anything else I can help you with today?",
              options: ["Browse Used Cars", "Get Car Valuation", "Contact Us", "About Us"]
            };
          }
          if (userMessage.toLowerCase() === 'back') {
            session.step = 'browse_budget';
            return {
              message: "Let's go back to budget selection:",
              options: BUDGET_OPTIONS
            };
          }
          if (userMessage.toLowerCase() === 'help') {
            const types = await getAvailableTypes(pool, session.budget);
            return {
              message: "🤖 I can help you find the perfect car! Please select a car type from the options below:",
              options: ['all Type', ...types],
              additionalOptions: ["🔄 Start over", "📞 Talk to human"]
            };
          }
        }
        
        const types = await getAvailableTypes(pool, session.budget);
        const TYPE_OPTIONS = ['all Type', ...types];
        
        return {
          message: createValidationErrorMessage("car type", typeValidation.suggestions, TYPE_OPTIONS),
          options: TYPE_OPTIONS
        };
      }
      
      session.type = typeValidation.matchedOption === 'all Type' ? 'all' : typeValidation.matchedOption;
      session.userChoices = session.userChoices || {};
      session.userChoices.type = typeValidation.matchedOption;
      
      // Check if brand was already provided by AI parsing
      if (session.brand && session.brand !== 'all') {
        session.step = 'show_cars';
        
        const cars = await getCarsByFilter(pool, session.budget, session.type, session.brand);
        session.filteredCars = cars;
        session.carIndex = 0;
        
        if (cars.length === 0) {
          return {
            message: `Sorry, no cars found matching your criteria (${session.type}, ${session.brand}) in ${session.budget}. Let's try different options.`,
            options: ["Change criteria"]
          };
        }
        
        const carDisplay = await getCarDisplayChunk(session, pool);
        return carDisplay || { message: "No cars to display at the moment.", options: ["Change criteria"] };
      } else {
        session.step = 'browse_brand';
        
        const brands = await getAvailableBrands(pool, session.budget, session.type);
        return {
          message: "Excellent choice! Which brand do you prefer?",
          options: ['all Brand', ...brands]
        };
      }

    case 'browse_brand':
      
      // Check for unrelated topics first
      const brandUnrelatedCheck = await checkUnrelatedTopic(userMessage, 'browse_used_cars');
      if (brandUnrelatedCheck.isUnrelated && brandUnrelatedCheck.confidence > 0.7) {
        return {
          message: brandUnrelatedCheck.redirectMessage,
          options: ["🚗 Browse Used Cars", "💰 Get Car Valuation", "📞 Contact Our Team", "ℹ️ About Us"]
        };
      }
      
      // Check if user needs human assistance
      if (needsHumanAssistance(userMessage, step)) {
        const availableBrands = await getAvailableBrands(pool, session.budget, session.type);
        const assistanceMessage = getHumanAssistanceMessage(step, session.userChoices);
        return {
          message: "Which brand do you prefer?",
          options: ['all Brand', ...availableBrands]
        };
      }
      
      
      // Get available brands for validation
      const availableBrands = await getAvailableBrands(pool, session.budget, session.type);
      const brandValidation = validateBrand(userMessage, availableBrands);
      
      if (!brandValidation.isValid) {
        const BRAND_OPTIONS = ['all Brand', ...availableBrands];
        
        return {
          message: createValidationErrorMessage("brand", brandValidation.suggestions, BRAND_OPTIONS),
          options: BRAND_OPTIONS
        };
      }
      
      session.brand = brandValidation.matchedOption === 'all Brand' ? 'all' : brandValidation.matchedOption;
      session.userChoices = session.userChoices || {};
      session.userChoices.brand = brandValidation.matchedOption;
      session.step = 'show_cars';
      
      const cars = await getCarsByFilter(pool, session.budget, session.type, session.brand);
      session.filteredCars = cars;
      session.carIndex = 0;
      
      if (cars.length === 0) {
        return {
          message: `Sorry, no cars found matching your criteria. Let's try different options.`,
          options: ["Change criteria"]
        };
      }
      
      return await getCarDisplayChunk(session, pool);

    case 'show_more_cars':
      
      // Handle SELECT button responses with unique id first (format: book_Brand_Model_Variant)
      if (userMessage.startsWith("book_")) {
        const carId = userMessage;
        const cars = session.filteredCars || [];
        
        // Find the car by ID
        const selectedCar = cars.find(car => {
          const carIdFromCar = `book_${car.brand}_${car.model}_${car.variant}`.replace(/\s+/g, '_');
          return carIdFromCar === carId;
        });
        
        if (selectedCar) {
          session.selectedCar = `${selectedCar.brand} ${selectedCar.model} ${selectedCar.variant}`;
          session.step = 'car_selected_options';
          return {
            message: `Great choice! You've selected ${session.selectedCar}. What would you like to do next?`,
            options: ["Book Test Drive", "Change My Criteria"]
          };
        }
      }

      // Fallback: if platform only returns the generic title "SELECT" and exactly one car is visible,
      // assume the visible car is the intended selection
      if (userMessage === "SELECT") {
        const cars = session.filteredCars || [];
        const startIndex = session.carIndex || 0;
        const endIndex = Math.min(startIndex + 3, cars.length);
        const visible = cars.slice(startIndex, endIndex);
        if (visible.length === 1) {
          const onlyCar = visible[0];
          session.selectedCar = `${onlyCar.brand} ${onlyCar.model} ${onlyCar.variant}`;
          session.step = 'car_selected_options';
          return {
            message: `Great choice! You've selected ${session.selectedCar}. What would you like to do next?`,
            options: ["Book Test Drive", "Change My Criteria"]
          };
        }
      }
      
      // Handle "Browse More Cars" button
      if (userMessage === "Browse More Cars") {
        session.carIndex += 3;
        const cars = session.filteredCars || [];
        
        if (session.carIndex >= cars.length) {
          return {
            message: "No more cars available. Would you like to change your criteria?",
            options: ["Change criteria"]
          };
        }
        
        const carDisplay = await getCarDisplayChunk(session, pool);
        return carDisplay || { message: "No cars to display at the moment.", options: ["Change criteria"] };
      }
      
      // Handle "Change criteria" selection
      if (userMessage === "Change criteria" || userMessage === "Change My Criteria") {
        session.step = 'browse_budget';
        session.carIndex = 0; // Reset car index
        session.filteredCars = []; // Clear filtered cars
        session.selectedCar = null; // Clear selected car
        session.userChoices = {}; // Clear stored choices
        return {
          message: "What's your budget range?",
          options: BUDGET_OPTIONS
        };
      }
      
      // Handle "Change My Choices" - show current choices and allow modification
      if (userMessage === "Change My Choices") {
        session.step = 'modify_choices';
        const choices = session.userChoices || {};
        let message = "Here are your current choices:\n\n";
        if (choices.budget) message += `💰 Budget: ${choices.budget}\n`;
        if (choices.type) message += `🚗 Type: ${choices.type}\n`;
        if (choices.brand) message += `🏷️ Brand: ${choices.brand}\n`;
        message += "\nWhat would you like to change?";
        
        const options = [];
        if (choices.budget) options.push("Change Budget");
        if (choices.type) options.push("Change Type");
        if (choices.brand) options.push("Change Brand");
        options.push("Keep All Choices", "Start Over");
        
        return { message, options };
      }
      
      // Handle human assistance options
      if (userMessage === "🤖 I'm confused - help me") {
        const assistanceMessage = getHumanAssistanceMessage(session.step, session.userChoices);
        let options = [];
        
        // Add context-appropriate options
        switch (session.step) {
          case 'browse_budget':
            options = BUDGET_OPTIONS;
            break;
          case 'browse_type':
            const types = await getAvailableTypes(pool, session.budget);
            options = ['all Type', ...types];
            break;
          case 'browse_brand':
            const brands = await getAvailableBrands(pool, session.budget, session.type);
            options = ['all Brand', ...brands];
            break;
          default:
            options = BUDGET_OPTIONS;
        }
        
        return {
          message: assistanceMessage,
          options: options,
          additionalOptions: ["🔄 Start over", "📞 Talk to human", "ℹ️ What is this?"]
        };
      }
      
      if (userMessage === "🔄 Start over") {
        session.step = 'browse_budget';
        session.carIndex = 0;
        session.filteredCars = [];
        session.selectedCar = null;
        session.userChoices = {};
        return {
          message: "No problem! Let's start fresh. What's your budget range?",
          options: BUDGET_OPTIONS
        };
      }
      
      if (userMessage === "📞 Talk to human") {
        session.step = 'human_assistance';
        return {
          message: "I understand you'd prefer to speak with a human! 🤝\n\nOur sales team is here to help:\n\n📞 Call: +91-9876543210\n💬 WhatsApp: +91-9876543210\n🏢 Visit: Sherpa Hyundai Showroom, 123 MG Road, Bangalore\n\nOr would you like to continue with the bot?",
          options: ["Continue with bot", "End conversation"]
        };
      }
      
      if (userMessage === "ℹ️ What is this?") {
        return {
          message: "I'm your AI car shopping assistant! Ready to continue?",
          options: ["Yes, continue", "🔄 Start over", "📞 Talk to human"]
        };
      }
      
      // If no cars are loaded yet, fetch and display them
      if (!session.filteredCars || session.filteredCars.length === 0) {
        console.log("🔍 No cars loaded, fetching cars for display");
        const cars = await getCarsByFilter(pool, session.budget, session.type, session.brand);
        session.filteredCars = cars;
        session.carIndex = 0;
        
        if (cars.length === 0) {
          return {
            message: "Sorry, no cars found matching your criteria. Let's try different options.",
            options: ["Change criteria"]
          };
        }
        
        const carDisplay = await getCarDisplayChunk(session, pool);
        return carDisplay || { message: "No cars to display at the moment.", options: ["Change criteria"] };
      }
      
      // If it's a car selection (legacy support for "SELECT" button)
      if (userMessage === "SELECT") {
        // Find the currently visible car based on carIndex
        const cars = session.filteredCars || [];
        const startIndex = session.carIndex || 0;
        const endIndex = Math.min(startIndex + 3, cars.length);
        const visibleCars = cars.slice(startIndex, endIndex);
        
        if (visibleCars.length > 0) {
          // Take the first visible car as the selected one
          const selectedCarObj = visibleCars[0];
          session.selectedCar = `${selectedCarObj.brand} ${selectedCarObj.model} ${selectedCarObj.variant}`;
          session.step = 'test_drive_date';
          return {
            message: `Excellent! Let's schedule your ${session.selectedCar} test drive. When would you prefer?`,
            options: ["Today", "Tomorrow", "Later this Week", "Next Week"]
          };
        }
      }
      
      // Fallback for other selections
      session.selectedCar = userMessage;
      session.step = 'test_drive_date';
      return {
        message: `Excellent! Let's schedule your ${userMessage} test drive. When would you prefer?`,
        options: ["Today", "Tomorrow", "Later this Week", "Next Week"]
      };

    case 'show_cars':
      
      // Handle "Change criteria" selection
      if (userMessage === "Change criteria" || userMessage === "Change My Criteria") {
        session.step = 'browse_budget';
        session.carIndex = 0; // Reset car index
        session.filteredCars = []; // Clear filtered cars
        session.selectedCar = null; // Clear selected car
        session.userChoices = {}; // Clear stored choices
        
        return {
          message: "Great choice! Let's find your perfect car. First, what's your budget range?",
          options: BUDGET_OPTIONS
        };
      }
      
      // Default fallback for show_cars
      return {
        message: "Please select an option to continue:",
        options: ["Change criteria"]
      };

    case 'car_selected_options':
      
      if (userMessage === "Book Test Drive" || userMessage === "Book test drive") {
        session.step = 'test_drive_date';
        return {
          message: `Excellent! Let's schedule your ${session.selectedCar} test drive. When would you prefer?`,
          options: ["Today", "Tomorrow", "Later this Week", "Next Week"]
        };
      }
      
      if (userMessage === "Change My Criteria" || userMessage === "Change my search criteria" || userMessage === "Change criteria") {
        session.step = 'change_criteria_confirm';
        return {
          message: "I'll help you update your search criteria. Since our system uses a guided setup process, you'll need to go through the selection steps again from the beginning. Your previous results will be cleared.\n\nWould you like to proceed with setting up new search criteria?",
          options: ["Yes", "No"]
        };
      }

    case 'test_drive_date':
      
      // Try to parse natural language input first
      const parsedDateTime = await parseDateTimeInput(userMessage);
      
      if (parsedDateTime.success && parsedDateTime.confidence > 0.5) {
        
        const sessionFormat = convertToSessionFormat(parsedDateTime);
        
        // Set the parsed values
        if (sessionFormat.sessionDate) {
          session.testDriveDate = sessionFormat.sessionDate;
          session.testDriveActualDate = sessionFormat.sessionActualDate;
          session.testDriveDateFormatted = sessionFormat.sessionDateFormatted;
        }
        
        if (sessionFormat.sessionTime) {
          session.testDriveTime = sessionFormat.sessionTime;
        }
        
        // If both date and time are provided, skip to details collection
        if (sessionFormat.sessionDate && sessionFormat.sessionTime) {
          session.step = 'td_name';
          return {
            message: `Perfect! I've scheduled your test drive for ${sessionFormat.sessionDateFormatted} at ${sessionFormat.sessionTime}. I need some details to confirm your booking:\n\n1. Your Name:`
          };
        }
        
        // If only date is provided, ask for time
        if (sessionFormat.sessionDate && !sessionFormat.sessionTime) {
          session.step = 'test_drive_time';
          return {
            message: `Great! I've scheduled your test drive for ${sessionFormat.sessionDateFormatted}. What time works best for you?`,
            options: getTimeSlots()
          };
        }
        
        // If only time is provided, ask for date
        if (!sessionFormat.sessionDate && sessionFormat.sessionTime) {
          session.testDriveTime = sessionFormat.sessionTime;
          session.step = 'test_drive_date';
          return {
            message: "When would you like to schedule the test drive?",
            options: ["Today", "Tomorrow", "Later this Week", "Next Week"]
          };
        }
      }
      
      // Fallback to original logic if AI parsing fails
      session.testDriveDate = userMessage;
      
      // Check for day variations (case-insensitive)
      const lowerMsg = userMessage.toLowerCase();
      let dayMatch = null;
      
      if (lowerMsg.includes("today")) {
        dayMatch = "Today";
      } else if (lowerMsg.includes("tomorrow") || lowerMsg.includes("tommorow")) {
        dayMatch = "Tomorrow";
      }
      
      if (dayMatch) {
        // Store the actual date for these options
        const actualDate = getActualDateFromSelection(dayMatch);
        if (actualDate) {
          session.testDriveActualDate = actualDate;
          session.testDriveDateFormatted = actualDate.toLocaleDateString('en-IN', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        }
        
        session.step = 'test_drive_time';
        return {
          message: "Perfect! Which time works better for you?",
          options: getTimeSlots()
        };
      } else {
        session.step = 'test_drive_day';
        return {
          message: "Which day works best for you?",
          options: getNextAvailableDays(userMessage)
        };
      }

    case 'test_drive_day':
      session.testDriveDay = userMessage;
      
      // Get the actual date from the day selection
      const actualDateFromDay = getActualDateFromDaySelection(userMessage, session.testDriveDate);
      if (actualDateFromDay) {
        session.testDriveActualDate = actualDateFromDay;
        session.testDriveDateFormatted = actualDateFromDay.toLocaleDateString('en-IN', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }
      
      session.step = 'test_drive_time';
      return {
        message: "Perfect! What time works best?",
        options: getTimeSlots()
      };

    case 'test_drive_time':
      
      // Try to parse natural language time input
      const parsedTime = await parseDateTimeInput(userMessage);
      
      if (parsedTime.success && parsedTime.confidence > 0.6 && parsedTime.time) {
        
        const sessionFormat = convertToSessionFormat(parsedTime);
        session.testDriveTime = sessionFormat.sessionTime;
      } else {
        // Fallback to original logic
        session.testDriveTime = userMessage;
      }
      
      // Check if user already has details stored
      if (session.td_name && session.td_phone) {
        session.step = 'td_license';
        return {
          message: "Do you have a valid driving license?",
          options: ["Yes", "No"]
        };
      }
      
      session.step = 'td_name';
      return { message: "Great! I need some details to confirm your booking:\n\n1. Your Name:" };

    case 'td_name':
      
      // Simple validation - accept any non-empty text as a name
      if (!userMessage || userMessage.trim().length < 2) {
        return {
          message: "Please provide your full name",
          options: []
        };
      }
      
      session.td_name = userMessage.trim();
      session.step = 'td_phone';
      return { message: "2. Your Phone Number (10 digits only):" };

    case 'td_phone':
      
      // Check for unrelated topics first
      const phoneUnrelatedCheck = await checkUnrelatedTopic(userMessage, 'browse_used_cars');
      if (phoneUnrelatedCheck.isUnrelated && phoneUnrelatedCheck.confidence > 0.7) {
        return {
          message: phoneUnrelatedCheck.redirectMessage,
          options: ["🚗 Browse Used Cars", "💰 Get Car Valuation", "📞 Contact Our Team", "ℹ️ About Us"]
        };
      }
      
      // Simple phone validation - accept 10-digit numbers
      const cleanPhone = userMessage.replace(/\D/g, ''); // Remove non-digits
      if (cleanPhone.length !== 10) {
        return {
          message: "Please provide a valid 10-digit phone number",
          options: []
        };
      }
      
      session.td_phone = cleanPhone;
      session.step = 'td_license';
      return {
        message: "3. Do you have a valid driving license?",
        options: ["Yes", "No"]
      };

    case 'td_license':
      
      // Check for unrelated topics first
      const licenseUnrelatedCheck = await checkUnrelatedTopic(userMessage, 'browse_used_cars');
      if (licenseUnrelatedCheck.isUnrelated && licenseUnrelatedCheck.confidence > 0.7) {
        return {
          message: licenseUnrelatedCheck.redirectMessage,
          options: ["🚗 Browse Used Cars", "💰 Get Car Valuation", "📞 Contact Our Team", "ℹ️ About Us"]
        };
      }
      
      // Check if user typed something instead of selecting Yes/No
      const licenseOptions = ["Yes", "No"];
      const licenseOptionCheck = await validateOptionInput(userMessage, licenseOptions, { step: 'td_license' });
      
      if (licenseOptionCheck.matchesOption && licenseOptionCheck.confidence > 0.7) {
        userMessage = licenseOptionCheck.matchedOption;
      } else if (!licenseOptions.includes(userMessage)) {
        // Validate if it's a yes/no type response using LLM
        const licenseStepValidation = await validateStepInput(userMessage, 'yes_no', { step: 'td_license' });
        
        if (!licenseStepValidation.isValid || licenseStepValidation.confidence < 0.7) {
          return {
            message: "Please select an option:",
            options: ["Yes", "No"]
          };
        }
      }
      
      session.td_license = userMessage;
      session.step = 'td_location_mode';
      return {
        message: `Thank you ${session.td_name}! Your details are noted. Where would you like to take the test drive?`,
        options: ["Showroom pickup", "Home pickup"]
      };

    case 'td_location_mode':
      
      // Check if user typed something instead of selecting from options
      const locationOptions = ["Showroom pickup", "Home pickup"];
      const locationOptionCheck = await validateOptionInput(userMessage, locationOptions, { step: 'td_location_mode' });
      
      if (locationOptionCheck.matchesOption && locationOptionCheck.confidence > 0.7) {
        userMessage = locationOptionCheck.matchedOption;
      } else if (!locationOptions.includes(userMessage)) {
        return {
          message: "I didn't understand that. Please select a pickup option:",
          options: locationOptions
        };
      }
      
      session.td_location_mode = userMessage;
      if (userMessage.includes("Home pickup")) {
        session.step = 'td_home_address';
        return { message: "Please share your current address for the test drive:" };
      } else {
        session.step = 'test_drive_confirmation';
        return getTestDriveConfirmation(session);
      }

    case 'td_home_address':
      
      // Validate that user provided an address using LLM
      const addressStepValidation = await validateStepInput(userMessage, 'address', { step: 'td_home_address' });
      
      if (!addressStepValidation.isValid || addressStepValidation.confidence < 0.7) {
        return {
          message: "Please provide your address",
          options: []
        };
      }
      
      session.td_home_address = userMessage;
      session.step = 'test_drive_confirmation';
      return getTestDriveConfirmation(session);

    case 'td_drop_location':
      session.td_drop_location = userMessage;
      session.step = 'test_drive_confirmation';
      return getTestDriveConfirmation(session);

    case 'test_drive_confirmation':
      
      if (userMessage === "Confirm") {
        // Save test drive details to database
        try {
          // Use the actual date if available, otherwise use current date
          let testDriveDateTime = new Date();
          if (session.testDriveActualDate) {
            testDriveDateTime = session.testDriveActualDate;
            // Set the time based on user selection
            if (session.testDriveTime) {
              if (session.testDriveTime.includes("Morning")) {
                testDriveDateTime.setHours(10, 0, 0, 0);
              } else if (session.testDriveTime.includes("Afternoon")) {
                testDriveDateTime.setHours(13, 0, 0, 0);
              } else if (session.testDriveTime.includes("Evening")) {
                testDriveDateTime.setHours(16, 0, 0, 0);
              }
            }
          }
          
          // Saving test drive with calculated date
          
          await pool.query(`
            INSERT INTO test_drives 
            (user_id, car, datetime, name, phone, has_dl, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
          `, [
            session.userId || 'unknown', // You might need to pass userId in session
            session.selectedCar || 'Not selected',
            testDriveDateTime,
            session.td_name || 'Not provided',
            session.td_phone || 'Not provided',
            session.td_license ? true : false // Convert license info to boolean
          ]);
          // Test drive details saved successfully
        } catch (error) {
          console.error("Error saving test drive details:", error);
        }
        
        session.step = 'booking_complete';
        return {
          message: `Perfect! Here's what happens next:\n\n📋 TEST DRIVE CONFIRMED:\n👤 Name: ${session.td_name || 'Not provided'}\n📱 Phone: ${session.td_phone || 'Not provided'}\n🚗 Car: ${session.selectedCar || 'Not selected'}\n📅 Date: ${session.testDriveDateFormatted || session.testDriveDate || 'Not selected'}\n⏰ Time: ${session.testDriveTime || 'Not selected'}\n\nNext Steps:\n1. Our executive will call you within 2 hours\n2. We'll schedule a physical inspection\n3. Final price quote after inspection\n4. Instant payment if you accept our offer\n\n📞 Questions? Call: +91-9876543210\nThank you for choosing Sherpa Hyundai! 🙏`,
          options: ["Explore More", "End Conversation"]
        };
      }
      
      if (userMessage === "Reject") {
        session.step = 'browse_start';
        session.carIndex = 0;
        session.filteredCars = [];
        session.selectedCar = null;
        return {
          message: "Great choice! Let's find your perfect car. First, what's your budget range?",
          options: BUDGET_OPTIONS
        };
      }
      
      // If user sends all other message, show confirmation again
      return getTestDriveConfirmation(session);

    case 'booking_complete':
      
      // Handle "End Conversation" first
      if (userMessage === "End Conversation") {
        // Save user profile before clearing session data
        try {
          const userPreferences = extractUserPreferences(session);
          if (userPreferences.phone) {
            const profileResult = await saveUserProfile(userPreferences);
            if (profileResult.success) {
              console.log(`✅ User profile ${profileResult.action} before browse session end`);
            }
          }
        } catch (error) {
          // Could not save user profile
        }

        // Clear session data and mark conversation as ended
        Object.keys(session).forEach(key => {
          delete session[key];
        });
        session.conversationEnded = true;
        return null; // Return null to indicate no message should be sent
      }
      
      // Check for unrelated topics
      const bookingUnrelatedCheck = await checkUnrelatedTopic(userMessage, 'browse_used_cars');
      if (bookingUnrelatedCheck.isUnrelated && bookingUnrelatedCheck.confidence > 0.7) {
        return {
          message: bookingUnrelatedCheck.redirectMessage,
          options: ["🚗 Browse Used Cars", "💰 Get Car Valuation", "📞 Contact Our Team", "ℹ️ About Us"]
        };
      }
      
      if (userMessage === "Explore More") {
        // Save user profile before clearing session data
        try {
          const userPreferences = extractUserPreferences(session);
          if (userPreferences.phone) {
            const profileResult = await saveUserProfile(userPreferences);
            // User profile saved successfully
          }
        } catch (error) {
          // Could not save user profile
        }

        // Clear stored details and reset session for fresh start
        session.step = 'main_menu';
        session.carIndex = 0;
        session.filteredCars = [];
        session.selectedCar = null;
        session.budget = null;
        session.type = null;
        session.brand = null;
        
        // Return to main menu with welcome back message
        const { getMainMenu } = require('./conversationFlow');
        return getMainMenu(session);
      }
      
      return {
        message: "Please select an option:",
        options: ["Explore More", "End Conversation"]
      };

    case 'human_assistance':
      
      if (userMessage === "Continue with bot") {
        session.step = 'browse_budget';
        return {
          message: "Great choice! Let's find your perfect car. First, what's your budget range?",
          options: BUDGET_OPTIONS
        };
      }
      
      if (userMessage === "End conversation") {
        session.conversationEnded = true;
        return {
          message: "Thank you for considering Sherpa Hyundai! Feel free to reach out anytime:\n📞 +91-9876543210\n🏢 Sherpa Hyundai Showroom, 123 MG Road, Bangalore",
          options: []
        };
      }
      
      // Default response for human assistance
      return {
        message: "Our sales team is here to help:\n\n📞 Call: +91-9876543210\n💬 WhatsApp: +91-9876543210\n🏢 Visit: Sherpa Hyundai Showroom, 123 MG Road, Bangalore\n\nOr would you like to continue with the bot?",
        options: ["Continue with bot", "End conversation"]
      };

    case 'modify_choices':
      
      if (userMessage === "Change Budget") {
        session.step = 'browse_budget';
        return {
          message: "Great choice! Let's find your perfect car. First, what's your budget range?",
          options: BUDGET_OPTIONS
        };
      }
      
      if (userMessage === "Change Type") {
        session.step = 'browse_type';
        const types = await getAvailableTypes(pool, session.budget);
        return {
          message: "What type of car do you prefer?",
          options: ['all Type', ...types]
        };
      }
      
      if (userMessage === "Change Brand") {
        session.step = 'browse_brand';
        const brands = await getAvailableBrands(pool, session.budget, session.type);
        return {
          message: "Which brand do you prefer?",
          options: ['all Brand', ...brands]
        };
      }
      
      if (userMessage === "Keep All Choices") {
        // Go back to showing cars with current choices
        session.step = 'show_more_cars';
        const cars = await getCarsByFilter(pool, session.budget, session.type, session.brand);
        session.filteredCars = cars;
        session.carIndex = 0;
        if (cars.length === 0) {
          return { message: "No cars found. Let's try different options.", options: ["Change criteria"] };
        }
        const carDisplay = await getCarDisplayChunk(session, pool);
        return carDisplay || { message: "No cars to display at the moment.", options: ["Change criteria"] };
      }
      
      if (userMessage === "Start Over") {
        session.step = 'browse_budget';
        session.carIndex = 0;
        session.filteredCars = [];
        session.selectedCar = null;
        session.userChoices = {};
        return {
          message: "Great choice! Let's find your perfect car. First, what's your budget range?",
          options: BUDGET_OPTIONS
        };
      }
      
      // Default fallback
      return {
        message: "Please select an option to continue:",
        options: ["Change Budget", "Change Type", "Change Brand", "Keep All Choices", "Start Over"]
      };


    case 'change_criteria_confirm':
      if (userMessage.toLowerCase().includes("yes") || userMessage.toLowerCase().includes("proceed")) {
        session.step = 'browse_start';
        return {
          message: "Sure, Please choose the below option to start..",
          options: ["🚗 Browse Used Cars", "💰 Get Car Valuation", "📞 Contact Our Team", "ℹ️ About Us"]
        };
      } else {
        return { message: "Keeping your current selection intact." };
      }

    default:
      // Check for unrelated topics in unknown states
      const defaultUnrelatedCheck = await checkUnrelatedTopic(userMessage, 'browse_used_cars');
      if (defaultUnrelatedCheck.isUnrelated && defaultUnrelatedCheck.confidence > 0.7) {
        return {
          message: defaultUnrelatedCheck.redirectMessage,
          options: ["🚗 Browse Used Cars", "💰 Get Car Valuation", "📞 Contact Our Team", "ℹ️ About Us"]
        };
      }
      
      return { message: "Something went wrong. Let's start again.", options: ["Start Again"] };
  }
}

async function getCarDisplayChunk(session, pool) {
  const cars = session.filteredCars || [];
  
  if (cars.length === 0) {
    return { message: "No more cars to display.", options: ["Change criteria"] };
  }

  // Show up to 3 cars at a time
  const startIndex = session.carIndex;
  const endIndex = Math.min(startIndex + 3, cars.length);
  const carsToShow = cars.slice(startIndex, endIndex);

  console.log(`📊 Processing ${carsToShow.length} cars (${startIndex + 1}-${endIndex} of ${cars.length})`);

  const messages = [];
  
  for (let i = 0; i < carsToShow.length; i++) {
    const car = carsToShow[i];
    
    // Get car images by registration number for the new naming convention
    let imagesByRegistration = [];
    try {
      imagesByRegistration = await getCarImagesByRegistration(pool, car.registration_number);
      console.log(`📸 Retrieved ${imagesByRegistration.length} images by registration for ${car.registration_number}`);
    } catch (error) {
      console.error(`❌ Error fetching images by registration for ${car.registration_number}:`, error);
    }
    
    // Use images by registration if available
    const finalCarImages = imagesByRegistration;

    
    const caption =
      `🚗 ${car.brand} ${car.model} ${car.variant}\n` +
      `📅 Year: ${car.year}\n` +
      `⛽ Fuel: ${car.fuel_type}\n` +
      `💰 Price: ${formatRupees(car.price)}`;
    
    if (finalCarImages && finalCarImages.length > 0) {
      // Validate that we have valid image data
      const validImages = finalCarImages.filter(img => img && img.path && typeof img.path === 'string');
      
      if (validImages.length === 0) {
        console.log(`⚠️ No valid images found for car ${car.id}, falling back to text-only`);
        // Fall back to text-only message
        const enhancedCaption = caption + '\n\n📸 Images: Not available at the moment 1';
        messages.push({
          type: 'text',
          text: { body: enhancedCaption }
        });
      } else {
        // Add image message with first available image
        const firstImage = validImages[0];
        
        // Use the new naming convention helper function
        let imageUrl = null;
        if (firstImage.sequence && car.registration_number) {
          // Use the new naming convention: registrationNumber_1.jpg
          imageUrl = await constructImageUrl(car.registration_number, firstImage.sequence);
        } else {
          // Fall back to default URL
          imageUrl = 'http://27.111.72.50:3000';
        }
        
        // Guard: if URL couldn't be constructed, fall back to text
        if (!imageUrl || typeof imageUrl !== 'string') {
          const enhancedCaption = caption + '\n\n📸 Images: Not available at the moment 2';
          messages.push({
            type: 'text',
            text: { body: enhancedCaption }
          });
          continue;
        }
        
        // Check if the image URL is publicly accessible
        if (isPubliclyAccessible(imageUrl)) {
          console.log(`📸 Adding car image (publicly accessible): ${imageUrl}`);
          messages.push({
            type: 'image',
            image: { link: imageUrl, caption: caption }
          });
        } else {
          console.log(`⚠️ Image URL not publicly accessible, falling back to text-only: ${imageUrl}`);
          // Fall back to text-only message with enhanced caption
          const enhancedCaption = caption + '\n\n📸 Images: Available but not publicly accessible. Please visit our website to view images.';
          messages.push({
            type: 'text',
            text: { body: enhancedCaption }
          });
        }
        
      }
    } else {
      // No images available - show text-only message with enhanced caption
      
      // Enhanced caption for cars without images
      const enhancedCaption = caption + '\n\n📸 Images: Not available at the moment 3';
      
      // Add text message instead of image
      messages.push({
        type: 'text',
        text: { body: enhancedCaption }
      });
      
      
    }

    // Add SELECT button message for each car
    const carId = `book_${car.brand}_${car.model}_${car.variant}`.replace(/\s+/g, '_');
    messages.push({
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: 'SELECT' },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: carId,
                title: 'SELECT'
              }
            }
          ]
        }
      }
    });
  }

  // Add "Browse More Cars" button if there are more cars to show
  const hasMoreCars = endIndex < cars.length;
  
  let messageText = `Perfect! Here are the ${session.brand || 'available'} ${session.type || 'cars'} available in your ${session.budget || 'selected'} budget:`;
  
  console.log(`📸 Created ${messages.length} messages for cars`);
  console.log(`📸 Message types:`, messages.map(m => m.type));
  
  const final = {
    message: messageText,
    messages: messages
  };
  
  // Always add "Browse More Cars" option if there are more cars
  if (hasMoreCars) {
    final.options = ["Book Test Drive", "See more cars", "Change criteria"];
    console.log("🔍 Adding Browse More Cars button - hasMoreCars:", hasMoreCars, "cars.length:", cars.length, "endIndex:", endIndex);
  } else {
    final.message += "\n\nNo more cars available.";
    final.options = ["Change criteria"];
    console.log("🔍 No more cars to show - hasMoreCars:", hasMoreCars, "cars.length:", cars.length, "endIndex:", endIndex);
  }
  
  console.log("🔍 Final response structure:", JSON.stringify(final, null, 2));
  
  // Only set step to 'show_more_cars' if user is still in a car browsing step
  // This prevents race condition where user has moved to test drive but async car display is still running
  const carBrowsingSteps = ['browse_start', 'browse_budget', 'browse_type', 'browse_brand', 'show_more_cars', 'show_cars'];
  if (carBrowsingSteps.includes(session.step)) {
    session.step = 'show_more_cars';
    return final;
  } else {
    console.log(`🚫 User has moved to step '${session.step}', skipping car display to prevent race condition`);
    return null; // Don't send car images if user has moved to a different flow
  }
}

function getTestDriveConfirmation(session) {
  
  let locationText;
  
  // Check for different location modes
  const locationMode = session.td_location_mode ? session.td_location_mode.toLowerCase() : '';
  
  if (locationMode === "home pickup") {
    locationText = `\n📍 Test Drive Location: ${session.td_home_address || 'To be confirmed'}`;
  } else if (locationMode === "showroom pickup") {
    locationText = "\n📍 Showroom Address: Sherpa Hyundai Showroom, 123 MG Road, Bangalore\n🅿️ Free parking available";
  } else if (locationMode.includes("delivery")) {
    locationText = `\n📍 Test Drive Location: ${session.td_drop_location || 'To be confirmed'}`;
  } else {
    locationText = "\n📍 Test Drive Location: To be confirmed";
  }

  // Format the date properly
  let dateDisplay = 'To be confirmed';
  if (session.testDriveDateFormatted) {
    dateDisplay = session.testDriveDateFormatted;
  } else if (session.testDriveDate === 'Today' || session.testDriveDate === 'Tomorrow') {
    dateDisplay = session.testDriveDate;
  } else if (session.testDriveDay) {
    dateDisplay = session.testDriveDay;
  }

  return {
    message: `Perfect! Here's your test drive confirmation:

📋 TEST DRIVE CONFIRMED:
👤 Name: ${session.td_name || 'Not provided'}
📱 Phone: ${session.td_phone || 'Not provided'}
🚗 Car: ${session.selectedCar || 'Not selected'}
📅 Date: ${dateDisplay}
⏰ Time: ${session.testDriveTime || 'Not selected'}
${locationText}

📍 Showroom Address: [Sherpa Hyundai] Showroom 123 MG Road, Bangalore
🅿️ Free parking available

What to bring:
✅ Valid driving license
✅ Any photo ID

📞 Need help? Call us: +91-9876543210
WhatsApp: This number

Quick reminder: We'll also have financing options ready if you like the car during your test drive!

Looking forward to seeing you this weekend morning!
Have a great day! 😊`,
    options: ["Confirm", "Reject"]
  };
}

module.exports = { handleBrowseUsedCars };