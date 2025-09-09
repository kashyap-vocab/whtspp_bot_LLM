const { getAllBrands, getModelsByBrand } = require('./carData');
const { pool } = require('../db');

const YEAR_OPTIONS = [
  "2024", "2023", "2022", "2021", "2020", "Older than 2020"
];

const FUEL_OPTIONS = [
  "Petrol", "Diesel", "CNG", "Electric"
];

const KM_OPTIONS = [
  "Under 10,000 KM",
  "10,000 - 25,000 KM",
  "25,000 - 50,000 KM",
  "50,000 - 75,000 KM",
  "75,000 - 1,00,000 KM",
  "Over 1,00,000 KM"
];

const OWNER_OPTIONS = [
  "1st Owner (Me)",
  "2nd Owner",
  "3rd Owner",
  "More than 3 owners"
];

const CONDITION_OPTIONS = [
  "Excellent (Like new)",
  "Good (Minor wear)",
  "Average (Normal wear)",
  "Fair (Needs some work)"
];

async function handleCarValuationStep(session, userMessage) {
  const state = session.step || 'start';
console.log("🧠 Current step:", state);
console.log("📝 User input:", userMessage);
  switch (state) {
    case 'start':
      session.step = 'brand';
      return {
        message: "Great! I'll help you get an valuation for your car. Let's start with some basic details.\n\nFirst, which brand is your car?",
        options: [...await getAllBrands(), "Other brands"]
      };

    case 'brand':
      if (userMessage === 'Other brands') {
        session.step = 'other_brand_input';
        return { message: "Please type the brand name of your car." };
      } else {
        session.brand = userMessage;
        session.step = 'model';
        console.log("Selected brand:", userMessage);
const models = await getModelsByBrand(userMessage);
console.log("Models found:", models);

        return {
          message: `Perfect! Which ${userMessage} model do you have?`,
          options: [...models, `Other ${userMessage} models`]
        
        };
        
      }

    case 'other_brand_input':
      session.brand = userMessage;
      session.step = 'other_model_input';
      return { message: `Perfect? Please write down which model car do you have?` };

    case 'model':
      if (userMessage.toLowerCase().includes("other")) {
        session.step = 'other_model_input';
        return { message: `Perfect? Please write down which model car do you have?` };
      } else {
        session.model = userMessage;
        session.step = 'year';
        return {
          message: `Excellent! What year is your ${session.model}?`,
          options: YEAR_OPTIONS
        };
      }

    case 'other_model_input':
      session.model = userMessage;
      session.step = 'year';
      return {
        message: `Excellent! What year is your ${session.model}?`,
        options: YEAR_OPTIONS
      };

    case 'year':
      session.year = userMessage;
      session.step = 'fuel';
      return {
        message: `Great! What's the fuel type of your ${session.year} ${session.model}?`,
        options: FUEL_OPTIONS
      };

    case 'fuel':
      session.fuel = userMessage;
      session.step = 'kms';
      return {
        message: "Perfect! How many kilometers has your car been driven?",
        options: KM_OPTIONS
      };

    case 'kms':
      session.kms = userMessage;
      session.step = 'owner';
      return {
        message: "Almost done! How many owners has this car had?",
        options: OWNER_OPTIONS
      };

    case 'owner':
      session.owner = userMessage;
      session.step = 'condition';
      return {
        message: "Last question! How would you rate your car's overall condition?",
        options: CONDITION_OPTIONS
      };

    case 'condition':
      session.condition = userMessage;
      session.step = 'name';
      return {
        message: "Great! We'd love to purchase your car. Let me collect your details:\n\n1. Your Name:"
      };

    case 'name':
      session.name = userMessage;
      session.step = 'phone';
      return { message: "2. Your Phone Number:" };

    case 'phone':
      session.phone = userMessage;
      session.step = 'location';
      return { message: "3. Your Current Location/City:" };

    case 'location':
      session.location = userMessage;
      session.step = 'done';

      const confirmation = {
        name: session.name,
        phone: session.phone,
        location: session.location,
        car_summary: `${session.year} ${session.brand} ${session.model} ${session.fuel}`,
        kms: session.kms,
        owner: session.owner,
        condition: session.condition
      };

      // ✅ Save to database
      await pool.query(
        `INSERT INTO car_valuations
        (name, phone, location, brand, model, year, fuel, kms, owner, condition)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          confirmation.name,
          confirmation.phone,
          confirmation.location,
          session.brand,
          session.model,
          session.year,
          session.fuel,
          session.kms,
          session.owner,
          session.condition
        ]
      );

      return {
        message:
`Perfect ${confirmation.name}! Here's what happens next:

📋 SELLER CONFIRMATION:
👤 Name: ${confirmation.name}
📱 Phone: ${confirmation.phone}
🚗 Car: ${confirmation.car_summary}
📍 Location: ${confirmation.location}

📅 Next Steps:
1. Our executive will call you within 2 hours
2. We'll schedule a physical inspection
3. Final price quote after inspection
4. Instant payment if you accept our offer

📞 Questions? Call: +91-9876543210
Thank you for choosing Sherpa Hyundai! 😊`
      };

    default:
      return { message: "Something went wrong. Please try again." };
  }
}

module.exports = { handleCarValuationStep };
