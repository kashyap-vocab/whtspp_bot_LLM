// Fallback AI parsing using OpenAI's free tier or local processing
const axios = require('axios');

// Advanced fallback parsing with typo handling (based on geminiHandler.js patterns)
function fallbackParseUserIntent(userMessage) {
  console.log('🔄 Using fallback AI parsing with typo handling...');
  
  const lowerMsg = userMessage.toLowerCase();
  const entities = {};
  
  // Budget extraction with typo handling
  const budgetPatterns = [
    /(\d+)\s*(?:lakhs?|lkhsa?|lacs?|lkahs?)/i,
    /under\s*(\d+)/i,
    /below\s*(\d+)/i,
    /upto?\s*(\d+)/i,
    /maximum?\s*(\d+)/i
  ];
  
  for (const pattern of budgetPatterns) {
    const match = lowerMsg.match(pattern);
    if (match) {
      const amount = parseInt(match[1]);
      // Map to nearest bracket BELOW user's maximum amount
      if (amount <= 5) entities.budget = "Under ₹5 Lakhs";
      else if (amount <= 10) entities.budget = "₹5-10 Lakhs";
      else if (amount <= 15) entities.budget = "₹10-15 Lakhs";
      else if (amount <= 20) entities.budget = "₹15-20 Lakhs";
      else entities.budget = "Above ₹20 Lakhs";
      break;
    }
  }
  
  // Brand extraction with typo handling
  const brandMappings = {
    // Handle typos and variations
    'maruthi': 'Maruti',
    'maruti': 'Maruti',
    'suzuki': 'Maruti',
    'hyundai': 'Hyundai',
    'hyunday': 'Hyundai',
    'toyota': 'Toyota',
    'toyoto': 'Toyota', // Handle the typo from the message
    'toyata': 'Toyota',
    'honda': 'Honda',
    'handa': 'Honda',
    'kia': 'Kia',
    'tata': 'Tata',
    'mahindra': 'Mahindra',
    'mahendra': 'Mahindra',
    'volkswagen': 'Volkswagen',
    'vw': 'Volkswagen',
    'volks': 'Volkswagen'
  };
  
  for (const [variant, brand] of Object.entries(brandMappings)) {
    if (lowerMsg.includes(variant)) {
      entities.brand = brand;
      break;
    }
  }
  
  // Type extraction with variations
  const typePatterns = {
    'hatchback': ['hatchback', 'hatch', 'small car'],
    'sedan': ['sedan', 'saloon'],
    'suv': ['suv', 'sport utility', 'utility vehicle'],
    'muv': ['muv', 'multi utility', 'innova', 'ertiga'], // innova is typically MUV
    'luxury': ['luxury', 'premium']
  };
  
  for (const [type, patterns] of Object.entries(typePatterns)) {
    for (const pattern of patterns) {
      if (lowerMsg.includes(pattern)) {
        entities.type = type.charAt(0).toUpperCase() + type.slice(1);
        // Special case: if innova is mentioned, it's MUV not sedan
        if (pattern === 'innova') {
          entities.type = 'MUV';
        }
        break;
      }
    }
    if (entities.type) break;
  }
  
  // Model extraction for better context
  const commonModels = ['innova', 'city', 'swift', 'i10', 'creta', 'venue', 'verna', 'amaze'];
  for (const model of commonModels) {
    if (lowerMsg.includes(model)) {
      entities.model = model.charAt(0).toUpperCase() + model.slice(1);
      
      // Auto-correct type based on model
      if (model === 'innova') {
        entities.type = 'MUV';
        if (!entities.brand) entities.brand = 'Toyota';
      } else if (['city', 'verna', 'amaze'].includes(model)) {
        entities.type = 'Sedan';
      } else if (['swift', 'i10'].includes(model)) {
        entities.type = 'Hatchback';
      } else if (['creta', 'venue'].includes(model)) {
        entities.type = 'SUV';
      }
      break;
    }
  }
  
  // Intent classification
  let intent = 'null';
  const browseKeywords = ['want', 'buy', 'looking', 'show', 'need', 'search', 'find'];
  const valuationKeywords = ['sell', 'valuation', 'my car', 'price', 'value'];
  const contactKeywords = ['contact', 'call', 'help', 'talk', 'speak'];
  
  if (browseKeywords.some(keyword => lowerMsg.includes(keyword))) {
    intent = 'browse';
  } else if (valuationKeywords.some(keyword => lowerMsg.includes(keyword))) {
    intent = 'valuation';
  } else if (contactKeywords.some(keyword => lowerMsg.includes(keyword))) {
    intent = 'contact';
  }
  
  const result = {
    intent,
    entities,
    confidence: Object.keys(entities).length > 0 ? 0.8 : 0.3,
    notes: ['fallback_parsing', 'typo_handling']
  };
  
  console.log('🔄 Fallback parsing result:', result);
  return result;
}

module.exports = { fallbackParseUserIntent };
