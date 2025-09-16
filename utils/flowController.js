const sessionManager = require('./sessionManager');
const { getAvailableTypes, getAvailableBrands, getCarsByFilter } = require('./carData');
const { parseUserIntent } = require('./geminiHandler');
const pool = require('../db');

class FlowController {
  constructor() {
    this.flowSteps = {
      'start': this.handleStart.bind(this),
      'browse_budget': this.handleBudget.bind(this),
      'browse_type': this.handleCarType.bind(this),
      'browse_brand': this.handleBrand.bind(this),
      'show_cars': this.handleShowCars.bind(this),
      'test_drive_date': this.handleTestDriveDate.bind(this),
      'test_drive_time': this.handleTestDriveTime.bind(this),
      'td_name': this.handleName.bind(this),
      'td_phone': this.handlePhone.bind(this),
      'td_license': this.handleLicense.bind(this),
      'td_location_mode': this.handleLocation.bind(this),
      'test_drive_confirmation': this.handleConfirmation.bind(this)
    };
  }

  // Main entry point for handling user messages
  async handleMessage(userMessage, session = {}) {
    try {
      // Initialize or load session
      if (!session.currentStep) {
        sessionManager.initializeSession('browse');
      } else {
        sessionManager.setSession(session);
      }

      console.log('🔄 Flow Controller - Current Step:', sessionManager.getSession().currentStep);
      console.log('📊 Session Summary:', JSON.stringify(sessionManager.getSessionSummary(), null, 2));

      // Try AI parsing first for natural language inputs
      const aiResult = await this.tryAIParsing(userMessage);
      if (aiResult) {
        console.log('🤖 AI parsed entities:', aiResult.entities);
        sessionManager.updateWithAIEntities(aiResult.entities);
      }

      // Get current step handler
      const currentStep = sessionManager.getSession().currentStep;
      const handler = this.flowSteps[currentStep];
      
      if (!handler) {
        throw new Error(`Unknown step: ${currentStep}`);
      }

      // Execute step handler
      const result = await handler(userMessage);
      
      // Update session with result
      if (result.nextStep) {
        sessionManager.updateStep(result.nextStep);
      }

      return {
        message: result.message,
        options: result.options || [],
        session: sessionManager.getSession(),
        sessionSummary: sessionManager.getSessionSummary()
      };

    } catch (error) {
      console.error('❌ Flow Controller Error:', error);
      return {
        message: "I'm sorry, something went wrong. Let's start over.",
        options: ["Start Over"],
        session: sessionManager.getSession(),
        sessionSummary: sessionManager.getSessionSummary()
      };
    }
  }

  // Try AI parsing for natural language inputs
  async tryAIParsing(userMessage) {
    try {
      // Skip AI for predefined options
      const predefinedOptions = [
        'Under ₹5 Lakhs', '₹5-10 Lakhs', '₹10-15 Lakhs', '₹15-20 Lakhs', 'Above ₹20 Lakhs',
        'Hatchback', 'Sedan', 'SUV', 'MUV', 'all Type', 'all Brand',
        'Today', 'Tomorrow', 'Later this Week', 'Next Week',
        'Morning (10-12 PM)', 'Afternoon (12-4 PM)', 'Evening (4-7 PM)',
        'Yes', 'No', 'Confirm', 'Reject', 'Start Over', 'Change criteria'
      ];

      if (predefinedOptions.includes(userMessage)) {
        return null;
      }

      const aiResult = await parseUserIntent(pool, userMessage);
      if (aiResult && aiResult.confidence > 0.6 && aiResult.intent === 'browse') {
        return aiResult;
      }
      return null;
    } catch (error) {
      console.log('AI parsing failed:', error.message);
      return null;
    }
  }

  // Step handlers
  async handleStart(userMessage) {
    sessionManager.updateStep('browse_budget');
    return {
      message: "Great choice! Let's find your perfect car. First, what's your budget range?",
      options: ["Under ₹5 Lakhs", "₹5-10 Lakhs", "₹10-15 Lakhs", "₹15-20 Lakhs", "Above ₹20 Lakhs"],
      nextStep: 'browse_budget'
    };
  }

  async handleBudget(userMessage) {
    const budgetOptions = {
      "Under ₹5 Lakhs": "Under ₹5 Lakhs",
      "₹5-10 Lakhs": "₹5-10 Lakhs", 
      "₹10-15 Lakhs": "₹10-15 Lakhs",
      "₹15-20 Lakhs": "₹15-20 Lakhs",
      "Above ₹20 Lakhs": "Above ₹20 Lakhs"
    };

    const selectedBudget = budgetOptions[userMessage];
    if (!selectedBudget) {
      return {
        message: "Please select a valid budget option:",
        options: Object.keys(budgetOptions)
      };
    }

    sessionManager.updateUserChoice('budget', selectedBudget);
    
    // Check if we can skip to next step
    const nextStep = sessionManager.getNextStep();
    console.log('🎯 Next step determined:', nextStep);

    if (nextStep === 'browse_type') {
      const types = await getAvailableTypes(pool, selectedBudget);
      return {
        message: `Perfect! ${selectedBudget} gives you excellent options. What type of car do you prefer?`,
        options: ['all Type', ...types],
        nextStep: 'browse_type'
      };
    } else if (nextStep === 'browse_brand') {
      const brands = await getAvailableBrands(pool, selectedBudget, sessionManager.getSession().preferences.carType);
      return {
        message: `Perfect! ${selectedBudget} gives you excellent options. Which brand do you prefer?`,
        options: ['all Brand', ...brands],
        nextStep: 'browse_brand'
      };
    } else if (nextStep === 'show_cars') {
      // Skip directly to showing cars
      return await this.showCars();
    }
  }

  async handleCarType(userMessage) {
    const session = sessionManager.getSession();
    const types = await getAvailableTypes(pool, session.preferences.budget);
    const validTypes = ['all Type', ...types];

    if (!validTypes.includes(userMessage)) {
      return {
        message: "Please select a valid car type:",
        options: validTypes
      };
    }

    const selectedType = userMessage === 'all Type' ? 'all' : userMessage;
    sessionManager.updateUserChoice('carType', selectedType);

    const nextStep = sessionManager.getNextStep();
    console.log('🎯 Next step determined:', nextStep);

    if (nextStep === 'browse_brand') {
      const brands = await getAvailableBrands(pool, session.preferences.budget, selectedType);
      return {
        message: "Excellent choice! Which brand do you prefer?",
        options: ['all Brand', ...brands],
        nextStep: 'browse_brand'
      };
    } else if (nextStep === 'show_cars') {
      return await this.showCars();
    }
  }

  async handleBrand(userMessage) {
    const session = sessionManager.getSession();
    const brands = await getAvailableBrands(pool, session.preferences.budget, session.preferences.carType);
    const validBrands = ['all Brand', ...brands];

    if (!validBrands.includes(userMessage)) {
      return {
        message: "Please select a valid brand:",
        options: validBrands
      };
    }

    const selectedBrand = userMessage === 'all Brand' ? 'all' : userMessage;
    sessionManager.updateUserChoice('brand', selectedBrand);

    return await this.showCars();
  }

  async showCars() {
    const session = sessionManager.getSession();
    const { budget, carType, brand } = session.preferences;

    console.log('🔍 Searching cars with criteria:', { budget, carType, brand });

    const cars = await getCarsByFilter(pool, budget, carType, brand);
    sessionManager.updateSearchResults(cars);

    if (cars.length === 0) {
      return {
        message: `Sorry, no cars found matching your criteria (${carType}, ${brand}) in ${budget}. Let's try different options.`,
        options: ["Change criteria"],
        nextStep: 'browse_budget'
      };
    }

    const car = cars[0]; // Show first car
    const carInfo = `🚗 ${car.brand} ${car.model} ${car.variant}\n📅 Year: ${car.year}\n⛽ Fuel: ${car.fuel_type}\n💰 Price: ₹${parseInt(car.price).toLocaleString('en-IN')}`;

    return {
      message: `Perfect! Here are the ${brand || 'available'} ${carType || 'cars'} available in your ${budget} budget:\n\n${carInfo}`,
      options: ["SELECT", "See more cars", "Change criteria"],
      nextStep: 'show_cars'
    };
  }

  async handleShowCars(userMessage) {
    if (userMessage === "SELECT") {
      const session = sessionManager.getSession();
      const cars = session.searchResults.filteredCars;
      if (cars.length > 0) {
        sessionManager.selectCar(cars[0]);
        return {
          message: `Excellent! Let's schedule your ${session.testDrive.selectedCar} test drive. When would you prefer?`,
          options: ["Today", "Tomorrow", "Later this Week", "Next Week"],
          nextStep: 'test_drive_date'
        };
      }
    } else if (userMessage === "See more cars") {
      // Show next car
      const session = sessionManager.getSession();
      session.searchResults.currentIndex++;
      const cars = session.searchResults.filteredCars;
      const currentIndex = session.searchResults.currentIndex;
      
      if (currentIndex >= cars.length) {
        return {
          message: "No more cars available. Would you like to change your criteria?",
          options: ["Change criteria"]
        };
      }

      const car = cars[currentIndex];
      const carInfo = `🚗 ${car.brand} ${car.model} ${car.variant}\n📅 Year: ${car.year}\n⛽ Fuel: ${car.fuel_type}\n💰 Price: ₹${parseInt(car.price).toLocaleString('en-IN')}`;

      return {
        message: carInfo,
        options: ["SELECT", "See more cars", "Change criteria"]
      };
    } else if (userMessage === "Change criteria") {
      sessionManager.resetForNewSearch();
      return {
        message: "What's your budget range?",
        options: ["Under ₹5 Lakhs", "₹5-10 Lakhs", "₹10-15 Lakhs", "₹15-20 Lakhs", "Above ₹20 Lakhs"],
        nextStep: 'browse_budget'
      };
    }
  }

  async handleTestDriveDate(userMessage) {
    const dateOptions = ["Today", "Tomorrow", "Later this Week", "Next Week"];
    
    if (!dateOptions.includes(userMessage)) {
      return {
        message: "Please select a valid date option:",
        options: dateOptions
      };
    }

    sessionManager.updateTestDrive('date', userMessage);
    return {
      message: "Perfect! Which time works better for you?",
      options: ["Morning (10-12 PM)", "Afternoon (12-4 PM)", "Evening (4-7 PM)"],
      nextStep: 'test_drive_time'
    };
  }

  async handleTestDriveTime(userMessage) {
    const timeOptions = ["Morning (10-12 PM)", "Afternoon (12-4 PM)", "Evening (4-7 PM)"];
    
    if (!timeOptions.includes(userMessage)) {
      return {
        message: "Please select a valid time option:",
        options: timeOptions
      };
    }

    sessionManager.updateTestDrive('time', userMessage);
    return {
      message: "Great! I need some details to confirm your booking:\n\n1. Your Name:",
      nextStep: 'td_name'
    };
  }

  async handleName(userMessage) {
    if (!userMessage || userMessage.length < 2) {
      return {
        message: "Please enter a valid name (at least 2 characters):"
      };
    }

    sessionManager.updateTestDrive('name', userMessage);
    sessionManager.updateUserProfile('name', userMessage);
    return {
      message: "2. Your Phone Number (10 digits only):",
      nextStep: 'td_phone'
    };
  }

  async handlePhone(userMessage) {
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(userMessage)) {
      return {
        message: "Please enter a valid 10-digit phone number:"
      };
    }

    sessionManager.updateTestDrive('phone', userMessage);
    sessionManager.updateUserProfile('phone', userMessage);
    return {
      message: "3. Do you have a valid driving license?",
      options: ["Yes", "No"],
      nextStep: 'td_license'
    };
  }

  async handleLicense(userMessage) {
    if (!["Yes", "No"].includes(userMessage)) {
      return {
        message: "Please select Yes or No:",
        options: ["Yes", "No"]
      };
    }

    sessionManager.updateTestDrive('license', userMessage);
    return {
      message: `Thank you ${sessionManager.getSession().testDrive.name}! Your details are noted. Where would you like to take the test drive?`,
      options: ["Showroom pickup", "Home pickup"],
      nextStep: 'td_location_mode'
    };
  }

  async handleLocation(userMessage) {
    const locationOptions = ["Showroom pickup", "Home pickup"];
    
    if (!locationOptions.includes(userMessage)) {
      return {
        message: "Please select a valid location option:",
        options: locationOptions
      };
    }

    sessionManager.updateTestDrive('location', userMessage);
    
    if (userMessage === "Home pickup") {
      return {
        message: "Please share your current address for the test drive:",
        nextStep: 'td_home_address'
      };
    } else {
      return await this.handleConfirmation();
    }
  }

  async handleConfirmation() {
    const session = sessionManager.getSession();
    const { testDrive } = session;
    
    const confirmationMessage = `Perfect! Here's your test drive confirmation:

📋 TEST DRIVE CONFIRMED:
👤 Name: ${testDrive.name}
📱 Phone: ${testDrive.phone}
🚗 Car: ${testDrive.selectedCar}
📅 Date: ${testDrive.date}
⏰ Time: ${testDrive.time}
📍 Location: ${testDrive.location}

📍 Showroom Address: Sherpa Hyundai Showroom, 123 MG Road, Bangalore
🅿️ Free parking available

What to bring:
✅ Valid driving license
✅ Any photo ID

📞 Need help? Call us: +91-9876543210

Looking forward to seeing you! 😊`;

    return {
      message: confirmationMessage,
      options: ["Confirm", "Reject"],
      nextStep: 'test_drive_confirmation'
    };
  }
}

// Export singleton instance
const flowController = new FlowController();
module.exports = flowController;
