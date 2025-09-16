const { parseUserIntent } = require('./geminiHandler');
const pool = require('../db');

/**
 * Modular LLM Utilities for all flows
 * This module provides reusable LLM functions that can be used across different flows
 * without causing conflicts or dependencies between flows.
 */

/**
 * Check if a user message is unrelated to car dealership topics
 * @param {string} userMessage - The user's message to check
 * @param {string} flowContext - The current flow context (e.g., 'browse_used_cars', 'car_valuation', 'contact_us')
 * @returns {Promise<Object>} - { isUnrelated: boolean, confidence: number, topic: string, redirectMessage: string }
 */
async function checkUnrelatedTopic(userMessage, flowContext = 'general') {
  try {
    console.log(`🔍 Checking unrelated topic for flow: ${flowContext}`);
    
    // Try LLM-based detection first
    const response = await parseUserIntent(pool, userMessage);
    
    if (response && typeof response.is_unrelated === 'boolean') {
      const result = {
        isUnrelated: response.is_unrelated,
        confidence: response.confidence || 0,
        topic: response.topic || 'classified',
        redirectMessage: getRedirectMessage(flowContext)
      };
      
      console.log(`✅ LLM unrelated detection: ${result.isUnrelated} (confidence: ${result.confidence})`);
      return result;
    }
    
    // LLM failed to detect unrelated topics, assume related
    console.log('⚠️ LLM detection failed, assuming topic is related');
    return { 
      isUnrelated: false, 
      confidence: 0.5, 
      topic: 'assumed_related',
      redirectMessage: getRedirectMessage(flowContext)
    };
    
  } catch (error) {
    console.log('❌ LLM unrelated detection error:', error.message);
    // LLM failed, assume topic is related
    return { 
      isUnrelated: false, 
      confidence: 0.5, 
      topic: 'error',
      redirectMessage: getRedirectMessage(flowContext)
    };
  }
}


/**
 * Get appropriate redirect message based on flow context
 * @param {string} flowContext - The current flow context
 * @returns {string} - Redirect message
 */
function getRedirectMessage(flowContext) {
  const redirectMessages = {
    'browse_used_cars': "I'm here to help you find your perfect car! Let me know if you'd like to browse used cars, get a car valuation, or contact our team.",
    'car_valuation': "I'm here to help you with car valuations! Let me know if you'd like to get your car valued, browse used cars, or contact our team.",
    'contact_us': "I'm here to help you contact our team! Let me know if you'd like to get in touch, browse used cars, or get a car valuation.",
    'about_us': "I'm here to tell you about our services! Let me know if you'd like to learn more, browse used cars, or contact our team.",
    'general': "I'm here to help you with cars! Let me know if you'd like to browse used cars, get a car valuation, or contact our team."
  };
  
  return redirectMessages[flowContext] || redirectMessages['general'];
}

/**
 * Validate if user input matches expected type for a specific step
 * @param {string} userMessage - The user's input
 * @param {string} expectedType - The expected input type (name, phone, date, time, address, yes_no, option_match)
 * @param {Object} context - Additional context (availableOptions, stepName, flowContext)
 * @returns {Promise<Object>} - { isValid: boolean, confidence: number, message: string }
 */
async function validateStepInput(userMessage, expectedType, context = {}) {
  try {
    console.log(`🔍 Validating ${expectedType} input for step: ${context.stepName || 'unknown'}`);
    
    // Basic validation rules
    const validationRules = {
      name: (msg) => msg.trim().length >= 2 && msg.trim().length <= 50,
      phone: (msg) => {
        const digits = msg.replace(/\D/g, '');
        return digits.length === 10;
      },
      date: (msg) => {
        const dateKeywords = ['today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        return dateKeywords.some(keyword => msg.toLowerCase().includes(keyword)) || /\d{1,2}\/\d{1,2}/.test(msg);
      },
      time: (msg) => {
        const timeKeywords = ['morning', 'afternoon', 'evening', 'am', 'pm'];
        return timeKeywords.some(keyword => msg.toLowerCase().includes(keyword)) || /\d{1,2}:\d{2}/.test(msg);
      },
      address: (msg) => msg.trim().length >= 10,
      yes_no: (msg) => ['yes', 'no', 'y', 'n'].includes(msg.toLowerCase().trim()),
      option_match: (msg) => context.availableOptions ? context.availableOptions.includes(msg) : false
    };
    
    const rule = validationRules[expectedType];
    if (!rule) {
      return { isValid: false, confidence: 0, message: `Unknown validation type: ${expectedType}` };
    }
    
    const isValid = rule(userMessage);
    const confidence = isValid ? 0.9 : 0.1;
    
    console.log(`✅ Validation result: ${isValid} (confidence: ${confidence})`);
    return { isValid, confidence, message: isValid ? 'Valid input' : getValidationErrorMessage(expectedType) };
    
  } catch (error) {
    console.log('❌ Validation error:', error.message);
    return { isValid: false, confidence: 0, message: 'Validation failed' };
  }
}

/**
 * Get validation error message for different input types
 * @param {string} expectedType - The expected input type
 * @returns {string} - Error message
 */
function getValidationErrorMessage(expectedType) {
  const errorMessages = {
    name: 'Please provide your name',
    phone: 'Please provide a valid 10-digit phone number',
    date: 'Please provide a valid date',
    time: 'Please provide a valid time',
    address: 'Please provide a complete address',
    yes_no: 'Please answer with Yes or No',
    option_match: 'Please select one of the available options'
  };
  
  return errorMessages[expectedType] || 'Please provide valid input';
}

/**
 * Validate if user's typed input matches any of the available options
 * @param {string} userMessage - The user's typed input
 * @param {Array} availableOptions - Array of available options
 * @param {Object} context - Additional context (stepName, flowContext)
 * @returns {Promise<Object>} - { isValid: boolean, confidence: number, matchedOption: string, message: string }
 */
async function validateOptionInput(userMessage, availableOptions, context = {}) {
  try {
    console.log(`🔍 Validating option input for step: ${context.stepName || 'unknown'}`);
    
    // Direct match first
    if (availableOptions.includes(userMessage)) {
      return {
        isValid: true,
        confidence: 1.0,
        matchedOption: userMessage,
        message: 'Exact match found'
      };
    }
    
    // Try LLM-based matching for typed input
    try {
      const response = await parseUserIntent(pool, userMessage);
      
      if (response && response.matched_option) {
        return {
          isValid: true,
          confidence: response.confidence || 0.7,
          matchedOption: response.matched_option,
          message: 'LLM matched option'
        };
      }
    } catch (error) {
      console.log('⚠️ LLM option matching failed');
    }
    
    // No match found
    return {
      isValid: false,
      confidence: 0.1,
      matchedOption: null,
      message: 'No matching option found'
    };
    
  } catch (error) {
    console.log('❌ Option validation error:', error.message);
    return {
      isValid: false,
      confidence: 0.1,
      matchedOption: null,
      message: 'Option validation failed'
    };
  }
}

/**
 * Parse date/time input using LLM
 * @param {string} userMessage - The user's date/time input
 * @param {string} flowContext - The current flow context
 * @returns {Promise<Object>} - { isValid: boolean, parsedDate: string, parsedTime: string, confidence: number }
 */
async function parseDateTimeInput(userMessage, flowContext = 'general') {
  try {
    console.log(`🔍 Parsing date/time input for flow: ${flowContext}`);
    
    const response = await parseUserIntent(pool, userMessage);
    
    if (response && response.date) {
      return {
        isValid: true,
        parsedDate: response.date,
        parsedTime: response.time || null,
        confidence: response.confidence || 0.8
      };
    }
    
    return {
      isValid: false,
      parsedDate: null,
      parsedTime: null,
      confidence: 0.1
    };
    
  } catch (error) {
    console.log('❌ Date/time parsing error:', error.message);
    return {
      isValid: false,
      parsedDate: null,
      parsedTime: null,
      confidence: 0.1
    };
  }
}


module.exports = {
  checkUnrelatedTopic,
  validateStepInput,
  validateOptionInput,
  parseDateTimeInput,
  getRedirectMessage
};
