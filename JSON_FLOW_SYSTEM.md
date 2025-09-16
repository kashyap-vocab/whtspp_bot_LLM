# JSON-Based Flow System for WhatsApp Car Bot

## 🎯 Overview

This system maintains a comprehensive JSON structure that tracks user progress through the car browsing flow: **Budget → Car Type → Brand → Showing Cars → Test Drive**.

## 📋 Flow Structure

```
Budget Selection → Car Type Selection → Brand Selection → Car Display → Test Drive Booking
```

## 🏗️ Architecture

### 1. SessionManager (`utils/sessionManager.js`)
- Maintains the complete session state in JSON format
- Tracks user preferences, choices, and progress
- Handles AI entity updates and flow state management

### 2. FlowController (`utils/flowController.js`)
- Controls the flow logic and step transitions
- Handles user input validation and processing
- Integrates with AI parsing for natural language understanding

## 📊 JSON Session Structure

```json
{
  "currentStep": "browse_brand",
  "flowType": "browse",
  "preferences": {
    "budget": "₹10-15 Lakhs",
    "carType": "SUV",
    "brand": "Toyota",
    "year": null,
    "fuel": null
  },
  "userChoices": {
    "budget": "₹10-15 Lakhs",
    "carType": "SUV", 
    "brand": "Toyota"
  },
  "searchResults": {
    "filteredCars": [...],
    "currentIndex": 0,
    "totalCars": 1,
    "selectedCar": null
  },
  "testDrive": {
    "selectedCar": null,
    "date": null,
    "time": null,
    "name": null,
    "phone": null,
    "license": null,
    "location": null,
    "address": null
  },
  "userProfile": {
    "name": null,
    "phone": null,
    "email": null,
    "location": null
  },
  "flowState": {
    "isInProgress": true,
    "canSkipSteps": true,
    "aiSuggestionsApplied": true,
    "needsHumanAssistance": false
  },
  "metadata": {
    "sessionStart": "2025-09-15T10:49:02.541Z",
    "lastActivity": "2025-09-15T10:49:10.103Z",
    "totalMessages": 7,
    "conversationEnded": false
  }
}
```

## 🔄 Flow Steps

### 1. **Budget Selection** (`browse_budget`)
- User selects budget range
- Updates `preferences.budget` and `userChoices.budget`
- Determines next step based on available data

### 2. **Car Type Selection** (`browse_type`)
- User selects car type (Hatchback, Sedan, SUV, etc.)
- Updates `preferences.carType` and `userChoices.carType`
- Can skip if already provided by AI

### 3. **Brand Selection** (`browse_brand`)
- User selects brand preference
- Updates `preferences.brand` and `userChoices.brand`
- Can skip if already provided by AI

### 4. **Car Display** (`show_cars`)
- Shows filtered cars based on criteria
- Updates `searchResults.filteredCars`
- Handles car selection and browsing

### 5. **Test Drive Booking** (`test_drive_*`)
- Collects test drive details
- Updates `testDrive` object
- Handles confirmation and booking

## 🤖 AI Integration

- **Natural Language Parsing**: Extracts entities from user messages
- **Smart Flow Skipping**: Skips steps when data is already available
- **Entity Updates**: Automatically updates session with AI-parsed data

## 🔧 Key Features

### 1. **Smart Flow Skipping**
```javascript
// If user says "I want toyota suv under 15 lakhs"
// AI extracts: { brand: "Toyota", type: "SUV", budget: "₹10-15 Lakhs" }
// Flow skips directly to showing cars
```

### 2. **Session Persistence**
- Maintains complete state across messages
- Tracks user progress and preferences
- Enables flow resumption and modification

### 3. **Dynamic Updates**
- Updates JSON structure with each user interaction
- Maintains consistency between preferences and choices
- Tracks metadata and flow state

## 📱 Integration with WhatsApp Bot

### Modified mainRouter.js:
```javascript
const flowController = require('./utils/flowController');

async function mainRouter(session, userMessage, pool) {
  if (session.flowType === 'browse' || !session.flowType) {
    const result = await flowController.handleMessage(userMessage, session);
    return {
      message: result.message,
      options: result.options,
      session: result.session
    };
  }
  // Handle other flows...
}
```

## 🎯 Benefits

1. **Consistent Flow**: Always follows Budget → Type → Brand → Cars → Test Drive
2. **Smart Skipping**: Avoids redundant questions when data is available
3. **Complete Tracking**: Maintains full session state in JSON format
4. **AI Integration**: Seamlessly integrates natural language understanding
5. **Flexible**: Easy to modify flow steps and add new features
6. **Debugging**: Clear JSON structure for troubleshooting

## 🚀 Usage Examples

### Natural Language Query:
```
User: "I want toyota suv under 15 lakhs"
Bot: Shows Toyota SUV cars directly (skips budget/type/brand questions)
```

### Step-by-Step Flow:
```
User: "Hi"
Bot: "What's your budget range?"
User: "₹10-15 Lakhs"
Bot: "What type of car do you prefer?"
User: "SUV"
Bot: "Which brand do you prefer?"
User: "Toyota"
Bot: Shows Toyota SUV cars
```

### Change Criteria:
```
User: "Change criteria"
Bot: Resets to budget selection
Session: Clears preferences and starts fresh
```

## 📊 Session Summary Output

The system provides a clean session summary for debugging:
```json
{
  "currentStep": "browse_brand",
  "flowType": "browse",
  "preferences": { "budget": "₹10-15 Lakhs", "carType": "SUV", "brand": "Toyota" },
  "userChoices": { "budget": "₹10-15 Lakhs", "carType": "SUV", "brand": "Toyota" },
  "searchResults": { "totalCars": 1, "selectedCar": null },
  "testDrive": { "selectedCar": null, "date": null, "time": null },
  "flowState": { "isInProgress": true, "canSkipSteps": true, "aiSuggestionsApplied": true },
  "metadata": { "sessionStart": "2025-09-15T10:49:02.541Z", "totalMessages": 7 }
}
```

This JSON-based system ensures consistent flow management and provides complete visibility into the user's journey through the car browsing process.
