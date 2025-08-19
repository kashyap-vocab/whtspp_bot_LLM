# Gemini API Setup for WhatsApp Bot

## Overview
This WhatsApp bot now includes Gemini AI integration to handle out-of-context questions and guide users back to car-related services.

## Setup Instructions

### 1. Get Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the API key

### 2. Configure Environment Variables
Create a `.env` file in the root directory with:

```env
# Gemini API Configuration
GEMINI_API_KEY=your_actual_api_key_here

# Other existing environment variables...
```

### 3. Features

#### Out-of-Context Detection
The bot automatically detects when users ask off-topic questions like:
- "Help me cook biryani"
- "What's the weather today?"
- "Tell me a joke"
- "How to play cricket"

#### Smart Responses
When out-of-context questions are detected:
1. The bot acknowledges the user's question
2. Politely explains it's here for car-related services
3. Guides them back to the main menu options
4. Maintains a friendly, professional tone

#### Fallback System
If the Gemini API is unavailable or not configured:
- The bot uses keyword-based detection
- Provides appropriate fallback responses
- Still guides users back to car services

### 4. Main Menu Options
- 🚗 Browse Used Cars
- 💰 Get Car Valuation
- 📞 Contact Our Team
- ℹ️ About Us

### 5. Testing
Test the integration by asking off-topic questions like:
- "How to make biryani?"
- "What's the weather?"
- "Tell me a joke"
- "Help me with cooking"

The bot should respond appropriately and guide you back to car-related services.

## Troubleshooting

### API Key Issues
- Ensure your API key is valid and has proper permissions
- Check that the `.env` file is in the root directory
- Verify the environment variable name is `GEMINI_API_KEY`

### No Response from Gemini
- The bot will automatically fall back to keyword-based detection
- Check console logs for API error messages
- Ensure internet connectivity for API calls

### Performance
- API calls may take 1-3 seconds
- Consider implementing caching for common responses
- Monitor API usage and costs
