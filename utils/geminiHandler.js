const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getAvailableBrands, getModelsByBrand, getAvailableTypes } = require('./carData');
const geminiWrapper = require('./geminiWrapper');

require('dotenv').config();
console.log("Gemini key:", process.env.GEMINI_API_KEY);

// Initialize Gemini API (fallback)
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
      model: "gemini-1.5-flash",
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.7,
        topP: 0.8,
        topK: 40
      }
    });

    const systemPrompt = `You are a helpful car dealership assistant for Sherpa Hyundai. Your role is to provide intelligent, friendly responses to customer messages.

SYSTEM INSTRUCTIONS:
1. Analyze if the user's message is car-related or off-topic
2. Provide appropriate responses based on the context
3. Always maintain a friendly, professional tone
4. Guide users to relevant car services when appropriate
5. Keep responses concise and helpful (under 200 words)

RESPONSE GUIDELINES:
- For car-related questions: Provide helpful information and guide to relevant services
- For off-topic questions: Politely acknowledge and redirect to car services while being understanding
- For unclear messages: Ask clarifying questions and suggest relevant options
- Always end with suggesting relevant menu options

AVAILABLE SERVICES:
- 🚗 Browse Used Cars: View our inventory of pre-owned vehicles
- 💰 Get Car Valuation: Get a free estimate for your current car
- 📞 Contact Our Team: Speak with our sales representatives
- ℹ️ About Us: Learn about Sherpa Hyundai`;

    const userPrompt = `User message: "${userMessage}"

Provide a helpful response:`;

    const result = await model.generateContent([systemPrompt, userPrompt]);
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
  // Simple fallback without keyword analysis - let LLM handle everything
    return `I'm here to help you with car-related services at Sherpa Hyundai! 🚗

How can I assist you today?
🚗 Browse Used Cars
💰 Get Car Valuation
📞 Contact Our Team
ℹ️ About Us`;
}

// LLM-based function to detect if a message is out of context
async function isOutOfContext(message) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      // If no API key, assume all messages are in context to avoid blocking
      return false;
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: modelName, 
      generationConfig: { 
        temperature: 0.1, 
        maxOutputTokens: 50,
        topP: 0.8,
        topK: 40
      } 
    });

    const systemPrompt = `You are analyzing if a user message is related to car dealership services or off-topic.

SYSTEM INSTRUCTIONS:
1. Determine if the message is car-related or off-topic
2. Return ONLY "true" or "false" - no explanations
3. "true" = message is off-topic (not car-related)
4. "false" = message is car-related or unclear

CAR-RELATED TOPICS:
- Buying/selling cars, valuations, browsing inventory
- Car brands, models, specifications, prices
- Contacting dealership, visiting showroom
- About the company, services offered
- Test drives, financing, insurance
- Any automotive-related queries

OFF-TOPIC EXAMPLES:
- Cooking, recipes, food
- Weather, sports, entertainment
- Personal relationships, health
- Politics, news, travel
- Education, work, hobbies
- Any non-automotive topics`;

    const userPrompt = `Analyze this message: "${message}"

Is this message off-topic? (true/false):`;

    const result = await model.generateContent([systemPrompt, userPrompt]);
    const text = (await result.response).text();
    
    // Parse the response
    const response = text.trim().toLowerCase();
    return response === 'true';
    
  } catch (e) {
    console.error('❌ isOutOfContext error:', e.message);
    // If LLM fails, assume message is in context to avoid blocking
  return false;
  }
}

module.exports = {
  handleOutOfContextQuestion,
  isOutOfContext,
  getFallbackResponse,
  parseUserIntent
};

// LLM-powered intent/entity extraction using structured system prompts with load balancing
async function parseUserIntent(pool, userMessage) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.log('🤖 AI disabled or missing GEMINI_API_KEY');
      return { intent: null, entities: {}, confidence: 0 };
    }

    // Check if load balancer is available
    if (!geminiWrapper.isAvailable()) {
      console.log('🚫 API load balancer unavailable, using fallback');
      return { intent: null, entities: {}, confidence: 0 };
    }

    const systemPrompt = `You are SHERPA, a friendly car dealership assistant at Sherpa Hyundai.
- You help customers find perfect cars and get car valuations.
- You understand typos and handle them smartly.
- You always respond with valid JSON only.
- You are empathetic and professional.

WHAT CUSTOMERS WANT:
- Browse cars: "I want to buy", "show me cars", "looking for sedan"
- Sell cars: "my car is", "I have a Honda", "get valuation"
- Contact info: "call you", "phone number", "address"
- About company: "who are you", "about sherpa"

BUDGET BRACKETS (map user input to these exact texts):
- "Under ₹5 Lakhs" (for 0-5 lakhs, "under 5", "5 lakh budget")
- "₹5-10 Lakhs" (for 5-10 lakhs, "5 to 10", "around 7 lakhs")
- "₹10-15 Lakhs" (for 10-15 lakhs, "10-15", "upto 12 lakhs")
- "₹15-20 Lakhs" (for 15-20 lakhs, "15 to 20", "under 18 lakhs")
- "Above ₹20 Lakhs" (for 20+ lakhs, "25 lakhs", "30-40 lakhs")

CAR TYPES: Sedan, SUV, Hatchback, MUV, Convertible, Coupe
CAR BRANDS: Maruti Suzuki, Hyundai, Tata, Mahindra, Honda, Toyota, etc.

INTENT CLASSIFICATION:
- "browse_used_cars": User wants to buy/look for used cars in browse flow
- "valuation": User wants to sell/get valuation for their car (includes providing car details like "my car is honda", "I have a toyota", "my vehicle is...")
- "contact": User wants to contact the dealership
- "about": User wants information about the company
- "null": Intent unclear or not car-related

CONTEXT AWARENESS:
- If user is already in a flow (valuation/browse/contact), prioritize that flow's intent
- In valuation flow: "City", "Swift", "i20" are model names, not browse intents
- In browse flow: "City", "Swift", "i20" are car models for browsing
- Always consider the current conversation context

VALUATION INTENT EXAMPLES:
- "my car is honda" → intent: "valuation", brand: "Honda"
- "I have a toyota 2020" → intent: "valuation", brand: "Toyota", year: "2020"
- "my vehicle is maruti swift" → intent: "valuation", brand: "Maruti", model: "Swift"
- "I want to sell my car" → intent: "valuation"
- "get valuation for my honda" → intent: "valuation", brand: "Honda"

ENTITY EXTRACTION RULES:
- brand: Extract car brand (handle variations like "maruthi" → "Maruti", "hyundai" → "Hyundai", "toyota" → "Toyota", "honda" → "Honda", "kia" → "Kia", "tata" → "Tata", "mahindra" → "Mahindra", "volkswagen" → "Volkswagen", "vw" → "Volkswagen")
- model: Extract specific car model if mentioned
- type: Extract car type (Hatchback, Sedan, SUV, MUV, Luxury)
- budget: Map to nearest bracket BELOW user's maximum amount (handle "under 14 lakhs" → "₹10-15 Lakhs", "below 8 lakhs" → "Under ₹5 Lakhs", "upto 12 lakhs" → "₹10-15 Lakhs")
- year: Extract manufacturing year if mentioned (handle "2023", "2020", "2019", etc.)
- fuel: Extract fuel type (Petrol, Diesel, CNG, Electric, Hybrid)
- kms: Extract kilometers/mileage (handle "50000 kms", "50k kms", "50000 kilometers", "50 thousand kms", "50k", "50 thousand", "50000")
- owner: Extract ownership info (handle "first owner", "1st owner", "single owner", "second owner", "2nd owner", "third owner", "3rd owner")
- condition: Extract car condition (handle "excellent", "good", "fair", "poor", "very good", "average")

VALUATION ENTITY EXAMPLES:
- "my car is honda" → brand: "Honda"
- "I have a toyota 2020" → brand: "Toyota", year: "2020"
- "my vehicle is maruti swift" → brand: "Maruti", model: "Swift"
- "my ccar type is honda 2023" → brand: "Honda", year: "2023" (handle typos like "ccar")
- "I own a hyundai i20" → brand: "Hyundai", model: "i20"
- "Honda City 2022 petrol with 50000 kms" → brand: "Honda", model: "City", year: "2022", fuel: "Petrol", kms: "50000"
- "first owner, excellent condition" → owner: "1st Owner", condition: "Excellent"
- "50k kms driven, single owner" → kms: "50000", owner: "1st Owner"
- "petrol engine, 50 thousand kilometers" → fuel: "Petrol", kms: "50000"
- "2024 diesel and 50k" → year: "2024", fuel: "Diesel", kms: "50000"
- "Honda 2023 petrol 50k" → brand: "Honda", year: "2023", fuel: "Petrol", kms: "50000"
- "Toyota City diesel 2022 50 thousand" → brand: "Toyota", model: "City", fuel: "Diesel", year: "2022", kms: "50000"

TYPO CORRECTION EXAMPLES (Browse):
- "I want toyoto innova sedan under 5 lkahs" → intent: "browse", brand: "Toyota", model: "Innova", type: "MUV", budget: "Under ₹5 Lakhs"
- "maruthi swift hatchback under 8 lacs" → intent: "browse", brand: "Maruti", model: "Swift", type: "Hatchback", budget: "Under ₹5 Lakhs"
- "hyunday creta suv under 15 lkhsa" → intent: "browse", brand: "Hyundai", model: "Creta", type: "SUV", budget: "₹10-15 Lakhs"
- "mahendra scorpio under 12 laksh" → intent: "browse", brand: "Mahindra", model: "Scorpio", type: "SUV", budget: "₹10-15 Lakhs"
- "toyata camry luxary sedan" → intent: "browse", brand: "Toyota", model: "Camry", type: "Luxury"

TYPO CORRECTION EXAMPLES (Valuation):
- "my ccar is handa city 2020 diesal" → intent: "valuation", brand: "Honda", model: "City", year: "2020", fuel: "Diesel"
- "I have maruthi swift 50k kms frist owner" → intent: "valuation", brand: "Maruti", model: "Swift", kms: "50000", owner: "1st Owner"
- "toyoto innova 2018 petral good conditon" → intent: "valuation", brand: "Toyota", model: "Innova", year: "2018", fuel: "Petrol", condition: "Good"

BRAND NORMALIZATION EXAMPLES:
- "maruthi" → "Maruti"
- "maruti suzuki" → "Maruti"
- "suzuki" → "Maruti"
- "hyundai" → "Hyundai"
- "toyota" → "Toyota"
- "honda" → "Honda"
- "kia" → "Kia"
- "tata" → "Tata"
- "mahindra" → "Mahindra"
- "volkswagen" → "Volkswagen"
- "vw" → "Volkswagen"

TYPO HANDLING AND CORRECTION:
- Recognize and auto-correct common misspellings: "lkhsa" → "lakhs", "maruthi" → "Maruti", "toyoto" → "Toyota"
- Handle alternative spellings: "lacs" → "lakhs", "hatch back" → "Hatchback"
- Auto-correct brand variations: "hyunday" → "Hyundai", "mahendra" → "Mahindra", "toyata" → "Toyota"
- Fix budget typos: "lkahs" → "lakhs", "lkhsa" → "lakhs", "lacs" → "lakhs"
- Understand user intent despite multiple typos in the same message
- Always output the corrected/normalized form in your response

BUDGET INTERPRETATION:
- "under X lakhs" → Choose bracket below X
- "around X lakhs" → Choose nearest bracket
- "upto X lakhs" → Choose bracket below X
- "maximum X lakhs" → Choose bracket below X
- "between X-Y lakhs" → Choose appropriate bracket
- Handle typos: "lkhsa", "lakh", "lacs" all mean "lakhs"

BUDGET EXAMPLES:
- "under 14 lakhs" → "₹10-15 Lakhs"
- "below 8 lakhs" → "Under ₹5 Lakhs"
- "upto 12 lakhs" → "₹10-15 Lakhs"
- "under 18 lakhs" → "₹15-20 Lakhs"
- "around 7 lakhs" → "₹5-10 Lakhs"
- "maximum 25 lakhs" → "Above ₹20 Lakhs"

OUTPUT FORMAT:
Return ONLY this JSON structure:
{
  "intent": "browse_used_cars|valuation|contact|about|null",
  "entities": {
    "brand": "string|null",
    "model": "string|null", 
    "type": "string|null",
    "budget": "string|null",
    "year": "string|null",
    "fuel": "string|null",
    "kms": "string|null",
    "owner": "string|null",
    "condition": "string|null"
  },
  "confidence": 0.0-1.0,
  "context": "browse_used_cars_flow"
}

EXAMPLES:
"I want sedan under 10 lakhs" → {"intent": "browse_used_cars", "entities": {"budget": "₹5-10 Lakhs", "type": "Sedan"}}
"My car is Honda City" → {"intent": "valuation", "entities": {"brand": "Honda", "model": "City"}}`;

    const userPrompt = `User said: "${userMessage}". Extract intent and entities:`;

    // Use load balancer
    const parsed = await geminiWrapper.parseUserIntent(systemPrompt, userPrompt);
    
    if (!parsed || Object.keys(parsed).length === 0) {
      console.log('❌ Empty response from load balancer');
      return { intent: null, entities: {}, confidence: 0 };
    }

    const intent = parsed.intent || null;
    const entities = parsed.entities || {};
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0;

    // Skip normalization for faster response - use entities as-is
    const final = { 
      intent, 
      entities: entities, 
      confidence: Math.min(Math.max(confidence, 0), 1), 
      notes: ['no_normalization'] 
    };
    console.log('🤖 AI parsed:', final);
    return final;
        } catch (e) {
          console.error('❌ parseUserIntent error:', e.message);
          
          // Use fallback parsing when API fails
          if (e.message.includes('API Key not found') || e.message.includes('API_KEY_INVALID') || e.message.includes('Service Unavailable')) {
            console.log('🔄 API failed, using fallback parsing...');
            const { fallbackParseUserIntent } = require('./fallbackAI');
            return fallbackParseUserIntent(userMessage);
          }
          
          return { intent: null, entities: {}, confidence: 0 };
        }
}

// LLM-based entity normalization with load balancing
async function normalizeEntitiesWithLLM(pool, entities) {
  const notes = [];
  const out = { ...entities };

  try {
    if (!process.env.GEMINI_API_KEY) {
      // If no API key, return entities as-is
      return { entities: out, notes: ['no_api_key'] };
    }

    // Check if load balancer is available
    if (!geminiWrapper.isAvailable()) {
      console.log('🚫 API load balancer unavailable for normalization, using entities as-is');
      return { entities: out, notes: ['load_balancer_unavailable'] };
    }

    // Get available options from database
    const types = await getAvailableTypes(pool, entities.budget || null);
    const brands = await getAvailableBrands(pool, entities.budget || null, entities.type || 'all');

    const systemPrompt = `You are normalizing car-related entities to match database values.

SYSTEM INSTRUCTIONS:
1. Map the given entities to the closest matches from available options
2. Handle typos, misspellings, and variations intelligently
3. Return ONLY valid JSON with normalized values
4. If no good match exists, return null for that entity

AVAILABLE CAR TYPES: ${types.join(', ')}
AVAILABLE BRANDS: ${brands.join(', ')}

NORMALIZATION RULES:
- Handle common misspellings: "maruthi" → "Maruti", "lkhsa" → "lakhs"
- Map variations: "hatch back" → "Hatchback", "VW" → "Volkswagen"
- Use case-insensitive matching
- Choose closest available option

OUTPUT FORMAT:
{
  "brand": "normalized_brand_or_null",
  "model": "model_or_null", 
  "type": "normalized_type_or_null",
  "budget": "budget_or_null",
  "year": "year_or_null",
  "fuel": "fuel_or_null",
  "kms": "kms_or_null",
  "owner": "owner_or_null",
  "condition": "condition_or_null"
}`;

    const userPrompt = `Normalize these entities:
${JSON.stringify(entities, null, 2)}

Return normalized JSON:`;

    // Use load balancer
    const normalized = await geminiWrapper.normalizeEntities(systemPrompt, userPrompt);
    
    if (normalized && Object.keys(normalized).length > 0) {
      // Update entities with normalized values
      Object.keys(normalized).forEach(key => {
        if (normalized[key] !== null && normalized[key] !== undefined) {
          out[key] = normalized[key];
          if (out[key] !== entities[key]) {
            notes.push(`${key}_normalized`);
          }
        }
      });
    } else {
      console.log('❌ Empty response from load balancer normalization');
      notes.push('empty_response');
    }

  } catch (e) {
    console.error('❌ normalizeEntitiesWithLLM error:', e.message);
    notes.push('normalization_error');
  }

  return { entities: out, notes };
}

async function normalizeEntities(pool, entities) {
  // Use the new LLM-based normalization
  return await normalizeEntitiesWithLLM(pool, entities);
}
