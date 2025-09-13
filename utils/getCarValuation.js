const { getAllBrands, getModelsByBrand } = require('./carData');
const { validateYear, validateFuelType, validateTransmission, validateCondition, validatePhoneNumber, validateName, createValidationErrorMessage } = require('./inputValidation');
const pool = require('../db');
const { parseUserIntent } = require('./geminiHandler');
const { saveUserProfile, extractUserPreferences } = require('./userProfileManager');

const YEAR_OPTIONS = [
  "2024", "2023", "2022", "2021", "2020", "Older than 2020"
];

const FUEL_OPTIONS = [
  "Petrol", "Diesel", "CNG", "Electric"
];

const KM_OPTIONS = [
  "Under 10,000 KM",
  "10,000 - 25,000 KM",
  "25,000 - 50,000 KM",
  "50,000 - 75,000 KM",
  "75,000 - 1,00,000",
  "Over 1,00,000 KM"
];

const OWNER_OPTIONS = [
  "1st Owner (Me)",
  "2nd Owner",
  "3rd Owner",
  "More than 3 owners"
];

const CONDITION_OPTIONS = [
  "Excellent (Like new)",
  "Good (Minor wear)",
  "Average (Normal)",
  "Fair (Needs work)"
];

async function handleCarValuationStep(session, userMessage) {
  const state = session.step || 'start';
  console.log("🧠 Current step:", state);
  console.log("📝 User input:", userMessage);

  // Check for greeting keywords FIRST - before any step processing
  const lowerMsg = userMessage.toLowerCase();
  if (['hi', 'hello', 'hey', 'hy', 'start', 'begin', 'restart', 'menu', 'main'].includes(lowerMsg)) {
    // Clear any existing session state to start fresh
    session.step = 'main_menu';
    session.carIndex = 0;
    session.filteredCars = [];
    session.selectedCar = null;
    session.budget = null;
    session.type = null;
    session.brand = null;
    session.testDriveDate = null;
    session.testDriveTime = null;
    session.td_name = null;
    session.td_phone = null;
    session.td_license = null;
    session.td_location_mode = null;
    session.td_home_address = null;
    session.td_drop_location = null;
    
    console.log("🔁 Greeting detected in valuation flow - resetting to main menu and cleared all session data");
    return {
      message: "Hello! 👋 Welcome to Sherpa Hyundai. I'm here to help you find your perfect used car. How can I assist you today?",
      options: [
        "🚗 Browse Used Cars",
        "💰 Get Car Valuation", 
        "📞 Contact Our Team",
        "ℹ️ About Us"
      ]
    };
  }

  switch (state) {
    case 'start':
    case 'valuation_start':
      // AI parsing for smart flow skipping
      try {
        const ai = await parseUserIntent(pool, userMessage);
        console.log("🔍 DEBUG: Valuation AI parsing result:", ai);
        if (ai && ai.confidence > 0.6 && ai.intent === 'valuation') {
          const e = ai.entities || {};
          
          // Auto-apply parsed entities
          if (e.brand) session.brand = e.brand;
          if (e.model) session.model = e.model;
          if (e.year) session.year = e.year;
          if (e.fuel) session.fuel = e.fuel;
          
          // Smart flow skipping based on what we have
          if (session.brand && session.model && session.year && session.fuel) {
            // All car details provided, skip to kms
            session.step = 'kms';
            return {
              message: `Perfect! I've got your car details:\n🚗 ${session.year} ${session.brand} ${session.model} (${session.fuel})\n\nHow many kilometers has your car been driven?`,
              options: KM_OPTIONS
            };
          } else if (session.brand && session.model && session.year) {
            // Brand, model, year provided, ask for fuel
            session.step = 'fuel';
            return {
              message: `Great! I've got your car details:\n🚗 ${session.year} ${session.brand} ${session.model}\n\nWhat's the fuel type?`,
              options: FUEL_OPTIONS
            };
          } else if (session.brand && session.model) {
            // Brand and model provided, ask for year
            session.step = 'year';
            return {
              message: `Excellent! I've got your car:\n🚗 ${session.brand} ${session.model}\n\nWhat year is it?`,
              options: YEAR_OPTIONS
            };
          } else if (session.brand) {
            // Only brand provided, ask for model
            session.step = 'model';
            const models = await getModelsByBrand(pool, session.brand);
            return {
              message: `Perfect! I've got your brand: ${session.brand}\n\nWhich model do you have?`,
              options: [...models, `Other ${session.brand} models`]
            };
          }
        }
      } catch (e) { console.log('AI parsing skipped:', e.message); }
      
      session.step = 'brand';
      return {
        message: "Great! I'll help you get a valuation for your car. Let's start with some basic details.\n\nFirst, which brand is your car?",
        options: [...await getAllBrands(pool), "Other brands"]
      };

    case 'brand':
      // Check for AI parsing of additional details
      try {
        const ai = await parseUserIntent(pool, userMessage);
        console.log("🔍 DEBUG: Brand case AI parsing result:", ai);
        if (ai && ai.confidence > 0.6 && ai.intent === 'valuation') {
          const e = ai.entities || {};
          if (e.brand) session.brand = e.brand;
          if (e.model) session.model = e.model;
          if (e.year) session.year = e.year;
          if (e.fuel) session.fuel = e.fuel;
          
          // Smart flow skipping
          if (session.brand && session.model && session.year && session.fuel) {
            session.step = 'kms';
            return {
              message: `Perfect! I've got your car details:\n🚗 ${session.year} ${session.brand} ${session.model} (${session.fuel})\n\nHow many kilometers has your car been driven?`,
              options: KM_OPTIONS
            };
          } else if (session.brand && session.model && session.year) {
            session.step = 'fuel';
            return {
              message: `Great! I've got your car details:\n🚗 ${session.year} ${session.brand} ${session.model}\n\nWhat's the fuel type?`,
              options: FUEL_OPTIONS
            };
          } else if (session.brand && session.model) {
            session.step = 'year';
            return {
              message: `Excellent! I've got your car:\n🚗 ${session.brand} ${session.model}\n\nWhat year is it?`,
              options: YEAR_OPTIONS
            };
          }
        }
      } catch (e) { console.log('AI parsing skipped:', e.message); }
      
      if (userMessage === 'Other brands') {
        session.step = 'other_brand_input';
        return { message: "Please type the brand name of your car." };
      } else {
        session.brand = userMessage;
        session.step = 'model';
        const models = await getModelsByBrand(pool, userMessage);
        return {
          message: `Perfect! Which ${userMessage} model do you have?`,
          options: [...models, `Other ${userMessage} models`]
        };
      }

    case 'other_brand_input':
      session.brand = userMessage;
      session.step = 'other_model_input';
      return { message: `Perfect! Please write down which model car you have.` };

    case 'model':
      if (userMessage.toLowerCase().includes("other")) {
        session.step = 'other_model_input';
        return { message: `Perfect! Please write down which model car you have.` };
      } else {
        session.model = userMessage;
        session.step = 'year';
        return {
          message: `Excellent! What year is your ${session.model}?`,
          options: YEAR_OPTIONS
        };
      }

    case 'other_model_input':
      session.model = userMessage;
      session.step = 'year';
      return {
        message: `Excellent! What year is your ${session.model}?`,
        options: YEAR_OPTIONS
      };

    case 'year':
      console.log("📅 Validating year:", userMessage);
      
      const yearValidation = validateYear(userMessage);
      if (!yearValidation.isValid) {
        return {
          message: createValidationErrorMessage("year", yearValidation.suggestions, YEAR_OPTIONS),
          options: YEAR_OPTIONS
        };
      }
      
      console.log("✅ Valid year selected:", yearValidation.matchedOption);
      session.year = yearValidation.matchedOption;
      session.step = 'fuel';
      return {
        message: `Great! What's the fuel type of your ${session.year} ${session.model}?`,
        options: FUEL_OPTIONS
      };

    case 'fuel':
      console.log("⛽ Validating fuel type:", userMessage);
      
      const fuelValidation = validateFuelType(userMessage);
      if (!fuelValidation.isValid) {
        return {
          message: createValidationErrorMessage("fuel type", fuelValidation.suggestions, FUEL_OPTIONS),
          options: FUEL_OPTIONS
        };
      }
      
      console.log("✅ Valid fuel type selected:", fuelValidation.matchedOption);
      session.fuel = fuelValidation.matchedOption;
      session.step = 'kms';
      return {
        message: "Perfect! How many kilometers has your car been driven?",
        options: KM_OPTIONS
      };

    case 'kms':
      session.kms = userMessage;
      session.step = 'owner';
      return {
        message: "Almost done! How many owners has this car had?",
        options: OWNER_OPTIONS
      };

    case 'owner':
      session.owner = userMessage;
      session.step = 'condition';
      return {
        message: "Last question! How would you rate your car's overall condition?",
        options: CONDITION_OPTIONS
      };

    case 'condition':
      console.log("⭐ Validating condition:", userMessage);
      
      const conditionValidation = validateCondition(userMessage);
      if (!conditionValidation.isValid) {
        return {
          message: createValidationErrorMessage("car condition", conditionValidation.suggestions, CONDITION_OPTIONS),
          options: CONDITION_OPTIONS
        };
      }
      
      console.log("✅ Valid condition selected:", conditionValidation.matchedOption);
      session.condition = conditionValidation.matchedOption;
      
      // Check if user already has details stored
      if (session.td_name && session.td_phone) {
        console.log("👤 User already has details stored, using for valuation");
        session.name = session.td_name;
        session.phone = session.td_phone;
        session.step = 'location';
        return { message: "Great! I have your details saved:\n👤 Name: " + session.td_name + "\n📱 Phone: " + session.td_phone + "\n\n3. Your Current Location/City:" };
      }
      
      session.step = 'name';
      return {
        message: "Great! We'd love to purchase your car. Let me collect your details:\n\n1. Your Name:"
      };

    case 'name':
      console.log("👤 Validating name:", userMessage);
      
      const nameValidation = validateName(userMessage);
      if (!nameValidation.isValid) {
        return {
          message: `Please enter a valid name (2-50 characters, letters only).\n\n1. Your Name:`
        };
      }
      
      console.log("✅ Valid name provided:", nameValidation.matchedOption);
      session.name = nameValidation.matchedOption;
      session.step = 'phone';
      return { message: "2. Your Phone Number:" };

    case 'phone':
      console.log("📱 Validating phone number:", userMessage);
      
      const phoneValidation = validatePhoneNumber(userMessage);
      if (!phoneValidation.isValid) {
        return {
          message: `Please enter a valid 10-digit Indian phone number.\n\n2. Your Phone Number:`
        };
      }
      
      console.log("✅ Valid phone number provided:", phoneValidation.matchedOption);
      session.phone = phoneValidation.matchedOption;
      session.step = 'location';
      return { message: "3. Your Current Location/City:" };

    case 'location':
      session.location = userMessage;
      session.step = 'done';

      const confirmation = {
        name: session.name,
        phone: session.phone,
        location: session.location,
        car_summary: `${session.year} ${session.brand} ${session.model} ${session.fuel}`,
        kms: session.kms,
        owner: session.owner,
        condition: session.condition
      };

      // ✅ Save to database
      try {
        if (!pool || typeof pool.query !== 'function') {
          console.error('❌ Database pool not available');
          throw new Error('Database connection not available');
        }

        const result = await pool.query(
          `INSERT INTO car_valuations
          (name, phone, location, brand, model, year, fuel, kms, owner, condition, submitted_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
          RETURNING id`,
          [
            confirmation.name,
            confirmation.phone,
            confirmation.location,
            session.brand,
            session.model,
            session.year,
            session.fuel,
            session.kms,
            session.owner,
            session.condition
          ]
        );
        
        console.log('✅ Car valuation saved to database with ID:', result.rows[0]?.id);
      } catch (error) {
        console.error('❌ Error saving car valuation to database:', error);
        // Continue with the flow even if database save fails
      }

      return {
        message:
`Perfect ${confirmation.name}! Here's what happens next:

📋 SELLER CONFIRMATION:
👤 Name: ${confirmation.name}
📱 Phone: ${confirmation.phone}
🚗 Car: ${confirmation.car_summary}
📍 Location: ${confirmation.location}

📅 Next Steps:
1. Our executive will call you within 2 hours
2. We'll schedule a physical inspection
3. Final price quote after inspection
4. Instant payment if you accept our offer

📞 Questions? Call: +91-9876543210
Thank you for choosing Sherpa Hyundai! 😊`,
        options: ["Explore", "End Conversation"]
      };

    case 'done':
      if (userMessage === "Explore") {
        // Save user profile before clearing session data
        try {
          const userPreferences = extractUserPreferences(session);
          if (userPreferences.phone) {
            const profileResult = await saveUserProfile(userPreferences);
            if (profileResult.success) {
              console.log(`✅ User profile ${profileResult.action} before valuation session reset`);
            }
          }
        } catch (error) {
          console.log('⚠️ Could not save user profile:', error.message);
        }

        // Clear stored details and reset session for fresh start
        session.step = 'main_menu';
        session.td_name = null;
        session.td_phone = null;
        session.name = null;
        session.phone = null;
        return {
          message: "Great! Let's explore more options. What would you like to do?",
          options: [
            "🚗 Browse Used Cars",
            "💰 Get Car Valuation", 
            "📞 Contact Our Team",
            "ℹ️ About Us"
          ]
        };
      } else if (userMessage === "End Conversation") {
        // Save user profile before ending conversation
        try {
          const userPreferences = extractUserPreferences(session);
          if (userPreferences.phone) {
            const profileResult = await saveUserProfile(userPreferences);
            if (profileResult.success) {
              console.log(`✅ User profile ${profileResult.action} before valuation session end`);
            }
          }
        } catch (error) {
          console.log('⚠️ Could not save user profile:', error.message);
        }

        // End conversation with thank you note
        session.conversationEnded = true;
        return {
          message: `Thank you for choosing Sherpa Hyundai! 🙏

We appreciate your time and look forward to serving you.

📞 For any queries: +91-9876543210
📍 Visit us: 123 MG Road, Bangalore
🌐 Website: www.sherpahyundai.com

Have a great day! 😊`
        };
      }
      return { message: "Something went wrong. Please try again." };

    default:
      return { message: "Something went wrong. Please try again." };
  }
}

module.exports = { handleCarValuationStep };
