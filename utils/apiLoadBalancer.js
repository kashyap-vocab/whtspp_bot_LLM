const { GoogleGenerativeAI } = require('@google/generative-ai');

require('dotenv').config();

class APILoadBalancer {
  constructor() {
    this.requestQueue = [];
    this.isProcessing = false;
    this.requestCount = 0;
    this.lastResetTime = Date.now();
    this.maxRequestsPerMinute = 15; // Conservative limit for free tier (50/day = ~3/hour = ~0.5/min, using 15 for safety)
    this.maxRequestsPerDay = 45; // Leave some buffer from 50 limit
    this.dailyRequestCount = 0;
    this.lastDailyReset = new Date().toDateString();
    
    // Initialize Gemini API
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    console.log('🔄 API Load Balancer initialized');
    console.log(`📊 Limits: ${this.maxRequestsPerMinute}/min, ${this.maxRequestsPerDay}/day`);
  }

  // Check if we can make a request
  canMakeRequest() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneDayAgo = now - 86400000;

    // Reset daily counter if new day
    const today = new Date().toDateString();
    if (today !== this.lastDailyReset) {
      this.dailyRequestCount = 0;
      this.lastDailyReset = today;
      console.log('📅 Daily request counter reset');
    }

    // Check daily limit
    if (this.dailyRequestCount >= this.maxRequestsPerDay) {
      console.log('🚫 Daily request limit reached');
      return false;
    }

    // Check minute limit
    if (this.requestCount >= this.maxRequestsPerMinute) {
      console.log('🚫 Minute request limit reached');
      return false;
    }

    return true;
  }

  // Get wait time until next request is allowed
  getWaitTime() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    if (this.requestCount >= this.maxRequestsPerMinute) {
      return 60000 - (now - this.lastResetTime); // Wait until minute resets
    }

    return 0;
  }

  // Process queued requests
  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      if (!this.canMakeRequest()) {
        const waitTime = this.getWaitTime();
        if (waitTime > 0) {
          console.log(`⏳ Waiting ${Math.ceil(waitTime / 1000)}s before next request`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          this.resetMinuteCounter();
        } else {
          break; // Daily limit reached
        }
      }

      const request = this.requestQueue.shift();
      try {
        const result = await this.executeRequest(request);
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }

    this.isProcessing = false;
  }

  // Execute a single request
  async executeRequest(request) {
    const { modelName, systemPrompt, userPrompt, generationConfig } = request;
    
    this.requestCount++;
    this.dailyRequestCount++;
    
    console.log(`🚀 Executing request ${this.requestCount}/${this.maxRequestsPerMinute} (Daily: ${this.dailyRequestCount}/${this.maxRequestsPerDay})`);
    
    const model = this.genAI.getGenerativeModel({ 
      model: modelName, 
      generationConfig 
    });

    const result = await model.generateContent([systemPrompt, userPrompt]);
    const text = (await result.response).text();
    
    return text;
  }

  // Reset minute counter
  resetMinuteCounter() {
    this.requestCount = 0;
    this.lastResetTime = Date.now();
    console.log('🔄 Minute request counter reset');
  }

  // Add request to queue
  async queueRequest(modelName, systemPrompt, userPrompt, generationConfig = {}) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        modelName,
        systemPrompt,
        userPrompt,
        generationConfig,
        resolve,
        reject,
        timestamp: Date.now()
      });

      // Start processing if not already running
      this.processQueue();
    });
  }

  // Get current status
  getStatus() {
    const now = Date.now();
    const timeUntilReset = 60000 - (now - this.lastResetTime);
    
    return {
      requestsThisMinute: this.requestCount,
      requestsToday: this.dailyRequestCount,
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessing,
      timeUntilReset: Math.max(0, timeUntilReset),
      canMakeRequest: this.canMakeRequest()
    };
  }

  // Force reset counters (for testing)
  resetCounters() {
    this.requestCount = 0;
    this.dailyRequestCount = 0;
    this.lastResetTime = Date.now();
    this.lastDailyReset = new Date().toDateString();
    console.log('🔄 All counters reset');
  }
}

// Create singleton instance
const loadBalancer = new APILoadBalancer();

// Export the load balancer
module.exports = loadBalancer;
