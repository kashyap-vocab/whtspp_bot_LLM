/**
 * Input validation helper functions for all conversation flows
 */

// Levenshtein distance for fuzzy matching
function levenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

/**
 * Validates if user input matches any of the provided options with enhanced spelling correction
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
  
  // Enhanced spelling correction using Levenshtein distance
  const spellingMatches = validOptions.filter(option => {
    const normalizedOption = caseSensitive ? option : option.toLowerCase();
    const distance = levenshteinDistance(input, normalizedOption);
    // Allow matches with distance <= 2 for short words, <= 3 for longer words
    const maxDistance = input.length <= 5 ? 2 : 3;
    return distance <= maxDistance && distance > 0;
  });
  
  // Sort spelling matches by distance (closest first)
  const sortedSpellingMatches = spellingMatches.sort((a, b) => {
    const distanceA = levenshteinDistance(input, caseSensitive ? a : a.toLowerCase());
    const distanceB = levenshteinDistance(input, caseSensitive ? b : b.toLowerCase());
    return distanceA - distanceB;
  });
  
  // Combine and deduplicate suggestions, prioritizing exact matches
  const allSuggestions = [...new Set([...fuzzyMatches, ...partialMatches, ...sortedSpellingMatches])];
  const suggestions = allSuggestions.slice(0, 3);
  
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
  
  // Handle special keywords that should not be validated as car types
  const specialKeywords = ['start over', 'continue', 'change', 'back', 'help', 'menu'];
  if (specialKeywords.includes(userInput.toLowerCase())) {
    return {
      isValid: false,
      matchedOption: null,
      suggestions: [],
      reason: 'special_keyword'
    };
  }
  
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
    "2024", "2023", "2022", "2021", "2020", "Older than 2020"
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
    "Good (Minor wear)",
    "Average (Some issues)",
    "Fair (Needs some work)"
  ];
  
  return validateOption(userInput, validConditions);
}

/**
 * Validates phone number format - exactly 10 digits, numbers only
 * @param {string} userInput - User's phone input
 * @returns {Object} - Validation result
 */
function validatePhoneNumber(userInput) {
  const trimmedInput = userInput.trim();
  
  // Check if input contains only digits
  const isOnlyDigits = /^\d+$/.test(trimmedInput);
  
  if (!isOnlyDigits) {
    return {
      isValid: false,
      matchedOption: null,
      suggestions: ["Please enter only numbers (no spaces, dashes, or other characters)"]
    };
  }
  
  // Check if it's exactly 10 digits
  const isExactly10Digits = trimmedInput.length === 10;
  
  if (!isExactly10Digits) {
    return {
      isValid: false,
      matchedOption: null,
      suggestions: [`Please enter exactly 10 digits (you entered ${trimmedInput.length} digits)`]
    };
  }
  
  // Check if it's a valid Indian phone number (starts with 6-9)
  const isValidIndianNumber = /^[6-9]\d{9}$/.test(trimmedInput);
  
  if (!isValidIndianNumber) {
    return {
      isValid: false,
      matchedOption: null,
      suggestions: ["Please enter a valid Indian phone number (should start with 6, 7, 8, or 9)"]
    };
  }
  
  return {
    isValid: true,
    matchedOption: trimmedInput,
    suggestions: []
  };
}

/**
 * Validates name input - only alphabets allowed
 * @param {string} userInput - User's name input
 * @returns {Object} - Validation result
 */
function validateName(userInput) {
  const trimmedInput = userInput.trim();
  
  // Check if name contains only letters and spaces (alphabets only)
  const isValid = /^[a-zA-Z\s]{2,50}$/.test(trimmedInput);
  
  // Additional check: must contain at least one letter
  const hasLetters = /[a-zA-Z]/.test(trimmedInput);
  
  const finalValid = isValid && hasLetters;
  
  return {
    isValid: finalValid,
    matchedOption: finalValid ? trimmedInput : null,
    suggestions: finalValid ? [] : ["Please enter a valid name using only alphabets (letters) and spaces (2-50 characters)"]
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
