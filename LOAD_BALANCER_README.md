# API Load Balancer for Gemini API

This load balancer system manages Gemini API requests to stay within free tier limits and prevent quota exhaustion.

## 🚀 Features

- **Request Rate Limiting**: 15 requests/minute, 45 requests/day
- **Queue Management**: Requests are queued when limits are reached
- **Automatic Retry**: Failed requests are retried with exponential backoff
- **Fallback System**: Graceful degradation when API is unavailable
- **Usage Monitoring**: Real-time tracking of API usage
- **Non-blocking**: Doesn't interfere with existing bot logic

## 📁 Files

### Core Files
- `utils/apiLoadBalancer.js` - Main load balancer class
- `utils/geminiWrapper.js` - Wrapper for Gemini API calls
- `utils/geminiHandler.js` - Updated to use load balancer

### Test Files
- `test_load_balancer_safe.js` - Safe testing script
- `test_load_balancer.js` - Full testing script
- `integrate_load_balancer.js` - Integration demo

### Monitoring
- `monitor_api_usage.js` - Real-time usage monitoring

## 🔧 Usage

### Basic Usage

```javascript
const geminiWrapper = require('./utils/geminiWrapper');

// Parse user intent with load balancing
const result = await geminiWrapper.parseUserIntent(systemPrompt, userPrompt);

// Handle out of context questions
const response = await geminiWrapper.handleOutOfContextQuestion(systemPrompt, userPrompt);

// Check if message is out of context
const isOutOfContext = await geminiWrapper.isOutOfContext(systemPrompt, userPrompt);

// Normalize entities
const normalized = await geminiWrapper.normalizeEntities(systemPrompt, userPrompt);
```

### Monitoring Usage

```javascript
const monitor = require('./monitor_api_usage');

// Start monitoring
monitor.start();

// Get detailed status
const status = monitor.getDetailedStatus();
console.log(status);

// Stop monitoring
monitor.stop();
```

### Check Availability

```javascript
const geminiWrapper = require('./utils/geminiWrapper');

if (geminiWrapper.isAvailable()) {
  // Make API call
  const result = await geminiWrapper.parseUserIntent(systemPrompt, userPrompt);
} else {
  // Use fallback
  console.log('API unavailable, using fallback');
}
```

## ⚙️ Configuration

### Load Balancer Settings

```javascript
// In apiLoadBalancer.js
this.maxRequestsPerMinute = 15; // Conservative limit
this.maxRequestsPerDay = 45;    // Leave buffer from 50 limit
```

### Generation Config

```javascript
// In geminiWrapper.js
this.defaultConfig = {
  temperature: 0.1,
  maxOutputTokens: 256,
  topP: 0.8,
  topK: 40
};
```

## 📊 Monitoring

### Real-time Monitoring

```bash
# Start monitoring
node monitor_api_usage.js

# Output example:
# 📊 API Status [10:30:15]:
#    Requests this minute: 5/15
#    Requests today: 12/45
#    Queue length: 0
#    Processing: No
#    Can make request: Yes
```

### Status Object

```javascript
{
  requestsThisMinute: 5,
  requestsToday: 12,
  queueLength: 0,
  isProcessing: false,
  canMakeRequest: true,
  timeUntilReset: 30000,
  limits: {
    maxPerMinute: 15,
    maxPerDay: 45
  },
  usage: {
    minuteUsage: "33.3%",
    dailyUsage: "26.7%"
  }
}
```

## 🧪 Testing

### Safe Testing

```bash
# Test with minimal API calls
node test_load_balancer_safe.js
```

### Full Testing

```bash
# Test with multiple requests
node test_load_balancer.js
```

### Integration Demo

```bash
# See integration examples
node integrate_load_balancer.js
```

## 🔄 How It Works

1. **Request Queue**: All API requests go through the load balancer
2. **Rate Limiting**: Checks minute and daily limits before processing
3. **Queue Processing**: Processes requests sequentially when limits allow
4. **Fallback**: Returns fallback responses when API is unavailable
5. **Monitoring**: Tracks usage and provides real-time status

## 🚨 Error Handling

### Quota Exceeded

```javascript
// Load balancer handles this automatically
// Returns fallback response when quota exceeded
```

### Network Errors

```javascript
// Automatic retry with exponential backoff
// Falls back to default response if retries fail
```

### Invalid Responses

```javascript
// JSON parsing errors are handled gracefully
// Returns empty object if parsing fails
```

## 📈 Benefits

1. **Prevents Quota Exhaustion**: Stays within free tier limits
2. **Improves Reliability**: Graceful degradation when API fails
3. **Better User Experience**: Consistent responses even when API is down
4. **Cost Effective**: Maximizes free tier usage without exceeding limits
5. **Easy Integration**: Drop-in replacement for existing API calls

## 🔧 Customization

### Adjust Limits

```javascript
// In apiLoadBalancer.js constructor
this.maxRequestsPerMinute = 10; // More conservative
this.maxRequestsPerDay = 40;     // More conservative
```

### Add New API Methods

```javascript
// In geminiWrapper.js
async newMethod(systemPrompt, userPrompt, config = {}) {
  const generationConfig = { ...this.defaultConfig, ...config };
  return await loadBalancer.queueRequest(
    'gemini-2.5-flash',
    systemPrompt,
    userPrompt,
    generationConfig
  );
}
```

## 🎯 Best Practices

1. **Monitor Usage**: Use the monitoring script to track API usage
2. **Test Limits**: Test with safe scripts before production
3. **Handle Fallbacks**: Always have fallback responses ready
4. **Queue Management**: Don't overwhelm the queue with too many requests
5. **Error Handling**: Handle all possible error scenarios

## 🚀 Production Deployment

1. **Set Environment Variables**: Ensure `GEMINI_API_KEY` is set
2. **Start Monitoring**: Run `node monitor_api_usage.js` in production
3. **Test Integration**: Run `node integrate_load_balancer.js` to verify
4. **Monitor Logs**: Watch for quota exceeded warnings
5. **Adjust Limits**: Fine-tune limits based on usage patterns

## 📞 Support

If you encounter issues:

1. Check the monitoring output for quota status
2. Verify `GEMINI_API_KEY` is set correctly
3. Test with safe scripts first
4. Check network connectivity
5. Review error logs for specific issues

---

**Note**: This load balancer is designed for the free tier Gemini API. For production use with higher limits, adjust the configuration accordingly.
