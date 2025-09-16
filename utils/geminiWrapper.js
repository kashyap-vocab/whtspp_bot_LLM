const loadBalancer = require('./apiLoadBalancer');

class GeminiWrapper {
  constructor() {
    this.defaultConfig = {
      temperature: 0.1,
      maxOutputTokens: 256,
      topP: 0.8,
      topK: 40
    };
  }

  // Parse user intent with load balancing
  async parseUserIntent(systemPrompt, userPrompt, config = {}) {
    try {
      const generationConfig = { 
        ...this.defaultConfig, 
        maxOutputTokens: 500, // Increased for better JSON responses
        temperature: 0.1, // Lower temperature for more consistent JSON
        ...config 
      };
      
      console.log('🤖 Queuing parseUserIntent request...');
      const text = await loadBalancer.queueRequest(
        'gemini-1.5-flash',
        systemPrompt,
        userPrompt,
        generationConfig
      );

      if (!text || text.trim() === '') {
        console.log('❌ Empty response from load balancer');
        return { intent: null, entities: {}, confidence: 0 };
      }

      console.log('🤖 AI raw response:', text);
      return this.parseJSONResponse(text);
    } catch (error) {
      console.error('❌ parseUserIntent error:', error.message);
      
      // Use fallback parsing when API fails
      if (error.message.includes('API Key not found') || error.message.includes('API_KEY_INVALID') || error.message.includes('Service Unavailable')) {
        console.log('🔄 API failed in wrapper, using fallback parsing...');
        const { fallbackParseUserIntent } = require('./fallbackAI');
        return fallbackParseUserIntent(userPrompt);
      }
      
      return { intent: null, entities: {}, confidence: 0 };
    }
  }

  // Handle out of context questions with load balancing
  async handleOutOfContextQuestion(systemPrompt, userPrompt, config = {}) {
    try {
      const generationConfig = { 
        ...this.defaultConfig, 
        maxOutputTokens: 200,
        temperature: 0.7,
        ...config 
      };
      
      console.log('🤖 Queuing handleOutOfContextQuestion request...');
      const text = await loadBalancer.queueRequest(
        'gemini-1.5-flash',
        systemPrompt,
        userPrompt,
        generationConfig
      );

      console.log('🤖 Gemini response:', text);
      return text;
    } catch (error) {
      console.error('❌ handleOutOfContextQuestion error:', error.message);
      return this.getFallbackResponse();
    }
  }

  // Check if message is out of context with load balancing
  async isOutOfContext(systemPrompt, userPrompt, config = {}) {
    try {
      const generationConfig = { 
        ...this.defaultConfig, 
        maxOutputTokens: 50,
        ...config 
      };
      
      console.log('🤖 Queuing isOutOfContext request...');
      const text = await loadBalancer.queueRequest(
        'gemini-1.5-flash',
        systemPrompt,
        userPrompt,
        generationConfig
      );

      const response = text.trim().toLowerCase();
      return response === 'true';
    } catch (error) {
      console.error('❌ isOutOfContext error:', error.message);
      return false; // Assume in context if error
    }
  }

  // Normalize entities with load balancing
  async normalizeEntities(systemPrompt, userPrompt, config = {}) {
    try {
      const generationConfig = { 
        ...this.defaultConfig, 
        maxOutputTokens: 200,
        ...config 
      };
      
      console.log('🤖 Queuing normalizeEntities request...');
      const text = await loadBalancer.queueRequest(
        'gemini-2.5-flash',
        systemPrompt,
        userPrompt,
        generationConfig
      );

      return this.parseJSONResponse(text);
    } catch (error) {
      console.error('❌ normalizeEntities error:', error.message);
      return {};
    }
  }

  // Parse date/time with load balancing
  async parseDateTime(systemPrompt, userPrompt, config = {}) {
    try {
      const generationConfig = { 
        ...this.defaultConfig, 
        maxOutputTokens: 150,
        ...config 
      };
      
      console.log('🤖 Queuing parseDateTime request...');
      const text = await loadBalancer.queueRequest(
        'gemini-1.5-flash',
        systemPrompt,
        userPrompt,
        generationConfig
      );

      return this.parseJSONResponse(text);
    } catch (error) {
      console.error('❌ parseDateTime error:', error.message);
      return { date: null, time: null };
    }
  }

  // Parse JSON response safely
  parseJSONResponse(text) {
    try {
      if (!text || text.trim() === '') {
        console.log('❌ Empty text provided to parseJSONResponse');
        return {};
      }

      let cleaned = text.trim();
      
      // Remove code fences
      cleaned = cleaned.replace(/^```[a-zA-Z0-9]*\n?/m, '').replace(/```$/m, '').replace(/```/g, '').trim();
      
      // Extract JSON block if not clean
      if (!(cleaned.startsWith('{') && cleaned.endsWith('}'))) {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          cleaned = cleaned.slice(start, end + 1);
        } else {
          console.log('❌ No valid JSON found in response:', cleaned.substring(0, 100));
          return {};
        }
      }

      // Check if JSON looks incomplete - be flexible about required fields
      if (cleaned.length < 10) {
        console.log('❌ JSON appears too short:', cleaned);
        return {};
      }
      
      // Check if it has at least some expected JSON structure
      const hasValidStructure = (
        cleaned.includes('"intent"') || 
        cleaned.includes('"is_unrelated"') || 
        cleaned.includes('"date"') || 
        cleaned.includes('"isValid"')
      );
      
      if (!hasValidStructure) {
        console.log('❌ JSON appears incomplete:', cleaned);
        return {};
      }
      
      return JSON.parse(cleaned);
    } catch (error) {
      console.log('❌ JSON parse failed:', error.message);
      console.log('❌ Raw text:', text?.substring(0, 200));
      return {};
    }
  }

  // Get fallback response
  getFallbackResponse() {
    return `I'm here to help you with car-related services at Sherpa Hyundai! 🚗

How can I assist you today?
🚗 Browse Used Cars
💰 Get Car Valuation
📞 Contact Our Team
ℹ️ About Us`;
  }

  // Get load balancer status
  getStatus() {
    return loadBalancer.getStatus();
  }

  // Check if API is available
  isAvailable() {
    return loadBalancer.canMakeRequest();
  }
}

// Create singleton instance
const geminiWrapper = new GeminiWrapper();

module.exports = geminiWrapper;
