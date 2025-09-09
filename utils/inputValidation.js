/**
 * Input validation helper functions for all conversation flows
 */

/**
 * Validates if user input matches any of the provided options
 * @param {string} userInput - The user's input
 * @param {Array} validOptions - Array of valid options
 * @param {boolean} caseSensitive - Whether to do case-sensitive matching
 * @returns {Object} - { isValid: boolean, matchedOption: string|null, suggestions: Array }
 */
function validateOption(userInput, validOptions, caseSensitive = false) {
  const input = caseSensitive ? userInput : userInput.toLowerCase();
  const options = caseSensitive ? validOptions : validOptions.map(opt => opt.toLowerCase());
  
  // Exact match
  const exactMatch = validOptions.find(option => 
    (caseSensitive ? option : option.toLowerCase()) === input
  );
  
  if (exactMatch) {
    return {
      isValid: true,
      matchedOption: exactMatch,
      suggestions: []
    };
  }
  
  // Partial match (contains)
  const partialMatches = validOptions.filter(option => 
    (caseSensitive ? option : option.toLowerCase()).includes(input)
  );
  
  // Fuzzy match (starts with)
  const fuzzyMatches = validOptions.filter(option => 
    (caseSensitive ? option : option.toLowerCase()).startsWith(input)
  );
  
  // Combine and deduplicate suggestions
  const suggestions = [...new Set([...fuzzyMatches, ...partialMatches])].slice(0, 3);
  
  return {
    isValid: false,
    matchedOption: null,
    suggestions: suggestions
  };
}

/**
 * Validates budget selection
 * @param {string} userInput - User's budget input
 * @returns {Object} - Validation result
 */
function validateBudget(userInput) {
  const validBudgets = [
    "Under ₹5 Lakhs",
    "₹5-10 Lakhs", 
    "₹10-15 Lakhs",
    "₹15-20 Lakhs",
    "Above ₹20 Lakhs"
  ];
  
  return validateOption(userInput, validBudgets);
}

/**
 * Validates car type selection
 * @param {string} userInput - User's type input
 * @returns {Object} - Validation result
 */
function validateCarType(userInput) {
  const validTypes = [
    "all Type",
    "Hatchback",
    "Sedan", 
    "SUV",
    "MUV"
  ];
  
  return validateOption(userInput, validTypes);
}

/**
 * Validates brand selection against available brands
 * @param {string} userInput - User's brand input
 * @param {Array} availableBrands - Array of available brands from database
 * @returns {Object} - Validation result
 */
function validateBrand(userInput, availableBrands) {
  const validBrands = ["all Brand", ...availableBrands];
  return validateOption(userInput, validBrands);
}

/**
 * Validates year selection
 * @param {string} userInput - User's year input
 * @returns {Object} - Validation result
 */
function validateYear(userInput) {
  const validYears = [
    "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015",
    "2014", "2013", "2012", "2011", "2010", "2009", "2008", "2007", "2006", "2005",
    "2004", "2003", "2002", "2001", "2000", "Before 2000"
  ];
  
  return validateOption(userInput, validYears);
}

/**
 * Validates fuel type selection
 * @param {string} userInput - User's fuel input
 * @returns {Object} - Validation result
 */
function validateFuelType(userInput) {
  const validFuels = [
    "Petrol",
    "Diesel", 
    "Electric",
    "Hybrid",
    "CNG",
    "LPG"
  ];
  
  return validateOption(userInput, validFuels);
}

/**
 * Validates transmission selection
 * @param {string} userInput - User's transmission input
 * @returns {Object} - Validation result
 */
function validateTransmission(userInput) {
  const validTransmissions = [
    "Manual",
    "Automatic",
    "CVT",
    "AMT"
  ];
  
  return validateOption(userInput, validTransmissions);
}

/**
 * Validates condition selection
 * @param {string} userInput - User's condition input
 * @returns {Object} - Validation result
 */
function validateCondition(userInput) {
  const validConditions = [
    "Excellent (Like new)",
    " Good (Minor wear)",
    "Average (Some issues)",
    " Fair (Needs some work)"
  ];
  
  return validateOption(userInput, validConditions);
}

/**
 * Validates phone number format
 * @param {string} userInput - User's phone input
 * @returns {Object} - Validation result
 */
function validatePhoneNumber(userInput) {
  // Remove all non-digit characters
  const cleanPhone = userInput.replace(/\D/g, '');
  
  // Check if it's a valid Indian phone number (10 digits)
  const isValid = /^[6-9]\d{9}$/.test(cleanPhone);
  
  return {
    isValid: isValid,
    matchedOption: isValid ? cleanPhone : null,
    suggestions: isValid ? [] : ["Please enter a valid 10-digit Indian phone number"]
  };
}

/**
 * Validates name input
 * @param {string} userInput - User's name input
 * @returns {Object} - Validation result
 */
function validateName(userInput) {
  // Check if name contains only letters, spaces, and common name characters
  const isValid = /^[a-zA-Z\s\.\-']{2,50}$/.test(userInput.trim());
  
  return {
    isValid: isValid,
    matchedOption: isValid ? userInput.trim() : null,
    suggestions: isValid ? [] : ["Please enter a valid name (2-50 characters, letters only)"]
  };
}

/**
 * Creates a validation error message with suggestions
 * @param {string} fieldName - Name of the field being validated
 * @param {Array} suggestions - Array of suggested options
 * @param {Array} originalOptions - Original options array
 * @returns {string} - Formatted error message
 */
function createValidationErrorMessage(fieldName, suggestions, originalOptions) {
  let message = `I didn't recognize that ${fieldName}. `;
  
  if (suggestions.length > 0) {
    message += `Did you mean one of these?\n\n`;
    suggestions.forEach((suggestion, index) => {
      message += `${index + 1}. ${suggestion}\n`;
    });
    message += `\nPlease select from the options above or type the exact text.`;
  } else {
    message += `Please select from the available options:\n\n`;
    originalOptions.forEach((option, index) => {
      message += `${index + 1}. ${option}\n`;
    });
  }
  
  return message;
}

module.exports = {
  validateOption,
  validateBudget,
  validateCarType,
  validateBrand,
  validateYear,
  validateFuelType,
  validateTransmission,
  validateCondition,
  validatePhoneNumber,
  validateName,
  createValidationErrorMessage
};
