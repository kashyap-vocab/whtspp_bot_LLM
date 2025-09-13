const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getAvailableBrands, getModelsByBrand, getAvailableTypes } = require('./carData');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Context for the AI to understand the car dealership bot's purpose
const SYSTEM_CONTEXT = `You are a helpful car dealership assistant for Sherpa Hyundai. Your role is to:
1. Help customers with car-related queries (browsing used cars, valuations, contact info, about us)
2. Provide intelligent, helpful responses to any customer message
3. Be friendly, professional, and conversational
4. Guide users to appropriate services based on their needs
5. Handle both car-related and general questions with appropriate responses

Available services:
- 🚗 Browse Used Cars: View our inventory of pre-owned vehicles
- 💰 Get Car Valuation: Get a free estimate for your current car
- 📞 Contact Our Team: Speak with our sales representatives
- ℹ️ About Us: Learn about Sherpa Hyundai

For car-related questions: Provide helpful information and guide to relevant services.
For off-topic questions: Acknowledge politely and redirect to car services.
For unclear messages: Ask clarifying questions and suggest relevant options.`;

async function handleOutOfContextQuestion(userMessage, retryCount = 0) {
  const maxRetries = 2;
  const timeoutMs = 10000; // 10 seconds timeout
  
  try {
    // Check if we have a Gemini API key
    if (!process.env.GEMINI_API_KEY) {
      console.log("⚠️ No Gemini API key found, using fallback response");
      return getFallbackResponse(userMessage);
    }

    // Validate API key format
    if (!process.env.GEMINI_API_KEY.startsWith('AIza')) {
      console.log("⚠️ Invalid Gemini API key format, using fallback response");
      return getFallbackResponse(userMessage);
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.7,
      }
    });

    const prompt = `${SYSTEM_CONTEXT}

User message: "${userMessage}"

Please provide a helpful, intelligent response that:
1. Acknowledges their message appropriately
2. If car-related: Provide helpful information and guide to relevant services
3. If off-topic: Politely redirect to car services while being understanding
4. If unclear: Ask clarifying questions and suggest relevant options
5. Always be friendly, professional, and conversational
6. Keep response under 200 words
7. End with suggesting relevant menu options

Response:`;

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Gemini API timeout')), timeoutMs);
    });

    const apiPromise = model.generateContent(prompt);
    
    const result = await Promise.race([apiPromise, timeoutPromise]);
    const response = await result.response;
    const text = response.text();
    
    // Validate response
    if (!text || text.trim().length === 0) {
      throw new Error('Empty response from Gemini API');
    }
    
    console.log("🤖 Gemini response:", text);
    return text;

  } catch (error) {
    console.error("❌ Error calling Gemini API:", error.message);
    
    // Handle specific error types
    if (error.message.includes('timeout')) {
      console.log("⏰ Gemini API timeout, retrying...");
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return handleOutOfContextQuestion(userMessage, retryCount + 1);
      }
    } else if (error.message.includes('quota') || error.message.includes('limit')) {
      console.log("📊 Gemini API quota exceeded, using fallback");
    } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      console.log("🔐 Gemini API permission denied, using fallback");
    } else if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
      console.log("🌐 Gemini API network error, using fallback");
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return handleOutOfContextQuestion(userMessage, retryCount + 1);
      }
    } else if (error.message.includes('Empty response')) {
      console.log("📭 Empty response from Gemini API, using fallback");
    }
    
    return getFallbackResponse(userMessage);
  }
}

function getFallbackResponse(userMessage) {
  const lowerMsg = userMessage.toLowerCase();
  
  // Check for common off-topic keywords
  const offTopicKeywords = [
    'cook', 'recipe', 'food', 'biryani', 'weather', 'sports', 'movie', 'music',
    'joke', 'funny', 'game', 'politics', 'news', 'travel', 'hotel', 'restaurant'
  ];
  
  const isOffTopic = offTopicKeywords.some(keyword => lowerMsg.includes(keyword));
  const carKeywords = [
    'car', 'vehicle', 'auto', 'motor', 'drive', 'buy', 'sell', 'price', 'cost',
    'valuation', 'value', 'browse', 'inventory', 'model', 'brand', 'year', 'fuel',
    'diesel', 'petrol', 'hybrid', 'electric', 'km', 'mileage', 'condition', 'owner',
    'contact', 'call', 'phone', 'team', 'sales', 'about', 'info', 'help', 'assist',
    'honda', 'hyundai', 'toyota', 'maruti', 'tata', 'kia', 'mahindra', 'skoda',
    'renault', 'ford', 'chevrolet', 'volkswagen', 'bmw', 'audi', 'mercedes',
    '₹', 'lakhs', 'lakh', 'crore', 'crores', 'budget', 'under', 'above', 'range'
  ];
  const iscarTopic = carKeywords.some(keyword => lowerMsg.includes(keyword));
  
  if (iscarTopic) {
    return `I'm here to help you with car-related services at Sherpa Hyundai! 🚗

How can I assist you today?
🚗 Browse Used Cars
💰 Get Car Valuation
📞 Contact Our Team
ℹ️ About Us`;
    
  }
  return `I understand you're asking about "${userMessage}", but I'm specifically here to help you with car-related services at Sherpa Hyundai! 🚗

I can assist you with:
🚗 Browse our used car inventory
💰 Get a free car valuation
📞 Contact our sales team
ℹ️ Learn more about us

What would you like to explore today?`;
  // For unclear messages, provide a general redirect
  
}

// Function to detect if a message is out of context
function isOutOfContext(message) {
  const lowerMsg = message.toLowerCase();
  
  // Car-related keywords that should NOT trigger out-of-context handling
  const carKeywords = [
    'car', 'vehicle', 'auto', 'motor', 'drive', 'buy', 'sell', 'price', 'cost',
    'valuation', 'value', 'browse', 'inventory', 'model', 'brand', 'year', 'fuel',
    'diesel', 'petrol', 'hybrid', 'electric', 'km', 'mileage', 'condition', 'owner',
    'contact', 'call', 'phone', 'team', 'sales', 'about', 'info', 'help', 'assist',
    'honda', 'hyundai', 'toyota', 'maruti', 'tata', 'kia', 'mahindra', 'skoda',
    'renault', 'ford', 'chevrolet', 'volkswagen', 'bmw', 'audi', 'mercedes',
    '₹', 'lakhs', 'lakh', 'crore', 'crores', 'budget', 'under', 'above', 'range'
  ];
  
  // Off-topic keywords that should trigger out-of-context handling
  const offTopicKeywords = [
    'cook', 'recipe', 'food', 'biryani', 'rice', 'chicken', 'vegetable', 'spice',
    'weather', 'temperature', 'rain', 'sunny', 'cold', 'hot',
    'sports', 'cricket', 'football', 'basketball', 'tennis',
    'movie', 'film', 'cinema', 'actor', 'actress', 'director',
    'music', 'song', 'singer', 'album', 'concert',
    'joke', 'funny', 'humor', 'comedy',
    'game', 'play', 'gaming', 'video game',
    'politics', 'election', 'vote', 'government',
    'news', 'current events', 'headlines',
    'travel', 'vacation', 'trip', 'hotel', 'flight', 'booking',
    'restaurant', 'dining', 'cafe', 'food delivery',
    'shopping', 'clothes', 'fashion', 'shoes',
    'health', 'medical', 'doctor', 'hospital',
    'education', 'school', 'college', 'university', 'study',
    'job', 'work', 'career', 'employment',
    'love', 'relationship', 'dating', 'marriage',
    'religion', 'god', 'prayer', 'temple', 'church',
    'philosophy', 'meaning', 'purpose', 'life'
  ];
  
  // Check if message contains car-related keywords
  const hasCarKeywords = carKeywords.some(keyword => lowerMsg.includes(keyword));
  
  // Check if message contains off-topic keywords
  const hasOffTopicKeywords = offTopicKeywords.some(keyword => lowerMsg.includes(keyword));
  
  // If it has off-topic keywords but no car keywords, it's likely out of context
  if (hasOffTopicKeywords && !hasCarKeywords) {
    return true;
  }
  
  // If it's a very short message (1-2 words) and doesn't contain car keywords, it might be out of context
  // BUT check if it's a valid budget option or other car-related selection first
  if (message.trim().split(' ').length <= 2 && !hasCarKeywords) {
    // Check if it's a budget option (contains ₹ symbol)
    if (message.includes('₹')) {
      return false; // This is a valid budget selection, not out of context
    }
    
    // Check if it's a common car-related selection
    const commonSelections = [
      'under', 'above', 'all', 'type', 'brand', 'model', 'yes', 'no', 'ok', 'okay',
      'select', 'choose', 'next', 'previous', 'more', 'back', 'home', 'menu'
    ];
    
    if (commonSelections.some(selection => lowerMsg.includes(selection))) {
      return false; // This is a valid selection, not out of context
    }
    
    return true;
  }
  
  return false;
}

module.exports = {
  handleOutOfContextQuestion,
  isOutOfContext,
  getFallbackResponse,
  parseUserIntent
};

// New: LLM-powered intent/entity extraction with DB-backed normalization
async function parseUserIntent(pool, userMessage) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.log('🤖 AI disabled or missing GEMINI_API_KEY');
      return { intent: null, entities: {}, confidence: 0 };
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { temperature: 0.2, maxOutputTokens: 256 } });

    // Keep buckets aligned with UI
    const budgetBuckets = [
      'Under ₹5 Lakhs',
      '₹5-10 Lakhs',
      '₹10-15 Lakhs',
      '₹15-20 Lakhs',
      'Above ₹20 Lakhs'
    ];

    const prompt = `Extract user intent and entities for a used-car WhatsApp bot. 
Return ONLY valid JSON with keys: intent (browse|valuation|contact|about|null), entities { brand, model, type, budget, year, fuel }, confidence (0-1).

CRITICAL INTELLIGENCE RULES:
- AUTOMATIC SPELLING CORRECTION: Fix typos intelligently (e.g., "Hondu" → "Honda", "Maruthi" → "Maruti", "seden" → "Sedan", "hatchbak" → "Hatchback")
- MIXED LANGUAGE SUPPORT: Handle Hindi-English mix (e.g., "Mera car bechna hai" = valuation, "Car valuation chahiye" = valuation, "Kya aap help kar sakte hain" = contact)
- NEGATIVE FEEDBACK HANDLING: Classify complaints/negative feedback as "contact" intent (e.g., "Your service is bad", "I don't like your cars", "This is useless")
- MULTIPLE INTENT DETECTION: If user has multiple intents, choose the PRIMARY one and set confidence lower
- GREETING HANDLING: Classify greetings as "contact" intent (e.g., "Good morning", "Hello", "Hi", "Hey" = contact, confidence: 0.8)
- STRICT VALIDATION: Reject invalid data automatically:
  * Years: Reject < 1990 or > 2024 (set year to null, lower confidence)
  * Budgets: Reject < 1 lakh or > 50 lakhs (set budget to null, lower confidence)  
  * Kilometers: Reject < 0 or > 500000 (set to null, lower confidence)
- CONFIDENCE GUIDELINES:
  * High confidence (> 0.8): Clear intent with valid data
  * Medium confidence (0.5-0.8): Clear intent but some invalid data or multiple intents
  * Low confidence (< 0.5): Unclear intent or mostly invalid data

Rules:
- Map budget to one of: ${budgetBuckets.join(', ')} when possible.
- Do not invent brands/models; if unsure leave null.
- Prefer Indian automotive brands/models if mentioned.
- Be conservative; low confidence if ambiguous.
- For browse intent: Extract brand, model, type, budget from natural language

         Budget Interpretation Rules (Choose nearest budget bracket BELOW user's maximum):
         Available buckets: Under ₹5 Lakhs (0-5L), ₹5-10 Lakhs (5-10L), ₹10-15 Lakhs (10-15L), ₹15-20 Lakhs (15-20L), Above ₹20 Lakhs (20L+)
         
         - "in 7 lakhs" = ₹5-10 Lakhs (user wants under 7L, nearest bracket below 7L is ₹5-10L)
         - "in 10 lakhs" = ₹5-10 Lakhs (user wants under 10L, nearest bracket below 10L is ₹5-10L)
         - "under 9 lakhs" = ₹5-10 Lakhs (user wants under 9L, nearest bracket below 9L is ₹5-10L)
         - "around 8 lakhs" = ₹5-10 Lakhs (user wants around 8L, nearest bracket is ₹5-10L)
         - "upto 12 lakhs" = ₹10-15 Lakhs (user wants up to 12L, nearest bracket below 12L is ₹10-15L)
         - "maximum 15 lakhs" = ₹10-15 Lakhs (user wants up to 15L, nearest bracket below 15L is ₹10-15L)
         - "budget is 5 lakhs" = Under ₹5 Lakhs (exact match)
         - "can spend 20 lakhs" = Above ₹20 Lakhs (exact match)
         - "less than 6 lakhs" = Under ₹5 Lakhs (user wants under 6L, nearest bracket below 6L is Under ₹5L)
         - "more than 18 lakhs" = Above ₹20 Lakhs (user wants 18L+, nearest bracket above 18L is Above ₹20L)
         - "within 4 lakhs" = Under ₹5 Lakhs (user wants under 4L, nearest bracket below 4L is Under ₹5L)
         - "not more than 8 lakhs" = ₹5-10 Lakhs (user wants up to 8L, nearest bracket below 8L is ₹5-10L)
         - "between 6-10 lakhs" = ₹5-10 Lakhs (user wants 6-10L, nearest bracket is ₹5-10L)
         - "up to 7 lakhs" = ₹5-10 Lakhs (user wants up to 7L, nearest bracket below 7L is ₹5-10L)
         - "max 11 lakhs" = ₹10-15 Lakhs (user wants up to 11L, nearest bracket below 11L is ₹10-15L)
         - "till 14 lakhs" = ₹10-15 Lakhs (user wants up to 14L, nearest bracket below 14L is ₹10-15L)

Car Type Recognition Patterns:
- "hatch back" = "Hatchback"
- "hatchback" = "Hatchback" 
- "hatch" = "Hatchback"
- "sedan" = "Sedan"
- "suv" = "SUV"
- "muv" = "MUV"
- "luxury" = "Luxury"
- "compact" = "Hatchback"
- "small car" = "Hatchback"
- "big car" = "SUV"

Intent Classification Rules (Use LLM intelligence, not rigid patterns):

VALUATION INTENT - User wants to SELL their car:
- Keywords: sell, valuation, price, worth, value, trade-in, exchange, dispose
- Phrases: "I want to sell", "sell my car", "get valuation", "what's my car worth", "car price", "trade my car", "exchange my car", "dispose my car", "I have a car to sell", "want to sell my", "selling my", "car valuation", "how much is my car worth", "I want to sell a car", "sell a car", "want to sell", "selling a car"
- Context: User mentions their own car details (brand, model, year, fuel) with selling intent
- IMPORTANT: "I want to sell a car" = valuation intent, NOT browse intent

BROWSE INTENT - User wants to BUY a car:
- Keywords: buy, purchase, looking for, need, want, show me, find, search, browse
- Phrases: "I want to buy", "looking for a car", "show me cars", "I need a car", "find me a car", "search for", "browse cars", "want to buy", "purchase a car", "I'm looking for"
- Context: User mentions car preferences (brand, model, type, budget) with buying intent

CONTACT INTENT - User wants to contact/help:
- Keywords: contact, help, support, call, speak, talk, meet, visit, office, address, phone
- Phrases: "contact you", "call me", "speak to someone", "help me", "support", "visit your office", "meet in person", "talk to salesperson"

ABOUT INTENT - User wants information about company:
- Keywords: about, company, information, details, who, what, where, when, why
- Phrases: "about you", "tell me about", "company information", "who are you", "what do you do", "where are you located"

Examples for LLM Learning:

SPELLING CORRECTION EXAMPLES:
- "I want to sell my 2020 Hondu City petrol" = intent: valuation, brand: Honda, model: City, year: 2020, fuel: Petrol
- "Sell my Maruthi Swift 2019 diesel" = intent: valuation, brand: Maruti, model: Swift, year: 2019, fuel: Diesel
- "I need a seden" = type: Sedan, intent: browse
- "Looking for a hatchbak" = type: Hatchback, intent: browse
- "Show me Hondu City under 10 lakhs" = brand: Honda, model: City, budget: ₹5-10 Lakhs, intent: browse

MIXED LANGUAGE EXAMPLES:
- "Mera car bechna hai" = intent: valuation
- "Car valuation chahiye" = intent: valuation
- "Kya aap help kar sakte hain" = intent: contact
- "I want to sell my gadi" = intent: valuation
- "Car ki price kya hai" = intent: valuation

NEGATIVE FEEDBACK EXAMPLES:
- "Your service is bad" = intent: contact, confidence: 0.8
- "I don't like your cars" = intent: contact, confidence: 0.8
- "This is useless" = intent: contact, confidence: 0.8
- "I'm disappointed" = intent: contact, confidence: 0.8
- "Your prices are too high" = intent: contact, confidence: 0.8

STANDARD EXAMPLES:
- "I want to sell a car" = intent: valuation (CRITICAL: This is valuation, NOT browse)
- "I want to sell my 2020 Honda City petrol" = intent: valuation, brand: Honda, model: City, year: 2020, fuel: Petrol
- "Get valuation for Hyundai Creta 2021" = intent: valuation, brand: Hyundai, model: Creta, year: 2021
- "I want to buy Maruti Swift" = brand: Maruti, model: Swift, intent: browse
- "Show me Honda City under 10 lakhs" = brand: Honda, model: City, budget: ₹5-10 Lakhs, intent: browse
- "I need a sedan" = type: Sedan, intent: browse
- "Budget is 5 lakhs" = budget: Under ₹5 Lakhs, intent: browse
- "Contact your team" = intent: contact
- "Tell me about your company" = intent: about

GREETING EXAMPLES:
- "Good morning" = intent: contact, confidence: 0.8
- "Hello" = intent: contact, confidence: 0.8
- "Hi" = intent: contact, confidence: 0.8
- "Hey" = intent: contact, confidence: 0.8
- "Good afternoon" = intent: contact, confidence: 0.8
- "Good evening" = intent: contact, confidence: 0.8

VALIDATION EXAMPLES (should be rejected):
- "Sell my 2025 Honda City" = intent: valuation, brand: Honda, model: City, year: null (invalid year), confidence: 0.3
- "Sell my 1990 Honda City" = intent: valuation, brand: Honda, model: City, year: null (invalid year), confidence: 0.3
- "My car has 1000000 km" = intent: null, confidence: 0.0 (invalid data)
- "Budget is 0 lakhs" = intent: browse, budget: null (invalid budget), confidence: 0.3
- "Budget is 100 lakhs" = intent: browse, budget: null (invalid budget), confidence: 0.3
- "Show me cars in 0 lakhs" = intent: browse, budget: null (invalid budget), confidence: 0.3

User: "${userMessage}"`;

    const result = await model.generateContent(prompt);
    const text = (await result.response).text();
    console.log('🤖 AI raw response:', text);
    let parsed;
    // Clean common code fences and extract JSON
    const cleaned = (() => {
      try {
        let t = text.trim();
        t = t.replace(/^```[a-zA-Z0-9]*\n?/m, '').replace(/```$/m, '').replace(/```/g, '').trim();
        // If still not plain JSON, try extracting the first {...} block
        if (!(t.startsWith('{') && t.endsWith('}'))) {
          const start = t.indexOf('{');
          const end = t.lastIndexOf('}');
          if (start !== -1 && end !== -1 && end > start) {
            t = t.slice(start, end + 1);
          }
        }
        return t;
      } catch { return text; }
    })();
    try { parsed = JSON.parse(cleaned); } catch (_) { return { intent: null, entities: {}, confidence: 0 }; }

    const intent = parsed.intent || null;
    const entities = parsed.entities || {};
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0;

    // Normalize entities against DB. No fuzzy in code; only LLM guesses.
    const normalized = await normalizeEntities(pool, entities);

    const final = { intent, entities: normalized.entities, confidence: Math.min(Math.max(confidence, 0), 1), notes: normalized.notes };
    console.log('🤖 AI parsed:', final);
    return final;
  } catch (e) {
    console.error('❌ parseUserIntent error:', e.message);
    return { intent: null, entities: {}, confidence: 0 };
  }
}

// Brand alias mapping for common variations (LLM handles most typos, keeping only essential mappings)
        const BRAND_ALIASES = {
          'Suzuki': 'Maruti',
          'Maruti Suzuki': 'Maruti',
          'Maruti-Suzuki': 'Maruti',
          'VW': 'Volkswagen',
          'Mercedes': 'Mercedes-Benz',
          'Mercedes Benz': 'Mercedes-Benz',
          'Mercedes-Benz': 'Mercedes-Benz',
          'MG': 'MG Motor',
          'Tata Motors': 'Tata'
        };

// Car type aliases for normalization (LLM handles most typos, keeping only essential mappings)
const TYPE_ALIASES = {
  'hatch back': 'Hatchback',
  'compact': 'Hatchback',
  'small car': 'Hatchback',
  'big car': 'SUV',
  'sports utility vehicle': 'SUV',
  'multi utility vehicle': 'MUV',
  'luxury car': 'Luxury',
  'premium': 'Luxury'
};

// Function to find nearest brand match using fuzzy matching
function findNearestBrand(inputBrand, availableBrands) {
  if (!inputBrand || !availableBrands || availableBrands.length === 0) {
    return null;
  }

  const normalizedInput = inputBrand.toLowerCase().trim();
  
  // First check exact match
  const exactMatch = availableBrands.find(brand => 
    brand.toLowerCase() === normalizedInput
  );
  if (exactMatch) return exactMatch;

  // Check alias mapping
  const aliasMatch = BRAND_ALIASES[inputBrand];
  if (aliasMatch && availableBrands.includes(aliasMatch)) {
    return aliasMatch;
  }

  // Fuzzy matching - find brands that contain the input or vice versa
  const fuzzyMatches = availableBrands.filter(brand => {
    const normalizedBrand = brand.toLowerCase();
    return normalizedBrand.includes(normalizedInput) || 
           normalizedInput.includes(normalizedBrand) ||
           // Check for common misspellings
           levenshteinDistance(normalizedInput, normalizedBrand) <= 2;
  });

  if (fuzzyMatches.length > 0) {
    // Return the closest match (shortest distance)
    return fuzzyMatches.reduce((closest, current) => 
      levenshteinDistance(normalizedInput, current.toLowerCase()) < 
      levenshteinDistance(normalizedInput, closest.toLowerCase()) ? current : closest
    );
  }

  return null;
}

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

async function normalizeEntities(pool, entities) {
  const notes = [];
  const out = { ...entities };

  try {
    // Types (handle both single values and arrays)
    if (out.type) {
      const types = await getAvailableTypes(pool, entities.budget || null);
      
      // Handle array of types
      if (Array.isArray(out.type)) {
        const validTypes = [];
        for (const type of out.type) {
          const aliasMatch = TYPE_ALIASES[type.toLowerCase()];
          if (aliasMatch && types.includes(aliasMatch)) {
            validTypes.push(aliasMatch);
            notes.push(`type_mapped_to_${aliasMatch}`);
          } else {
            const typeMatch = types.find(t => t.toLowerCase() === type.toLowerCase());
            if (typeMatch) {
              validTypes.push(typeMatch);
            }
          }
        }
        out.type = validTypes.length > 0 ? validTypes[0] : null; // Take first valid type
        if (validTypes.length === 0) {
          notes.push('type_not_in_db');
        }
      } else {
        // Handle single type
        const aliasMatch = TYPE_ALIASES[out.type.toLowerCase()];
        if (aliasMatch && types.includes(aliasMatch)) {
          out.type = aliasMatch;
          notes.push(`type_mapped_to_${aliasMatch}`);
        } else {
          // Check case-insensitive match
          const typeMatch = types.find(type => type.toLowerCase() === out.type.toLowerCase());
          if (typeMatch) {
            out.type = typeMatch; // Use the correct case from database
          } else if (!types.includes(out.type)) {
            out.type = null;
            notes.push('type_not_in_db');
          }
        }
      }
    }

    // Brands with alias mapping and fuzzy matching (handle both single values and arrays)
    if (out.brand) {
      const brands = await getAvailableBrands(pool, entities.budget || null, entities.type || 'all');
      
      // Handle array of brands
      if (Array.isArray(out.brand)) {
        const validBrands = [];
        for (const brand of out.brand) {
          const nearestBrand = findNearestBrand(brand, brands);
          if (nearestBrand) {
            validBrands.push(nearestBrand);
            if (nearestBrand !== brand) {
              notes.push(`brand_mapped_to_${nearestBrand}`);
            }
          }
        }
        out.brand = validBrands.length > 0 ? validBrands[0] : null; // Take first valid brand
        if (validBrands.length === 0) {
          notes.push('brand_not_in_db');
        }
      } else {
        // Handle single brand
        const nearestBrand = findNearestBrand(out.brand, brands);
        if (nearestBrand) {
          out.brand = nearestBrand;
          if (nearestBrand !== out.brand) {
            notes.push(`brand_mapped_to_${nearestBrand}`);
          }
        } else {
          out.brand = null;
          notes.push('brand_not_in_db');
        }
      }
    }

    // Models
    if (out.brand && out.model) {
      const models = await getModelsByBrand(pool, out.brand);
      if (!models.includes(out.model)) {
        out.model = null;
        notes.push('model_not_in_db');
      }
    }
  } catch (e) {
    console.error('❌ normalizeEntities error:', e.message);
  }

  // Budget mapping must already be bucketed by LLM; keep as-is or null
  return { entities: out, notes };
}
