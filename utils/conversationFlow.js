function getMainMenu(session = {}) {
  // Check if user already has details stored
  if (session.td_name && session.td_phone) {
    return {
      message: `Hello ${session.td_name}! 👋 Welcome back to Sherpa Hyundai. I have your details saved (📱 ${session.td_phone}). How can I assist you today?`,
      options: [
        "🚗 Browse Used Cars",
        "💰 Get Car Valuation",
        "📞 Contact Our Team",
        "ℹ️ About Us"
      ]
    };
  }
  
  return {
    message: "Hello! 👋 Welcome to Sherpa Hyundai. I'm here to help you find your perfect used car. How can I assist you today?",
    options: [
      "🚗 Browse Used Cars",
      "💰 Get Car Valuation",
      "📞 Contact Our Team",
      "ℹ️ About Us"
    ]
  };
}

module.exports = { getMainMenu };
