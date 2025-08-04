const pool = require('../db');
const { formatRupees, getAvailableTypes, getAvailableBrands, getCarsByFilter } = require('./carData');
const { getNextAvailableDays, getTimeSlots } = require('./timeUtils');

async function handleBrowseUsedCars(session, userMessage) {
  console.log("📩 Entered handleBrowseUsedCars");
  const step = session.step || 'browse_start';
  console.log("🧠 Current step:", step);
  console.log("📝 User input:", userMessage);

  switch (step) {
    case 'browse_start':
      console.log("🔄 Step matched: browse_start");
      session.step = 'browse_budget';
      return {
        message: "Great choice! Let's find your perfect car. First, what's your budget range?",
        options: [
          "Under ₹5 Lakhs",
          "₹5-10 Lakhs",
          "₹10-15 Lakhs",
          "₹15-20 Lakhs",
          "Above ₹20 Lakhs"
        ]
      };

    case 'browse_budget':
      console.log("🔄 Step matched: browse_budget");
      session.budget = userMessage;
      session.step = 'browse_type';
      const types = await getAvailableTypes(session.budget);
      return {
        message: `Perfect! ${userMessage} gives you excellent options. What type of car do you prefer?`,
        options: ['Any Type', ...types]
      };

    case 'browse_type':
      console.log("🔄 Step matched: browse_type");
      session.type = userMessage === 'Any Type' ? 'Any' : userMessage;
      session.step = 'browse_brand';
      const brands = await getAvailableBrands(session.budget, session.type);
      return {
        message: `Excellent choice! Which brand do you prefer?`,
        options: ['Any Brand', ...brands]
      };

    case 'browse_brand':
      console.log("🔄 Step matched: browse_brand");
      session.brand = userMessage === 'Any Brand' ? 'Any' : userMessage;
      session.step = 'show_cars';
      const cars = await getCarsByFilter(session.budget, session.type, session.brand);
      session.filteredCars = cars;
      session.carIndex = 0;
      
      if (cars.length === 0) {
        return {
          message: `Sorry, no cars found matching your criteria. Let's try different options.`,
          options: ["Change criteria"]
        };
      }
      
      return await getCarDisplayChunk(session);

    case 'show_more_cars':
      console.log("🔄 Step matched: show_more_cars");
      
      // Handle SELECT button responses
      if (userMessage === "SELECT") {
        const cars = session.filteredCars || [];
        const currentCar = cars[session.carIndex];
        
        if (currentCar) {
          session.selectedCar = `${currentCar.make} ${currentCar.model} ${currentCar.variant}`;
          session.step = 'car_selected_options';
          return {
            message: `Great choice! You've selected ${session.selectedCar}. What would you like to do next?`,
            options: ["Book Test Drive", "See More Cars", "Change My Criteria"]
          };
        }
      }
      
      // Handle SELECT button responses (format: book_Make_Model_Variant) - legacy support
      if (userMessage.startsWith("book_")) {
        const carId = userMessage;
        const cars = session.filteredCars || [];
        
        // Find the car by ID
        const selectedCar = cars.find(car => {
          const carIdFromCar = `book_${car.make}_${car.model}_${car.variant}`.replace(/\s+/g, '_');
          return carIdFromCar === carId;
        });
        
        if (selectedCar) {
          session.selectedCar = `${selectedCar.make} ${selectedCar.model} ${selectedCar.variant}`;
          session.step = 'car_selected_options';
          return {
            message: `Great choice! You've selected ${session.selectedCar}. What would you like to do next?`,
            options: ["Book Test Drive", "See More Cars", "Change My Criteria"]
          };
        }
      }
      
      // Handle "more" for pagination
      if (userMessage.toLowerCase() === "more") {
        session.carIndex += 3;
        return await getCarDisplayChunk(session);
      }
      
      // Handle "Change criteria" selection
      if (userMessage === "Change criteria") {
        session.step = 'browse_start';
        session.carIndex = 0; // Reset car index
        session.filteredCars = []; // Clear filtered cars
        session.selectedCar = null; // Clear selected car
        return {
          message: "No problem! Let's find you a different car. What's your budget range?",
          options: [
            "Under ₹5 Lakhs",
            "₹5-10 Lakhs",
            "₹10-15 Lakhs",
            "₹15-20 Lakhs",
            "Above ₹20 Lakhs"
          ]
        };
      }
      
      // Handle "Show More Cars" selection
      if (userMessage === "Show More Cars") {
        session.carIndex += 3;
        return await getCarDisplayChunk(session);
      }
      
      // If it's a car selection (legacy support)
      session.selectedCar = userMessage;
      session.step = 'test_drive_date';
      return {
        message: `Excellent! Let's schedule your ${userMessage} test drive. When would you prefer?`,
        options: ["Today", "Tomorrow", "Later this Week", "Next Week"]
      };

    case 'car_selected_options':
      console.log("🔄 Step matched: car_selected_options");
      
      if (userMessage === "Book Test Drive") {
        session.step = 'test_drive_date';
        return {
          message: `Excellent! Let's schedule your ${session.selectedCar} test drive. When would you prefer?`,
          options: ["Today", "Tomorrow", "Later this Week", "Next Week"]
        };
      }
      
      if (userMessage === "See More Cars") {
        session.carIndex += 3;
        const cars = session.filteredCars || [];
        
        if (session.carIndex >= cars.length) {
          return {
            message: "You've seen all available cars. Would you like to change your criteria?",
            options: ["Change My Criteria"]
          };
        }
        
        return await getCarDisplayChunk(session);
      }
      
      if (userMessage === "Change My Criteria") {
        session.step = 'browse_start';
        session.carIndex = 0; // Reset car index
        session.filteredCars = []; // Clear filtered cars
        session.selectedCar = null; // Clear selected car
        return {
          message: "No problem! Let's find you a different car. What's your budget range?",
          options: [
            "Under ₹5 Lakhs",
            "₹5-10 Lakhs",
            "₹10-15 Lakhs",
            "₹15-20 Lakhs",
            "Above ₹20 Lakhs"
          ]
        };
      }

    case 'test_drive_date':
      console.log("🔄 Step matched: test_drive_date");
      session.testDriveDate = userMessage;
      session.step = 'test_drive_day';
      if (["Today", "Tomorrow"].includes(userMessage)) {
        return {
          message: "Perfect! Which time works better for you?",
          options: getTimeSlots()
        };
      } else {
        return {
          message: "Which day works best for you?",
          options: getNextAvailableDays(userMessage)
        };
      }

    case 'test_drive_day':
      console.log("🔄 Step matched: test_drive_day");
      session.testDriveDay = userMessage;
      session.step = 'test_drive_time';
      return {
        message: "Perfect! What time works best?",
        options: getTimeSlots()
      };

    case 'test_drive_time':
      console.log("🔄 Step matched: test_drive_time");
      session.testDriveTime = userMessage;
      session.step = 'td_name';
      return { message: "Great! I need some details to confirm your booking:\n\n1. Your Name:" };

    case 'td_name':
      console.log("🔄 Step matched: td_name");
      session.td_name = userMessage;
      session.step = 'td_phone';
      return { message: "2. Your Phone Number:" };

    case 'td_phone':
      console.log("🔄 Step matched: td_phone");
      session.td_phone = userMessage;
      session.step = 'td_license';
      return {
        message: "3. Do you have a valid driving license?",
        options: ["Yes", "No"]
      };

    case 'td_license':
      console.log("🔄 Step matched: td_license");
      session.td_license = userMessage;
      session.step = 'td_location_mode';
      return {
        message: "Thank you! Where would you like to take the test drive?",
        options: ["Showroom pickup", "Home delivery"]
      };

    case 'td_location_mode':
      console.log("🔄 Step matched: td_location_mode");
      session.td_location_mode = userMessage;
      if (userMessage.includes("delivery")) {
        session.step = 'td_drop_location';
        return { message: "Please share your current location/address for the test drive:" };
      } else {
        session.step = 'done';
        return getTestDriveConfirmation(session);
      }

    case 'td_drop_location':
      console.log("🔄 Step matched: td_drop_location");
      session.td_drop_location = userMessage;
      session.step = 'done';
      return getTestDriveConfirmation(session);

    case 'change_criteria_confirm':
      console.log("🔄 Step matched: change_criteria_confirm");
      if (userMessage.toLowerCase().includes("yes") || userMessage.toLowerCase().includes("proceed")) {
        session.step = 'browse_start';
        return await handleBrowseUsedCars(session, "start over");
      } else {
        return { message: "Okay, keeping your current selection intact." };
      }

    default:
      console.log("❌ Step not recognized, restarting...");
      return { message: "Something went wrong. Let’s start again.", options: ["🏁 Start Again"] };
  }
}

async function getCarDisplayChunk(session) {
  const cars = session.filteredCars || [];
  
  if (cars.length === 0) {
    return { message: "No more cars to display.", options: ["Change criteria"] };
  }

  // Show up to 3 cars at a time
  const startIndex = session.carIndex;
  const endIndex = Math.min(startIndex + 3, cars.length);
  const carsToShow = cars.slice(startIndex, endIndex);

  const messages = [];
  
  for (let i = 0; i < carsToShow.length; i++) {
    const car = carsToShow[i];
    const file = `${car.make}_${car.model}_${car.variant}`.replace(/\s+/g, '_') + '.png';
    const url = `${process.env.NGROK_URL}/images/${file}`;
    const caption =
      `🚗 ${car.make} ${car.model} ${car.variant}\n` +
      `📅 Year: ${car.manufacturing_year}\n` +
      `⛽ Fuel: ${car.fuel_type}\n` +
      `💰 Price: ₹${car.estimated_selling_price}`;

    // Add image message
    messages.push({
      type: 'image',
      image: { link: url, caption: caption }
    });

    // Add SELECT button message
    const carId = `book_${car.make}_${car.model}_${car.variant}`.replace(/\s+/g, '_');
    messages.push({
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: 'SELECT' },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: carId,
                title: 'SELECT'
              }
            }
          ]
        }
      }
    });
  }

  const final = {
    message: `Showing cars ${startIndex + 1}-${endIndex} of ${cars.length}:`,
    messages: messages
  };
  session.step = 'show_more_cars';
  return final;
}

function getTestDriveConfirmation(session) {
  const locationText = (session.td_location_mode && session.td_location_mode.includes("showroom"))
    ? "\n📍 Showroom Address: [Sherpa Hyundai] Showroom 123 MG Road, Bangalore\n🅿️ Free parking available"
    : `\n📍 Test Drive Location: ${session.td_drop_location || 'To be confirmed'}`;

  return {
    message: `Perfect! Here's your test drive confirmation:

📋 TEST DRIVE CONFIRMED:
👤 Name: ${session.td_name || 'Not provided'}
📱 Phone: ${session.td_phone || 'Not provided'}
🚗 Car: ${session.selectedCar || 'Not selected'}
📅 Date: ${session.testDriveDate === 'Today' || session.testDriveDate === 'Tomorrow' ? session.testDriveDate : (session.testDriveDay || 'Not selected')}
⏰ Time: ${session.testDriveTime || 'Not selected'}
${locationText}

What to bring:
✅ Valid driving license
✅ Any photo ID
📞 Need help? Call us: +91-9876543210
Quick reminder: We'll also have financing options ready if you like the car during your test drive!
Looking forward to seeing you! 😊`
  };
}

module.exports = { handleBrowseUsedCars };
