// utils/timeUtils.js

function getTimeSlots() {
  return [
    "Morning (10-12 PM)",
    "Afternoon (12-4 PM)",
    "Evening (4-7 PM)"
  ];
}

function getNextAvailableDays(choice) {
  const today = new Date();
  const days = [];

  if (choice === "Later this Week") {
    // Show remaining days of current week (excluding today and tomorrow)
    for (let i = 2; i <= 6; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayName = date.toLocaleDateString('en-IN', { weekday: 'long' });
      const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      days.push(`${dayName} (${dateStr})`);
    }
  } else if (choice === "Next Week") {
    // Show all 7 days of next week
    const nextWeekStart = new Date(today);
    nextWeekStart.setDate(today.getDate() + 7 - today.getDay()); // Start from Monday of next week
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(nextWeekStart);
      date.setDate(nextWeekStart.getDate() + i);
      const dayName = date.toLocaleDateString('en-IN', { weekday: 'long' });
      const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      days.push(`${dayName} (${dateStr})`);
    }
  }

  return days;
}

// Helper function to get actual date from user selection
function getActualDateFromSelection(selection) {
  const today = new Date();
  
  if (selection === "Today") {
    return today;
  } else if (selection === "Tomorrow") {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow;
  } else if (selection.includes("Later this Week")) {
    // This is handled in the day selection step
    return null;
  } else if (selection.includes("Next Week")) {
    // This is handled in the day selection step
    return null;
  }
  
  return null;
}

// Helper function to get actual date from day selection
function getActualDateFromDaySelection(daySelection, weekChoice) {
  const today = new Date();
  
  if (weekChoice === "Later this Week") {
    // Parse the day name from format "Monday (15 Aug)"
    const dayName = daySelection.split(' ')[0];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayIndex = dayNames.indexOf(dayName);
    
    if (targetDayIndex !== -1) {
      const currentDayIndex = today.getDay();
      let daysToAdd = targetDayIndex - currentDayIndex;
      
      // If the target day is before current day, it means next week
      if (daysToAdd <= 0) {
        daysToAdd += 7;
      }
      
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysToAdd);
      return targetDate;
    }
  } else if (weekChoice === "Next Week") {
    // Parse the day name from format "Monday (22 Aug)"
    const dayName = daySelection.split(' ')[0];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayIndex = dayNames.indexOf(dayName);
    
    if (targetDayIndex !== -1) {
      // Calculate next week's Monday
      const nextWeekStart = new Date(today);
      nextWeekStart.setDate(today.getDate() + 7 - today.getDay());
      
      const targetDate = new Date(nextWeekStart);
      targetDate.setDate(nextWeekStart.getDate() + targetDayIndex);
      return targetDate;
    }
  }
  
  return null;
}

module.exports = {
  getTimeSlots,
  getNextAvailableDays,
  getActualDateFromSelection,
  getActualDateFromDaySelection
};
