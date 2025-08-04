const { handleCarValuationStep } = require('./getCarValuation');
const { handleContactUsStep } = require('./contactUsFlow');
const { handleAboutUsStep } = require('./aboutUs');
const { handleBrowseUsedCars } = require('./handleBrowseUsedCars');
const { getMainMenu } = require('./conversationFlow');

async function mainRouter(session, message) {
  const lowerMsg = message.toLowerCase();
  console.log("🧭 Incoming message:", message);
  console.log("🧠 Current session step:", session.step);

  // Route based on step or keywords
  if (session.step && (session.step.startsWith('valuation') || 
      ['brand', 'model', 'year', 'fuel', 'kms', 'owner', 'condition', 'name', 'phone', 'location', 'other_brand_input', 'other_model_input'].includes(session.step))) {
    console.log("➡️ Routing to: Car Valuation");
    return handleCarValuationStep(session, message);
  }

  if (session.step && (session.step.startsWith('contact') || 
      ['contact_menu', 'callback_time', 'callback_name', 'contact_callback_phone', 'callback_reason'].includes(session.step))) {
    console.log("➡️ Routing to: Contact Us");
    return handleContactUsStep(session, message);
  }

  if (session.step && (session.step.startsWith('about') || 
      ['about_menu', 'about_selection'].includes(session.step))) {
    console.log("➡️ Routing to: About Us");
    return handleAboutUsStep(session, message);
  }

  if (session.step && (session.step.startsWith('browse') || session.step === 'show_more_cars' || session.step === 'car_selected_options' || session.step.startsWith('test_drive') || session.step.startsWith('td_') || session.step === 'change_criteria_confirm')) {
    console.log("➡️ Routing to: Browse Used Cars");
    return handleBrowseUsedCars(session, message);
  }

  // Keyword-based routing fallback
  if (lowerMsg.includes('valuation') || message === "💰 Get Car Valuation") {
    session.step = 'valuation_start';
    console.log("💬 Keyword matched: valuation → Routing to Car Valuation");
    return handleCarValuationStep(session, message);
  }

  if (lowerMsg.includes('contact') || message === "📞 Contact Our Team") {
    session.step = 'contact_start';
    console.log("💬 Keyword matched: contact → Routing to Contact Us");
    return handleContactUsStep(session, message);
  }

  if (lowerMsg.includes('about') || message === "ℹ️ About Us") {
    session.step = 'about_start';
    console.log("💬 Keyword matched: about → Routing to About Us");
    return handleAboutUsStep(session, message);
  }

  if (lowerMsg.includes('browse') || message === "🚗 Browse Used Cars") {
    session.step = 'browse_start';
    console.log("💬 Keyword matched: browse → Routing to Browse Cars");
    return handleBrowseUsedCars(session, message);
  }

  // Greet and start main menu if first message
  if (!session.step || ['hi', 'hello', 'hey'].includes(lowerMsg)) {
    session.step = 'main_menu';
    console.log("🔁 Resetting to main menu");
    return getMainMenu();
  }

  console.log("⚠️ No match found, showing main menu again");
  return getMainMenu();
}

// ✅ Correct export
exports.routeMessage = mainRouter;
