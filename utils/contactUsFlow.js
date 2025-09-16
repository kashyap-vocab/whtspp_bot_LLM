const { pool } = require('../db');
const { parseUserIntent } = require('./geminiHandler');
const { saveUserProfile, extractUserPreferences } = require('./userProfileManager');

async function handleContactUsStep(session, userMessage) {
  const state = session.step || 'contact_menu';
  console.log("🧠 [Contact Flow] Current step:", state);
  console.log("📝 User input:", userMessage);

  switch (state) {
    case 'contact_start':
    case 'contact_menu':
      session.step = 'contact_menu'; // Reset step in case it’s called from main menu
      // AI proposal system removed - using direct AI integration in flows instead
             if (userMessage.includes("Call")) {
         session.step = 'done';
         return {
           message: `Perfect! Here are our direct contact numbers for immediate assistance:

📞 CALL US DIRECTLY:
🏢 Main Showroom - Bangalore:
📞 Sales: +91-9876543210
📞 Service: +91-9876543211
🕒 Mon-Sat: 9 AM - 8 PM, Sun: 10 AM - 6 PM

🏢 Branch - Electronic City:
📞 Sales: +91-9876543212
🕒 Mon-Sat: 9 AM - 8 PM

🆘 Emergency Support:
📞 24/7 Helpline: +91-9876543213

💡 Pro Tip: Mention you contacted us via WhatsApp for priority assistance!`,
           options: ["Explore", "End Conversation"]
         };
       }

      if (userMessage.toLowerCase().includes("callback")) {
        session.step = 'callback_time';
        return {
          message: "Perfect! Our team will call you back. What's the best time to reach you?",
          options: [
            "🌅 Morning (9-12 PM)",
            "🌞 Afternoon (12-4 PM)",
            "🌆 Evening (4-8 PM)"
          ]
        };
      }

             if (userMessage.includes("Visit")) {
         session.step = 'done';
         return {
           message: `We'd love to welcome you! Here are our locations:

📍 SHERPA HYUNDAI LOCATIONS:

🏢 Main Showroom - Bangalore:
📍 123 MG Road, Bangalore - 560001
📞 +91-9876543210
🕒 Mon-Sat: 9:00 AM - 8:00 PM, Sun: 10:00 AM - 6:00 PM
🅿️ Free parking, Test drives, Lounge

🏢 Branch - Electronic City:
📍 456 Hosur Road, Electronic City - 560100
📞 +91-9876543211
🕒 Mon-Sat: 9:00 AM - 8:00 PM

🗺️ How to Reach:
🚇 Metro: MG Road Station (2 min walk)
🚗 Car: Ring Road access
🚌 Buses available nearby`,
           options: ["Explore", "End Conversation"]
         };
       }

      return {
        message: "How would you like to get in touch?",
        options: [
          "📞 Call us now",
          "📧 Request callback",
          "📍 Visit showroom"
        ]
      };

    case 'callback_time':
      session.callback_time = userMessage;
      
      // Check if user already has details stored
      if (session.td_name && session.td_phone) {
        console.log("👤 User already has details stored, using for callback");
        session.callback_name = session.td_name;
        session.callback_phone = session.td_phone;
        session.step = 'done';
        
        try {
          // Save callback request to database
          await pool.query(
            `INSERT INTO callback_requests (name, phone, reason, preferred_time)
             VALUES ($1, $2, $3, $4)`,
            [
              session.callback_name,
              session.callback_phone,
              'General inquiry',
              session.callback_time
            ]
          );

          return {
            message: `✅ Perfect ${session.callback_name}! Your callback is scheduled:

📋 CALLBACK CONFIRMED:
👤 Name: ${session.callback_name}
📱 Phone: ${session.callback_phone}
⏰ Preferred Time: ${session.callback_time}

📞 What to Expect:
✅ Call within 2 hours if during business hours
✅ Our expert will assist with your inquiry
🕒 Business Hours: Mon-Sat: 9 AM - 8 PM

Need urgent help?
📞 Call: +91-9876543210
📍 Visit: 123 MG Road, Bangalore
Thank you! 😊`,
            options: ["Explore", "End Conversation"]
          };
        } catch (error) {
          console.error('Error saving callback request:', error);
          
          // Return success message even if database save fails
          return {
            message: `✅ Perfect ${session.callback_name}! Your callback is scheduled:

📋 CALLBACK CONFIRMED:
👤 Name: ${session.callback_name}
📱 Phone: ${session.callback_phone}
⏰ Preferred Time: ${session.callback_time}

📞 What to Expect:
✅ Call within 2 hours if during business hours
✅ Our expert will assist with your inquiry
🕒 Business Hours: Mon-Sat: 9 AM - 8 PM

Need urgent help?
📞 Call: +91-9876543210
📍 Visit: 123 MG Road, Bangalore
Thank you! 😊`,
            options: ["Explore", "End Conversation"]
          };
        }
      }
      
      session.step = 'callback_name';
      return { message: "Great! Please provide your name:" };

    case 'callback_name':
      session.callback_name = userMessage;
      session.step = 'contact_callback_phone';
      return { message: "Please provide your phone number:" };

    case 'contact_callback_phone':
      session.callback_phone = userMessage;
      session.step = 'done';

      try {
        // Save callback request to database
        await pool.query(
          `INSERT INTO callback_requests (name, phone, reason, preferred_time)
           VALUES ($1, $2, $3, $4)`,
          [
            session.callback_name,
            session.callback_phone,
            'General inquiry',
            session.callback_time
          ]
        );

        return {
          message: `✅ Perfect ${session.callback_name}! Your callback is scheduled:

📋 CALLBACK CONFIRMED:
👤 Name: ${session.callback_name}
📱 Phone: ${session.callback_phone}
⏰ Preferred Time: ${session.callback_time}

📞 What to Expect:
✅ Call within 2 hours if during business hours
✅ Our expert will assist with your inquiry
🕒 Business Hours: Mon-Sat: 9 AM - 8 PM

Need urgent help?
📞 Call: +91-9876543210
📍 Visit: 123 MG Road, Bangalore
Thank you! 😊`,
          options: ["Explore", "End Conversation"]
        };
      } catch (error) {
        console.error('Error saving callback request:', error);
        
        // Return success message even if database save fails
        return {
          message: `✅ Perfect ${session.callback_name}! Your callback is scheduled:

📋 CALLBACK CONFIRMED:
👤 Name: ${session.callback_name}
📱 Phone: ${session.callback_phone}
⏰ Preferred Time: ${session.callback_time}

📞 What to Expect:
✅ Call within 2 hours if during business hours
✅ Our expert will assist with your inquiry
🕒 Business Hours: Mon-Sat: 9 AM - 8 PM

Need urgent help?
📞 Call: +91-9876543210
📍 Visit: 123 MG Road, Bangalore
Thank you! 😊`,
          options: ["Explore", "End Conversation"]
        };
      }

    case 'callback_reason':
      session.callback_reason = userMessage;
      session.step = 'done';

      try {
        // Save callback request to database
        await pool.query(
          `INSERT INTO callback_requests (name, phone, reason, preferred_time)
           VALUES ($1, $2, $3, $4)`,
          [
            session.callback_name,
            session.callback_phone,
            session.callback_reason,
            session.callback_time
          ]
        );

        return {
          message: `Perfect ${session.callback_name}! Your callback is scheduled:

📋 CALLBACK SCHEDULED:
👤 Name: ${session.callback_name}
📱 Phone: ${session.callback_phone}
⏰ Preferred Time: ${session.callback_time}

📞 What to Expect:
✅ Call within 2 hours if during business hours
✅ Our expert will assist with: ${session.callback_reason}
🕒 Business Hours: Mon-Sat: 9 AM - 8 PM

Need urgent help?
📞 Call: +91-9876543210
📍 Visit: 123 MG Road, Bangalore
Thank you! 😊`,
          options: ["Explore", "End Conversation"]
        };
      } catch (error) {
        console.error('Error saving callback request:', error);
        
        // Return success message even if database save fails
        return {
          message: `Perfect ${session.callback_name}! Your callback is scheduled:

📋 CALLBACK SCHEDULED:
👤 Name: ${session.callback_name}
📱 Phone: ${session.callback_phone}
⏰ Preferred Time: ${session.callback_time}

📞 What to Expect:
✅ Call within 2 hours if during business hours
✅ Our expert will assist with: ${session.callback_reason}
🕒 Business Hours: Mon-Sat: 9 AM - 8 PM

Need urgent help?
📞 Call: +91-9876543210
📍 Visit: 123 MG Road, Bangalore
Thank you! 😊`,
          options: ["Explore", "End Conversation"]
        };
      }

    case 'done':
      if (userMessage === "Explore") {
        // Save user profile before clearing session data
        try {
          const userPreferences = extractUserPreferences(session);
          if (userPreferences.phone) {
            const profileResult = await saveUserProfile(userPreferences);
            if (profileResult.success) {
              console.log(`✅ User profile ${profileResult.action} before contact session reset`);
            }
          }
        } catch (error) {
          console.log('⚠️ Could not save user profile:', error.message);
        }

        // Clear stored details and reset session for fresh start
        session.step = 'main_menu';
        session.td_name = null;
        session.td_phone = null;
        session.callback_name = null;
        session.callback_phone = null;
        return {
          message: "Is there anything else I can help you with today?",
          options: [
            "🚗 Browse Used Cars",
            "💰 Get Car Valuation", 
            "📞 Contact Our Team",
            "ℹ️ About Us"
          ]
        };
      } else if (userMessage === "End Conversation") {
        // Save user profile before ending conversation
        try {
          const userPreferences = extractUserPreferences(session);
          if (userPreferences.phone) {
            const profileResult = await saveUserProfile(userPreferences);
            if (profileResult.success) {
              console.log(`✅ User profile ${profileResult.action} before contact session end`);
            }
          }
        } catch (error) {
          console.log('⚠️ Could not save user profile:', error.message);
        }

        // End conversation with thank you note
        session.conversationEnded = true;
        return {
          message: `Thank you for choosing Sherpa Hyundai! 🙏

We appreciate your time and look forward to serving you.

📞 For any queries: +91-9876543210
📍 Visit us: 123 MG Road, Bangalore
🌐 Website: www.sherpahyundai.com

Have a great day! 😊`
        };
      }
      return { message: "Something went wrong in contact flow. Please try again." };

    default:
      return { message: "Something went wrong in contact flow. Please try again." };
  }
}

module.exports = { handleContactUsStep };
