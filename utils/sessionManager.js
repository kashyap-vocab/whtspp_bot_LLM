const pool = require('../db');

// Session structure that tracks user progress through the car browsing flow
class SessionManager {
  constructor() {
    this.session = {
      // Flow tracking
      currentStep: null,
      flowType: null, // 'browse', 'valuation', 'contact', 'about'
      
      // User preferences (collected through flow)
      preferences: {
        budget: null,
        carType: null,
        brand: null,
        year: null,
        fuel: null
      },
      
      // User choices (what they actually selected)
      userChoices: {
        budget: null,
        carType: null,
        brand: null
      },
      
      // Car search results
      searchResults: {
        filteredCars: [],
        currentIndex: 0,
        totalCars: 0,
        selectedCar: null
      },
      
      // Test drive details
      testDrive: {
        selectedCar: null,
        date: null,
        time: null,
        name: null,
        phone: null,
        license: null,
        location: null,
        address: null
      },
      
      // User profile (for reuse)
      userProfile: {
        name: null,
        phone: null,
        email: null,
        location: null
      },
      
      // Flow state
      flowState: {
        isInProgress: false,
        canSkipSteps: false,
        aiSuggestionsApplied: false,
        needsHumanAssistance: false
      },
      
      // Metadata
      metadata: {
        sessionStart: null,
        lastActivity: null,
        totalMessages: 0,
        conversationEnded: false
      }
    };
  }

  // Initialize session for new conversation
  initializeSession(flowType = 'browse') {
    this.session = {
      currentStep: 'start',
      flowType: flowType,
      preferences: { budget: null, carType: null, brand: null, year: null, fuel: null },
      userChoices: { budget: null, carType: null, brand: null },
      searchResults: { filteredCars: [], currentIndex: 0, totalCars: 0, selectedCar: null },
      testDrive: { selectedCar: null, date: null, time: null, name: null, phone: null, license: null, location: null, address: null },
      userProfile: { name: null, phone: null, email: null, location: null },
      flowState: { isInProgress: true, canSkipSteps: false, aiSuggestionsApplied: false, needsHumanAssistance: false },
      metadata: { sessionStart: new Date().toISOString(), lastActivity: new Date().toISOString(), totalMessages: 0, conversationEnded: false }
    };
    return this.session;
  }

  // Update session with AI parsed entities
  updateWithAIEntities(entities) {
    if (entities.budget) {
      this.session.preferences.budget = entities.budget;
      this.session.userChoices.budget = entities.budget;
    }
    if (entities.type) {
      this.session.preferences.carType = entities.type;
      this.session.userChoices.carType = entities.type;
    }
    if (entities.brand) {
      this.session.preferences.brand = entities.brand;
      this.session.userChoices.brand = entities.brand;
    }
    if (entities.year) {
      this.session.preferences.year = entities.year;
    }
    if (entities.fuel) {
      this.session.preferences.fuel = entities.fuel;
    }
    
    this.session.flowState.aiSuggestionsApplied = true;
    this.updateLastActivity();
    return this.session;
  }

  // Update current step in flow
  updateStep(step) {
    this.session.currentStep = step;
    this.updateLastActivity();
    return this.session;
  }

  // Update user choice (when they manually select something)
  updateUserChoice(type, value) {
    this.session.userChoices[type] = value;
    this.session.preferences[type] = value;
    this.updateLastActivity();
    return this.session;
  }

  // Update search results
  updateSearchResults(cars) {
    this.session.searchResults.filteredCars = cars;
    this.session.searchResults.totalCars = cars.length;
    this.session.searchResults.currentIndex = 0;
    this.updateLastActivity();
    return this.session;
  }

  // Select a car
  selectCar(car) {
    this.session.searchResults.selectedCar = car;
    this.session.testDrive.selectedCar = `${car.brand} ${car.model} ${car.variant}`;
    this.updateLastActivity();
    return this.session;
  }

  // Update test drive details
  updateTestDrive(field, value) {
    this.session.testDrive[field] = value;
    this.updateLastActivity();
    return this.session;
  }

  // Update user profile
  updateUserProfile(field, value) {
    this.session.userProfile[field] = value;
    this.updateLastActivity();
    return this.session;
  }

  // Check if we can skip steps based on current data
  canSkipToStep(targetStep) {
    const { preferences, userChoices } = this.session;
    
    switch (targetStep) {
      case 'browse_budget':
        return false; // Always need budget
      case 'browse_type':
        return preferences.budget !== null;
      case 'browse_brand':
        return preferences.budget !== null && preferences.carType !== null;
      case 'show_cars':
        return preferences.budget !== null && preferences.carType !== null && preferences.brand !== null;
      case 'test_drive':
        return this.session.searchResults.selectedCar !== null;
      default:
        return false;
    }
  }

  // Get next step in flow
  getNextStep() {
    const { preferences } = this.session;
    
    if (!preferences.budget) return 'browse_budget';
    if (!preferences.carType) return 'browse_type';
    if (!preferences.brand) return 'browse_brand';
    if (this.session.searchResults.filteredCars.length === 0) return 'show_cars';
    if (!this.session.searchResults.selectedCar) return 'show_cars';
    if (!this.session.testDrive.date) return 'test_drive_date';
    if (!this.session.testDrive.time) return 'test_drive_time';
    if (!this.session.testDrive.name) return 'td_name';
    if (!this.session.testDrive.phone) return 'td_phone';
    if (!this.session.testDrive.license) return 'td_license';
    if (!this.session.testDrive.location) return 'td_location_mode';
    
    return 'test_drive_confirmation';
  }

  // Reset for new car search
  resetForNewSearch() {
    this.session.preferences = { budget: null, carType: null, brand: null, year: null, fuel: null };
    this.session.userChoices = { budget: null, carType: null, brand: null };
    this.session.searchResults = { filteredCars: [], currentIndex: 0, totalCars: 0, selectedCar: null };
    this.session.testDrive = { selectedCar: null, date: null, time: null, name: null, phone: null, license: null, location: null, address: null };
    this.session.currentStep = 'browse_budget';
    this.session.flowState.isInProgress = true;
    this.updateLastActivity();
    return this.session;
  }

  // Get session summary for debugging
  getSessionSummary() {
    return {
      currentStep: this.session.currentStep,
      flowType: this.session.flowType,
      preferences: this.session.preferences,
      userChoices: this.session.userChoices,
      searchResults: {
        totalCars: this.session.searchResults.totalCars,
        selectedCar: this.session.searchResults.selectedCar
      },
      testDrive: {
        selectedCar: this.session.testDrive.selectedCar,
        date: this.session.testDrive.date,
        time: this.session.testDrive.time,
        name: this.session.testDrive.name,
        phone: this.session.testDrive.phone
      },
      flowState: this.session.flowState,
      metadata: {
        sessionStart: this.session.metadata.sessionStart,
        lastActivity: this.session.metadata.lastActivity,
        totalMessages: this.session.metadata.totalMessages
      }
    };
  }

  // Update last activity timestamp
  updateLastActivity() {
    this.session.metadata.lastActivity = new Date().toISOString();
    this.session.metadata.totalMessages++;
  }

  // End conversation
  endConversation() {
    this.session.metadata.conversationEnded = true;
    this.session.flowState.isInProgress = false;
    this.updateLastActivity();
    return this.session;
  }

  // Get current session
  getSession() {
    return this.session;
  }

  // Set session (for loading from external source)
  setSession(sessionData) {
    this.session = { ...this.session, ...sessionData };
    return this.session;
  }
}

// Export singleton instance
const sessionManager = new SessionManager();
module.exports = sessionManager;
