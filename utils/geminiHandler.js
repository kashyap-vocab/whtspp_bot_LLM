const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Context for the AI to understand the car dealership bot's purpose
const SYSTEM_CONTEXT = `You are a helpful car dealership assistant for Sherpa Hyundai. Your role is to:
1. Help customers with car-related queries (browsing used cars, valuations, contact info, about us)
2. Politely redirect off-topic questions back to car-related services
3. Be friendly and professional
4. Always guide users back to the main menu options when they ask unrelated questions

Main menu options:
- 🚗 Browse Used Cars
- 💰 Get Car Valuation  
- 📞 Contact Our Team
- ℹ️ About Us

When users ask off-topic questions (like cooking, weather, general chat), politely redirect them to car-related services.`;

async function handleOutOfContextQuestion(userMessage) {
  try {
    // Check if we have a Gemini API key
    if (!process.env.GEMINI_API_KEY) {
      console.log("⚠️ No Gemini API key found, using fallback response");
      return getFallbackResponse(userMessage);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `${SYSTEM_CONTEXT}

User message: "${userMessage}"

Please provide a friendly response that:
1. Acknowledges their question
2. Politely explains that you're here to help with car-related services
3. Guides them back to the main menu options
4. Keeps the response under 200 words

Response:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("🤖 Gemini response:", text);
    return text;

  } catch (error) {
    console.error("❌ Error calling Gemini API:", error);
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
  
  if (isOffTopic) {
    return `I understand you're asking about "${userMessage}", but I'm specifically here to help you with car-related services at Sherpa Hyundai! 🚗

I can assist you with:
🚗 Browse our used car inventory
💰 Get a free car valuation
📞 Contact our sales team
ℹ️ Learn more about us

What would you like to explore today?`;
  }
  
  // For unclear messages, provide a general redirect
  return `I'm here to help you with car-related services at Sherpa Hyundai! 🚗

How can I assist you today?
🚗 Browse Used Cars
💰 Get Car Valuation
📞 Contact Our Team
ℹ️ About Us`;
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
  getFallbackResponse
};
