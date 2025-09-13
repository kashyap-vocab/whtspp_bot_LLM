const { parseUserIntent } = require('./geminiHandler');

// Parse natural language date/time input for test drive scheduling
async function parseDateTimeInput(userMessage) {
  try {
    const prompt = `Parse the following natural language date/time input for a test drive booking.
    Return ONLY valid JSON with keys: date, time, confidence (0-1).
    
    IMPORTANT: Extract BOTH date and time from the input. Be generous with confidence.
    
    Date Patterns:
    - "today" = "Today"
    - "tomorrow" = "Tomorrow" 
    - "tommorow" = "Tomorrow" (typo handling)
    - "24th" = "24th"
    - "25th December" = "25th December"
    - "next Tuesday" = "Next Tuesday"
    - "this Friday" = "This Friday"
    - "I want for tomorrow" = "Tomorrow"
    - "I need tomorrow" = "Tomorrow"
    
    Time Patterns:
    - "5pm" = "5:00 PM"
    - "5:30 pm" = "5:30 PM"
    - "at 5pm" = "5:00 PM"
    - "around 5pm" = "5:00 PM"
    - "evening" = "Evening (4-8 PM)"
    - "morning" = "Morning (9-12 PM)"
    - "afternoon" = "Afternoon (12-4 PM)"
    
    Combined Examples:
    - "I want for tomorrow at 5pm" = date: "Tomorrow", time: "5:00 PM"
    - "tomorrow evening" = date: "Tomorrow", time: "Evening (4-8 PM)"
    - "today at 6:30 pm" = date: "Today", time: "6:30 PM"
    - "24th at 6pm" = date: "24th", time: "6:00 PM"
    - "next Tuesday afternoon" = date: "Next Tuesday", time: "Afternoon (12-4 PM)"
    - "tomorrow" = date: "Tomorrow", time: null
    - "today" = date: "Today", time: null
    - "7pm" = date: null, time: "7:00 PM"
    - "evening" = date: null, time: "Evening (4-8 PM)"
    
    User input: "${userMessage}"`;

    // Create a mock pool object for the parseUserIntent function
    const mockPool = null;
    const response = await parseUserIntent(mockPool, prompt);
    
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
