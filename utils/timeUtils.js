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

  const startOffset = choice === "Later this Week" ? 2 : 1;
  const maxDays = choice === "Later this Week" ? 5 : 6;

  for (let i = 0; i < maxDays; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i + startOffset);
    const dayName = date.toLocaleDateString('en-IN', { weekday: 'long' });
    days.push(dayName);
  }

  return days;
}

module.exports = {
  getTimeSlots,
  getNextAvailableDays
};
