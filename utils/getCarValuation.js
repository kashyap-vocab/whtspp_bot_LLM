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
      message: "Hello! 👋 Welcome to Sherpa Hyundai. How can I assist you today?",
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
      // Get brands first for quick response
      const brands = await getAllBrands(pool);
      
      // Skip AI parsing for initial step to make it faster
      // AI parsing will happen in subsequent steps when user provides details
      
      session.step = 'brand';
      return {
        message: "Great! I'll help you get a valuation for your car. Let's start with some basic details about your vehicle.\n\nFirst, which brand is your car?",
        options: [...brands, "Other brands"]
      };

    case 'brand':
      // Check for AI parsing of additional details (with timeout)
      try {
        const aiPromise = parseUserIntent(pool, userMessage);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI parsing timeout')), 2000)
        );
        
        const ai = await Promise.race([aiPromise, timeoutPromise]);
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
              message: "What's the fuel type?",
              options: FUEL_OPTIONS
            };
          } else if (session.brand && session.model) {
            session.step = 'year';
            return {
              message: "What year is it?",
              options: YEAR_OPTIONS
            };
          }
        }
      } catch (e) { console.log('AI parsing skipped:', e.message); }
      
      // Check if AI has already extracted the brand and other details
      if (session.brand && session.brand !== userMessage) {
        // AI has already extracted the brand, skip to next step
        if (!session.model) {
          session.step = 'model';
          const models = await getModelsByBrand(pool, session.brand);
          return {
            message: `Perfect! Which ${session.brand} model do you have?`,
            options: [...models, `Other models`]
          };
        } else if (!session.year) {
          session.step = 'year';
          return {
            message: `Excellent! What year is your ${session.brand} ${session.model}?`,
            options: YEAR_OPTIONS
          };
        } else if (!session.fuel) {
          session.step = 'fuel';
          return {
            message: `Great! What's the fuel type of your ${session.year} ${session.brand} ${session.model}?`,
            options: FUEL_OPTIONS
          };
        } else {
          session.step = 'kms';
          return {
            message: `Perfect! I've got your car details:\n🚗 ${session.year} ${session.brand} ${session.model} (${session.fuel})\n\nHow many kilometers has your car been driven?`,
            options: KM_OPTIONS
          };
        }
      }
      
      if (userMessage === 'Other brands') {
        session.step = 'other_brand_input';
        return { message: "Please type the brand name of your car." };
      } else {
        session.brand = userMessage;
        session.step = 'model';
        const models = await getModelsByBrand(pool, userMessage);
        return {
          message: `Perfect! Which ${userMessage} model do you have?`,
          options: [...models, `Other models`]
        };
      }

    case 'other_brand_input':
      session.brand = userMessage;
      session.step = 'other_model_input';
      return { message: `Perfect! Please write down which model car you have.` };

    case 'model':
      // AI parsing for additional details
      try {
        const ai = await parseUserIntent(pool, userMessage);
        if (ai && ai.confidence > 0.6 && ai.intent === 'valuation') {
          const e = ai.entities || {};
          if (e.model) session.model = e.model;
          if (e.year) session.year = e.year;
          if (e.fuel) session.fuel = e.fuel;
          if (e.kms) session.kms = e.kms;
          if (e.owner) session.owner = e.owner;
          if (e.condition) session.condition = e.condition;
          
          console.log('🔍 DEBUG: Model case AI parsing result:', ai);
          
          // Smart flow skipping based on extracted data
          if (!session.year) {
            session.step = 'year';
            return {
              message: `Excellent! What year is your ${session.brand} ${session.model || 'car'}?`,
              options: YEAR_OPTIONS
            };
          } else if (!session.fuel) {
            session.step = 'fuel';
            return {
              message: `Great! What's the fuel type of your ${session.year} ${session.brand} ${session.model || 'car'}?`,
              options: FUEL_OPTIONS
            };
          } else if (!session.kms) {
            session.step = 'kms';
            return {
              message: `Perfect! I've got your car details:\n🚗 ${session.year} ${session.brand} ${session.model || 'car'} (${session.fuel})\n\nHow many kilometers has your car been driven?`,
              options: KM_OPTIONS
            };
          } else if (!session.owner) {
            session.step = 'owner';
            return {
              message: "Almost done! How many owners has this car had?",
              options: OWNER_OPTIONS
            };
          } else if (!session.condition) {
            session.step = 'condition';
            return {
              message: "What's the overall condition of your car?",
              options: CONDITION_OPTIONS
            };
          } else {
            session.step = 'name';
            return {
              message: "Perfect! I have all the details about your car. Now I need your contact information:\n\n1. Your Name:",
              options: []
            };
          }
        }
      } catch (error) {
        console.log('⚠️ AI parsing failed in model case:', error.message);
      }
      
      // Check if AI has already extracted the year (meaning we can skip year step)
      if (session.year && session.year !== userMessage) {
        // AI has already extracted the year, skip to next step
        if (!session.fuel) {
          session.step = 'fuel';
          return {
            message: `Great! What's the fuel type of your ${session.year} ${session.brand} ${session.model || 'car'}?`,
            options: FUEL_OPTIONS
          };
        } else {
          session.step = 'kms';
          return {
            message: `Perfect! I've got your car details:\n🚗 ${session.year} ${session.brand} ${session.model || 'car'} (${session.fuel})\n\nHow many kilometers has your car been driven?`,
            options: KM_OPTIONS
          };
        }
      }
      
      // Check if AI has already extracted the model and other details
      if (session.model && session.model !== userMessage) {
        // AI has already extracted the model, skip to next step
        if (!session.year) {
          session.step = 'year';
          return {
            message: `Excellent! What year is your ${session.brand} ${session.model}?`,
            options: YEAR_OPTIONS
          };
        } else if (!session.fuel) {
          session.step = 'fuel';
          return {
            message: `Great! What's the fuel type of your ${session.year} ${session.brand} ${session.model}?`,
            options: FUEL_OPTIONS
          };
        } else {
          session.step = 'kms';
          return {
            message: `Perfect! I've got your car details:\n🚗 ${session.year} ${session.brand} ${session.model} (${session.fuel})\n\nHow many kilometers has your car been driven?`,
            options: KM_OPTIONS
          };
        }
      }
      
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
      // AI parsing for additional details
      try {
        const ai = await parseUserIntent(pool, userMessage);
        if (ai && ai.confidence > 0.6 && ai.intent === 'valuation') {
          const e = ai.entities || {};
          if (e.year) session.year = e.year;
          if (e.fuel) session.fuel = e.fuel;
          if (e.kms) session.kms = e.kms;
          if (e.owner) session.owner = e.owner;
          if (e.condition) session.condition = e.condition;
          
          console.log('🔍 DEBUG: Year case AI parsing result:', ai);
          
          // Smart flow skipping based on extracted data
          if (!session.fuel) {
            session.step = 'fuel';
            return {
              message: `Great! What's the fuel type of your ${session.year} ${session.brand} ${session.model}?`,
              options: FUEL_OPTIONS
            };
          } else if (!session.kms) {
            session.step = 'kms';
            return {
              message: `Perfect! I've got your car details:\n🚗 ${session.year} ${session.brand} ${session.model} (${session.fuel})\n\nHow many kilometers has your car been driven?`,
              options: KM_OPTIONS
            };
          } else if (!session.owner) {
            session.step = 'owner';
            return {
              message: "Almost done! How many owners has this car had?",
              options: OWNER_OPTIONS
            };
          } else if (!session.condition) {
            session.step = 'condition';
            return {
              message: "What's the overall condition of your car?",
              options: CONDITION_OPTIONS
            };
          } else {
            session.step = 'name';
            return {
              message: "Perfect! I have all the details about your car. Now I need your contact information:\n\n1. Your Name:",
              options: []
            };
          }
        }
      } catch (error) {
        console.log('⚠️ AI parsing failed in year case:', error.message);
      }
      
      // Check if AI has already extracted the year
      if (session.year && session.year !== userMessage) {
        // AI has already extracted the year, skip to next step
        if (!session.fuel) {
          session.step = 'fuel';
          return {
            message: `Great! What's the fuel type of your ${session.year} ${session.brand} ${session.model}?`,
            options: FUEL_OPTIONS
          };
        } else {
          session.step = 'kms';
          return {
            message: `Perfect! I've got your car details:\n🚗 ${session.year} ${session.brand} ${session.model} (${session.fuel})\n\nHow many kilometers has your car been driven?`,
            options: KM_OPTIONS
          };
        }
      }
      
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
      // Check if AI has already extracted the fuel
      if (session.fuel && session.fuel !== userMessage) {
        // AI has already extracted the fuel, skip to next step
        session.step = 'kms';
        return {
          message: `Perfect! I've got your car details:\n🚗 ${session.year} ${session.brand} ${session.model} (${session.fuel})\n\nHow many kilometers has your car been driven?`,
          options: KM_OPTIONS
        };
      }
      
      // AI parsing for additional details
      try {
        const ai = await parseUserIntent(pool, userMessage);
        if (ai && ai.confidence > 0.6 && ai.intent === 'valuation') {
          const e = ai.entities || {};
          if (e.fuel) session.fuel = e.fuel;
          if (e.kms) session.kms = e.kms;
          if (e.owner) session.owner = e.owner;
          if (e.condition) session.condition = e.condition;
          
          // Smart flow skipping
          if (session.fuel && session.kms && session.owner && session.condition) {
            session.step = 'name';
            return {
              message: `Perfect! I've got all your car details:\n🚗 ${session.year} ${session.brand} ${session.model} (${session.fuel})\n📊 ${session.kms}, ${session.owner}, ${session.condition}\n\nNow I need your contact details:\n\n1. Your Name:`,
              options: []
            };
          } else if (session.fuel && session.kms && session.owner) {
            session.step = 'condition';
            return {
              message: `Great! What's the overall condition of your car?`,
              options: CONDITION_OPTIONS
            };
          } else if (session.fuel && session.kms) {
            session.step = 'owner';
            return {
              message: `Perfect! How many owners has your car had?`,
              options: OWNER_OPTIONS
            };
          } else if (session.fuel) {
            session.step = 'kms';
            return {
              message: `Perfect! How many kilometers has your car been driven?`,
              options: KM_OPTIONS
            };
          }
        }
      } catch (error) {
        console.error("Error parsing fuel input:", error);
      }
      
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
      // Check if AI has already extracted the kms
      if (session.kms && session.kms !== userMessage) {
        // AI has already extracted the kms, skip to next step
        session.step = 'owner';
        return {
          message: "Almost done! How many owners has this car had?",
          options: OWNER_OPTIONS
        };
      }
      
      // AI parsing for additional details
      try {
        const ai = await parseUserIntent(pool, userMessage);
        if (ai && ai.confidence > 0.6 && ai.intent === 'valuation') {
          const e = ai.entities || {};
          if (e.kms) session.kms = e.kms;
          if (e.owner) session.owner = e.owner;
          if (e.condition) session.condition = e.condition;
          
          // Smart flow skipping
          if (session.kms && session.owner && session.condition) {
            session.step = 'name';
            return {
              message: `Perfect! I've got all your car details:\n🚗 ${session.year} ${session.brand} ${session.model} (${session.fuel})\n📊 ${session.kms}, ${session.owner}, ${session.condition}\n\nNow I need your contact details:\n\n1. Your Name:`,
              options: []
            };
          } else if (session.kms && session.owner) {
            session.step = 'condition';
            return {
              message: "Great! What's the overall condition of your car?",
              options: CONDITION_OPTIONS
            };
          } else if (session.kms) {
            session.step = 'owner';
            return {
              message: "Perfect! How many owners has your car had?",
              options: OWNER_OPTIONS
            };
          }
        }
      } catch (error) {
        console.error("Error parsing kms input:", error);
      }
      
      session.kms = userMessage;
      session.step = 'owner';
      return {
        message: "Almost done! How many owners has this car had?",
        options: OWNER_OPTIONS
      };

    case 'owner':
      // Check if AI has already extracted the owner
      if (session.owner && session.owner !== userMessage) {
        // AI has already extracted the owner, skip to next step
        session.step = 'condition';
        return {
          message: "Last question! How would you rate your car's overall condition?",
          options: CONDITION_OPTIONS
        };
      }
      
      // AI parsing for additional details
      try {
        const ai = await parseUserIntent(pool, userMessage);
        if (ai && ai.confidence > 0.6 && ai.intent === 'valuation') {
          const e = ai.entities || {};
          if (e.owner) session.owner = e.owner;
          if (e.condition) session.condition = e.condition;
          
          // Smart flow skipping
          if (session.owner && session.condition) {
            session.step = 'name';
            return {
              message: `Perfect! I've got all your car details:\n🚗 ${session.year} ${session.brand} ${session.model} (${session.fuel})\n📊 ${session.kms}, ${session.owner}, ${session.condition}\n\nNow I need your contact details:\n\n1. Your Name:`,
              options: []
            };
          } else if (session.owner) {
            session.step = 'condition';
            return {
              message: "Great! What's the overall condition of your car?",
              options: CONDITION_OPTIONS
            };
          }
        }
      } catch (error) {
        console.error("Error parsing owner input:", error);
      }
      
      session.owner = userMessage;
      session.step = 'condition';
      return {
        message: "Last question! How would you rate your car's overall condition?",
        options: CONDITION_OPTIONS
      };

    case 'condition':
      // Check if AI has already extracted the condition
      if (session.condition && session.condition !== userMessage) {
        // AI has already extracted the condition, skip to next step
        // Check if user already has details stored
        if (session.td_name && session.td_phone) {
          console.log("👤 User already has details stored, using for valuation");
          session.name = session.td_name;
          session.phone = session.td_phone;
          session.step = 'location';
          return {
            message: "Perfect! Where are you located? (City/Area)",
            options: []
          };
        } else {
          session.step = 'name';
          return {
            message: `Perfect! I've got all your car details:\n🚗 ${session.year} ${session.brand} ${session.model} (${session.fuel})\n📊 ${session.kms}, ${session.owner}, ${session.condition}\n\nNow I need your contact details:\n\n1. Your Name:`,
            options: []
          };
        }
      }
      
      // AI parsing for additional details
      try {
        const ai = await parseUserIntent(pool, userMessage);
        if (ai && ai.confidence > 0.6 && ai.intent === 'valuation') {
          const e = ai.entities || {};
          if (e.condition) session.condition = e.condition;
          if (e.name) session.name = e.name;
          if (e.phone) session.phone = e.phone;
          
          // Smart flow skipping
          if (session.condition && session.name && session.phone) {
            session.step = 'location';
            return {
              message: "Perfect! Where are you located? (City/Area)",
              options: []
            };
          } else if (session.condition && session.name) {
            session.step = 'phone';
            return {
              message: "2. Your Phone Number (10 digits only):",
              options: []
            };
          } else if (session.condition) {
            session.step = 'name';
            return {
              message: `Perfect! I've got all your car details:\n🚗 ${session.year} ${session.brand} ${session.model} (${session.fuel})\n📊 ${session.kms}, ${session.owner}, ${session.condition}\n\nNow I need your contact details:\n\n1. Your Name:`,
              options: []
            };
          }
        }
      } catch (error) {
        console.error("Error parsing condition input:", error);
      }
      
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
      // Check if AI has already extracted the name
      if (session.name && session.name !== userMessage) {
        // AI has already extracted the name, skip to next step
        session.step = 'phone';
        return { message: "2. Your Phone Number:" };
      }
      
      // AI parsing for additional details
      try {
        const ai = await parseUserIntent(pool, userMessage);
        if (ai && ai.confidence > 0.6 && ai.intent === 'valuation') {
          const e = ai.entities || {};
          if (e.name) session.name = e.name;
          if (e.phone) session.phone = e.phone;
          
          // Smart flow skipping
          if (session.name && session.phone) {
            session.step = 'location';
            return {
              message: "Perfect! Where are you located? (City/Area)",
              options: []
            };
          } else if (session.name) {
            session.step = 'phone';
            return { message: "2. Your Phone Number:" };
          }
        }
      } catch (error) {
        console.error("Error parsing name input:", error);
      }
      
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
      // Check if AI has already extracted the phone
      if (session.phone && session.phone !== userMessage) {
        // AI has already extracted the phone, skip to next step
        session.step = 'location';
        return { message: "3. Your Current Location/City:" };
      }
      
      // AI parsing for additional details
      try {
        const ai = await parseUserIntent(pool, userMessage);
        if (ai && ai.confidence > 0.6 && ai.intent === 'valuation') {
          const e = ai.entities || {};
          if (e.phone) session.phone = e.phone;
          if (e.location) session.location = e.location;
          
          // Smart flow skipping
          if (session.phone && session.location) {
            session.step = 'done';
            return {
              message: `Perfect! I have all your details:\n\n🚗 Car: ${session.year} ${session.brand} ${session.model} (${session.fuel})\n📊 ${session.kms}, ${session.owner}, ${session.condition}\n👤 Contact: ${session.name}, ${session.phone}\n📍 Location: ${session.location}\n\nOur team will contact you within 24 hours with a valuation offer!`,
              options: ["🚗 Browse Used Cars", "💰 Get Car Valuation", "📞 Contact Our Team", "ℹ️ About Us"]
            };
          } else if (session.phone) {
            session.step = 'location';
            return { message: "3. Your Current Location/City:" };
          }
        }
      } catch (error) {
        console.error("Error parsing phone input:", error);
      }
      
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
      // Check if AI has already extracted the location
      if (session.location && session.location !== userMessage) {
        // AI has already extracted the location, skip to done
        session.step = 'done';
      } else {
        session.location = userMessage;
        session.step = 'done';
      }

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