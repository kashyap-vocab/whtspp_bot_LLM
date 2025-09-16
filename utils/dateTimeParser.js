const { parseUserIntent } = require('./geminiHandler');

// Parse natural language date/time input for test drive scheduling
async function parseDateTimeInput(userMessage) {
  try {

    // Use geminiWrapper directly for date/time parsing
    const geminiWrapper = require('./geminiWrapper');
    const systemPrompt = `You are a helpful assistant that extracts date and time information from user messages.

SYSTEM INSTRUCTIONS:
1. Parse the user's message to extract date and time information
2. Return ONLY valid JSON with date and time fields
3. Handle natural language expressions intelligently
4. Use standard formats for dates and times

DATE EXAMPLES:
- "today" = date: "Today", time: null
- "tomorrow" = date: "Tomorrow", time: null
- "next week" = date: "Next Week", time: null
- "24th" = date: "24th", time: null

TIME EXAMPLES:
- "7pm" = date: null, time: "7:00 PM"
- "evening" = date: null, time: "Evening (4-8 PM)"

COMBINED EXAMPLES:
- "today at 7pm" = date: "Today", time: "7:00 PM"
- "tomorrow evening" = date: "Tomorrow", time: "Evening (4-8 PM)"

OUTPUT FORMAT:
{
  "date": "string_or_null",
  "time": "string_or_null",
  "confidence": 0.0-1.0
}`;

    const userPrompt = `Extract date and time from: "${userMessage}"`;
    const response = await geminiWrapper.parseDateTime(systemPrompt, userPrompt);
    
    if (response && response.confidence > 0.5) {
      return {
        date: response.date || null,
        time: response.time || null,
        confidence: response.confidence,
        success: true
      };
    }
    
    return {
      date: null,
      time: null,
      confidence: 0,
      success: false
    };
  } catch (error) {
    console.error('Error parsing date/time:', error);
    return {
      date: null,
      time: null,
      confidence: 0,
      success: false
    };
  }
}

// Convert parsed date/time to session format
function convertToSessionFormat(parsedDateTime) {
  const { date, time } = parsedDateTime;
  
  // Convert date to session format
  let sessionDate = null;
  let sessionActualDate = null;
  let sessionDateFormatted = null;
  
  if (date) {
    if (date === "Today") {
      sessionDate = "Today";
      sessionActualDate = new Date();
      sessionDateFormatted = sessionActualDate.toLocaleDateString('en-IN', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else if (date === "Tomorrow") {
      sessionDate = "Tomorrow";
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      sessionActualDate = tomorrow;
      sessionDateFormatted = tomorrow.toLocaleDateString('en-IN', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else if (date.includes("th") || date.includes("st") || date.includes("nd") || date.includes("rd")) {
      // Handle specific dates like "24th", "25th December"
      sessionDate = date;
      sessionDateFormatted = date;
    } else {
      // Handle day names like "Next Tuesday", "This Friday"
      sessionDate = date;
      sessionDateFormatted = date;
    }
  }
  
  // Convert time to session format
  let sessionTime = null;
  
  if (time) {
    if (time.includes("Morning")) {
      sessionTime = "Morning (9-12 PM)";
    } else if (time.includes("Afternoon")) {
      sessionTime = "Afternoon (12-4 PM)";
    } else if (time.includes("Evening")) {
      sessionTime = "Evening (4-8 PM)";
    } else if (time.includes("PM") || time.includes("AM")) {
      sessionTime = time;
    } else {
      sessionTime = time;
    }
  }
  
  return {
    sessionDate,
    sessionActualDate,
    sessionDateFormatted,
    sessionTime
  };
}

module.exports = {
  parseDateTimeInput,
  convertToSessionFormat
};
