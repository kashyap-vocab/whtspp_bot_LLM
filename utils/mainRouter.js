const { handleCarValuationStep } = require('./getCarValuation');
const { handleContactUsStep } = require('./contactUsFlow');
const { handleAboutUsStep } = require('./aboutUs');
const { handleBrowseUsedCars } = require('./handleBrowseUsedCars');
const { getMainMenu } = require('./conversationFlow');
const { parseUserIntent } = require('./geminiHandler');
const { saveUserProfile, extractUserPreferences } = require('./userProfileManager');

async function mainRouter(session, message, pool) {
  const lowerMsg = message.toLowerCase();
  console.log("🧭 Incoming message:", message);
  console.log("🧠 Current session step:", session.step);
  console.log("🔍 Debug - session.conversationEnded:", session.conversationEnded);
  console.log("🔍 Session object ID:", session._id || 'no_id');
  console.log("🔍 Session keys:", Object.keys(session));
  console.log("⚙️ Reached global AI hook entry");

  // EARLY Global AI proposal (highest priority) before any resets
  try {
    const thresholdEarly = parseFloat(process.env.AI_PROPOSAL_CONFIDENCE || '0.5');
    const hasKeyEarly = !!process.env.GEMINI_API_KEY;
    console.log('🤖 AI early probe:', { step: session.step, threshold: thresholdEarly, hasKey: hasKeyEarly, userMessage: message });
    
    // Skip AI proposal if we're already in a structured flow (valuation, browse, contact, about)
    const isInStructuredFlow = session.step && (
      session.step.startsWith('valuation') || 
      session.step.startsWith('browse') || 
      session.step.startsWith('contact') || 
      session.step.startsWith('about') ||
      ['brand', 'model', 'year', 'fuel', 'kms', 'owner', 'condition', 'name', 'phone', 'location', 'other_brand_input', 'other_model_input'].includes(session.step) ||
      ['browse_budget', 'browse_type', 'browse_brand', 'show_cars', 'car_selected_options', 'test_drive_date', 'test_drive_time', 'td_name', 'td_phone', 'td_license', 'td_location_mode'].includes(session.step) ||
      ['contact_menu', 'callback_time', 'callback_name', 'contact_callback_phone', 'callback_reason'].includes(session.step) ||
      ['about_menu', 'about_selection'].includes(session.step)
    );
    
    if (isInStructuredFlow) {
      console.log('🤖 Skipping AI proposal - already in structured flow:', session.step);
    } else {
      const aiEarly = await parseUserIntent(pool, message);
      console.log('🤖 AI early result:', aiEarly);
      if (aiEarly && typeof aiEarly.confidence === 'number') {
        const e = aiEarly.entities || {};
        const isBrowseEarly = aiEarly.intent === 'browse' && (e.brand || e.type || e.budget);
        const isValEarly = aiEarly.intent === 'valuation' && (e.brand || e.model || e.year || e.fuel);
        const isContactEarly = aiEarly.intent === 'contact';
        if (aiEarly.confidence >= thresholdEarly && (isBrowseEarly || isValEarly || isContactEarly)) {
        // Auto-apply AI suggestions immediately without confirmation
        console.log('🤖 AI auto-applying:', { flow: aiEarly.intent || 'browse', entities: e });
        if (isBrowseEarly) {
          // Smart flow skipping - apply all available entities
          if (e.budget) session.budget = e.budget;
          if (e.type) session.type = e.type === 'all Type' ? 'all' : e.type;
          if (e.brand) session.brand = e.brand === 'all Brand' ? 'all' : e.brand;
          
          // Determine the next step based on what's missing
          let nextStep = 'browse_start';
          if (!session.budget) {
            nextStep = 'browse_budget';
          } else if (!session.type) {
            nextStep = 'browse_type';
          } else if (!session.brand) {
            nextStep = 'browse_brand';
          } else {
            nextStep = 'show_cars';
          }
          
          session.step = nextStep;
          console.log('🤖 AI smart flow skipping:', { 
            budget: session.budget, 
            type: session.type, 
            brand: session.brand, 
            nextStep: nextStep 
          });
          return handleBrowseUsedCars(session, message, pool);
        }
        if (isValEarly) {
          if (e.brand) session.brand = e.brand;
          if (e.model) session.model = e.model;
          if (e.year) session.year = e.year;
          if (e.fuel) session.fuel = e.fuel;
          if (!session.brand) session.step = 'brand';
          else if (!session.model) session.step = 'model';
          else if (!session.year) session.step = 'year';
          else if (!session.fuel) session.step = 'fuel';
          else session.step = 'kms';
          console.log('🤖 AI auto-applied for valuation:', { brand: session.brand, model: session.model, year: session.year, fuel: session.fuel });
          return handleCarValuationStep(session, message);
        }
        if (isContactEarly) {
          session.step = 'callback_time';
          console.log('🤖 AI auto-applied for contact callback');
          return handleContactUsStep(session, message);
        }
      } else {
        console.log('🤖 AI early not proposing:', { reason: aiEarly.confidence < thresholdEarly ? 'low_confidence' : 'no_entities_or_intent', confidence: aiEarly.confidence, intent: aiEarly.intent, entities: e });
      }
    }
    }
  } catch (e) { console.log('AI early proposal skipped:', e.message); }

  // Handle "Start over" globally - MUST be before routing
  if (message === '🔄 Start over' || lowerMsg.includes('start over') || lowerMsg.includes('restart')) {
    console.log('🔄 Global start over requested');
    // Clear all session data for fresh start
    Object.keys(session).forEach(key => delete session[key]);
    session.step = 'main_menu';
    return { message: "🔄 Starting fresh! What would you like to do?", options: ["Browse Used Cars", "Get Car Valuation", "Contact Us", "About Us"] };
  }

if (session.conversationEnded && (lowerMsg.includes('start') || lowerMsg.includes('begin') || lowerMsg.includes('new') || lowerMsg.includes('restart') || lowerMsg.includes('hi') || lowerMsg.includes('hello') || lowerMsg.includes('explore'))) {
    // Save user profile before clearing session data
    try {
      const userPreferences = extractUserPreferences(session);
      if (userPreferences.phone) {
        const profileResult = await saveUserProfile(userPreferences);
        if (profileResult.success) {
          console.log(`✅ User profile ${profileResult.action} before session reset`);
        }
      }
    } catch (error) {
      console.log('⚠️ Could not save user profile:', error.message);
    }

    delete session.conversationEnded;
    // Clear all session data for fresh start
    session.step = 'main_menu';
    session.carIndex = 0;
    session.filteredCars = [];
    session.selectedCar = null;
    session.budget = null;
    session.type = null;
    session.brand = null;
    session.testDriveDate = null;
    session.testDriveTime = null;
    session.td_name = null;
    session.td_phone = null;
    session.td_license = null;
    session.td_location_mode = null;
    session.td_home_address = null;
    session.td_drop_location = null;
    console.log("🔄 Restarting conversation after end - cleared all session data");
    return getMainMenu(session);
  }
  // Check for restart keywords that should clear the ended conversation FIRST
  if (session.conversationEnded && (lowerMsg.includes('start') || lowerMsg.includes('begin') || lowerMsg.includes('new') || lowerMsg.includes('restart') || lowerMsg.includes('explore'))) {
    // Save user profile before clearing session data
    try {
      const userPreferences = extractUserPreferences(session);
      if (userPreferences.phone) {
        const profileResult = await saveUserProfile(userPreferences);
        if (profileResult.success) {
          console.log(`✅ User profile ${profileResult.action} before session reset`);
        }
      }
    } catch (error) {
      console.log('⚠️ Could not save user profile:', error.message);
    }

    delete session.conversationEnded;
    // Clear stored details and reset session for fresh start
    session.step = 'main_menu';
    session.td_name = null;
    session.td_phone = null;
    session.name = null;
    session.phone = null;
    session.brand = null;
    session.model = null;
    session.year = null;
    session.fuel = null;
    session.kms = null;
    session.owner = null;
    session.condition = null;
    session.location = null;
    console.log("🔄 Restarting conversation after end - cleared all session data");
    return {
      message: "Great! Let's explore more options. What would you like to do?",
      options: [
        "🚗 Browse Used Cars",
        "💰 Get Car Valuation", 
        "📞 Contact Our Team",
        "ℹ️ About Us"
      ]
    };
  }

  // Check if conversation was ended - don't process further
  if (session.conversationEnded) {
    console.log("🔍 Debug - Conversation ended, not sending any message");
    return null; // Return null to indicate no message should be sent
  }

  // Check for unrelated questions or confusion that needs human assistance
  const needsAssistance = (() => {
    const lowerMsg = message.toLowerCase();
    const confusionKeywords = [
      'what', 'how', 'why', 'when', 'where', 'help', 'confused', 'lost', 'stuck',
      'don\'t understand', 'not working', 'error', 'problem', 'issue', 'wrong',
      'different', 'other', 'else', 'instead', 'change', 'modify', 'update'
    ];
    const offTopicKeywords = [
      'weather', 'food', 'movie', 'music', 'sports', 'news', 'politics', 'travel',
      'hotel', 'restaurant', 'shopping', 'clothes', 'health', 'education', 'job'
    ];
    
    // Skip human assistance for test drive flow steps
    if (session.step?.startsWith('td_') || session.step?.includes('test_drive') || session.step?.includes('callback')) {
      return false;
    }
    
    const isQuestion = lowerMsg.includes('?') || confusionKeywords.some(keyword => lowerMsg.includes(keyword));
    const isOffTopic = offTopicKeywords.some(keyword => lowerMsg.includes(keyword));
    const isLongMessage = message.length > 20;
    
    return isQuestion || isOffTopic || isLongMessage;
  })();

  // If user seems confused or asks unrelated questions, offer human assistance
  if (needsAssistance && session.step && !session.step.includes('human_assistance')) {
    console.log('🤝 User needs human assistance, offering help');
    return {
      message: `I sense you might need some help! 😊 I'm here to guide you through finding your perfect car.\n\n${session.step ? 'Let me help you get back on track.' : 'Let me show you what I can do for you.'}\n\nWhat would you like to do?`,
      options: ["🤖 Help me navigate", "🔄 Start over", "📞 Talk to human", "ℹ️ What can you do?"]
    };
  }

  // Skip AI proposal system - using direct AI integration in flows instead

  // Handle global assistance options
  if (message === "🤖 Help me navigate") {
    session.step = 'browse_start';
    return {
      message: "Perfect! Let me guide you through finding your perfect car step by step. 😊\n\nI'll ask you a few simple questions:\n1️⃣ Your budget range\n2️⃣ Car type preference\n3️⃣ Brand preference\n\nThen I'll show you matching cars! Ready to start?",
      options: ["Yes, let's start", "🔄 Start over", "📞 Talk to human"]
    };
  }
  
  if (message === "ℹ️ What can you do?") {
    return {
      message: "🤖 **I'm your AI car shopping assistant!**\n\nI can help you:\n✅ **Browse Used Cars** - Find cars within your budget\n✅ **Get Car Valuation** - Estimate your current car's value\n✅ **Contact Our Team** - Connect with our sales team\n✅ **About Us** - Learn about Sherpa Hyundai\n\nI make car shopping easy with simple questions and smart suggestions! 😊\n\nWhat would you like to explore?",
      options: ["🚗 Browse Used Cars", "💰 Get Car Valuation", "📞 Contact Our Team", "ℹ️ About Us"]
    };
  }

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

  console.log("🔍 DEBUG: Checking if step is 'done', current step:", session.step);
  // Handle 'done' step based on context (which flow the user came from)
  if (session.step === 'done') {
    console.log("🚨 CRITICAL DEBUG: Reached 'done' step routing!");
    console.log("🔍 DEBUG: Processing 'done' step, checking flow context...");
    console.log("🔍 DEBUG: Contact data:", { callback_name: session.callback_name, callback_phone: session.callback_phone, callback_time: session.callback_time });
    console.log("🔍 DEBUG: Valuation data:", { name: session.name, phone: session.phone, location: session.location });
    console.log("🔍 DEBUG: Browse data:", { selectedCar: session.selectedCar, filteredCars: session.filteredCars?.length, budget: session.budget });
    
    // Check if user came from contact flow
    if (session.callback_name || session.callback_phone || session.callback_time || session.callback_reason) {
      console.log("➡️ Routing to: Contact Us (done step from contact flow)");
      return handleContactUsStep(session, message);
    }
    // Check if user came from valuation flow
    if (session.name || session.phone || session.location || session.condition) {
      console.log("➡️ Routing to: Car Valuation (done step from valuation flow)");
      return handleCarValuationStep(session, message);
    }
    // Check if user came from browse flow
    if (session.selectedCar || session.filteredCars || session.budget) {
      console.log("➡️ Routing to: Browse Used Cars (done step from browse flow)");
      return handleBrowseUsedCars(session, message, pool);
    }
    console.log("⚠️ DEBUG: No flow context found for 'done' step, falling through to main menu");
  }

  if (session.step && (session.step.startsWith('about') || 
      ['about_menu', 'about_selection'].includes(session.step))) {
    console.log("➡️ Routing to: About Us");
    return handleAboutUsStep(session, message);
  }

  if (session.step && (session.step.startsWith('browse') || session.step === 'show_more_cars' || session.step === 'show_more_cars_after_images' || session.step === 'car_selected_options' || session.step.startsWith('test_drive') || session.step.startsWith('td_') || session.step === 'change_criteria_confirm' || session.step === 'modify_choices' || session.step === 'human_assistance')) {
    console.log("➡️ Routing to: Browse Used Cars (step: " + session.step + ")");
    return handleBrowseUsedCars(session, message, pool);
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
    console.log("🔍 Session step set to:", session.step);
    return handleBrowseUsedCars(session, message, pool);
  }

  // AI-powered intent classification fallback for unclear messages
  try {
    const ai = await parseUserIntent(pool, message);
    console.log("🤖 AI fallback classification:", ai);
    
    if (ai && ai.confidence > 0.3) {
      if (ai.intent === 'valuation') {
        session.step = 'valuation_start';
        console.log("🤖 AI classified as valuation → Routing to Car Valuation");
        return handleCarValuationStep(session, message);
      } else if (ai.intent === 'browse') {
        session.step = 'browse_start';
        console.log("🤖 AI classified as browse → Routing to Browse Cars");
        return handleBrowseUsedCars(session, message, pool);
      } else if (ai.intent === 'contact') {
        session.step = 'contact_start';
        console.log("🤖 AI classified as contact → Routing to Contact Us");
        return handleContactUsStep(session, message);
      } else if (ai.intent === 'about') {
        session.step = 'about_start';
        console.log("🤖 AI classified as about → Routing to About Us");
        return handleAboutUsStep(session, message);
      }
    }
  } catch (e) {
    console.log("🤖 AI fallback failed:", e.message);
  }

  // If AI couldn't classify or confidence too low, ask user to clarify
  if (!session.step || session.step === 'main_menu') {
    console.log("❓ Intent unclear, asking user to choose flow");
    return {
      message: `I apologize, but I'm not sure what you'd like to do. 😅 

Could you please choose one of these options so I can help you better?`,
      options: [
        "🚗 Browse Used Cars",
        "💰 Get Car Valuation", 
        "📞 Contact Our Team",
        "ℹ️ About Us"
      ]
    };
  }

  // Greet and start main menu if first message
  if (!session.step || ['hi', 'hello', 'hey','hy'].includes(lowerMsg)) {
    session.step = 'main_menu';
    console.log("🔁 Resetting to main menu");
    
    // Check if user already has details stored
    if (session.td_name && session.td_phone) {
      console.log("👤 User already has details stored:", { name: session.td_name, phone: session.td_phone });
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
    
    return getMainMenu(session);
  }

  // Check if user wants to start fresh (after completing a flow or when in main_menu)
  if (['hi', 'hello', 'hey', 'hy', 'start', 'begin', 'new', 'restart'].includes(lowerMsg)) {
    // If user is in main_menu and has completed flows, they want to start fresh
    if (session.step === 'main_menu' && (session.td_name || session.budget || session.filteredCars)) {
      console.log("🔄 User wants to start fresh from main_menu with existing data");
      // Clear all session data for fresh start
      Object.keys(session).forEach(key => delete session[key]);
      session.step = 'main_menu';
      return getMainMenu(session);
    }
    
    // If user is in completed flow states, start fresh
    if (session.step === 'done' || session.step === 'booking_complete' || session.step === 'conversation_ended' || session.conversationEnded) {
      console.log("🔄 User wants to start fresh after completing flow");
      // Clear all session data for fresh start
      Object.keys(session).forEach(key => delete session[key]);
      session.step = 'main_menu';
      return getMainMenu(session);
    }
  }

  // Handle potential name input when in main_menu
  if (session.step === 'main_menu' && !['browse', 'valuation', 'contact', 'about'].includes(lowerMsg)) {
    // Check if this looks like a name (2-50 characters, mostly letters)
    const namePattern = /^[a-zA-Z\s]{2,50}$/;
    if (namePattern.test(message.trim())) {
      console.log("👤 Detected potential name input:", message);
      session.td_name = message.trim();
      return {
        message: `Hello ${message.trim()}! 👋 Welcome to Sherpa Hyundai. I'm here to help you find your perfect used car. How can I assist you today?`,
        options: [
          "🚗 Browse Used Cars",
          "💰 Get Car Valuation",
          "📞 Contact Our Team",
          "ℹ️ About Us"
        ]
      };
    }
  }

  // Handle unknown messages by showing main menu
  console.log("⚠️ Unknown message, showing main menu");
  return getMainMenu(session);
}

// ✅ Correct export
exports.routeMessage = mainRouter;
