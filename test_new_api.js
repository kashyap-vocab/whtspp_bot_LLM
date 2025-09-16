// Test the updated Gemini API key
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

console.log('🔑 Testing Updated API Key...');
console.log('📊 Key:', process.env.GEMINI_API_KEY);
console.log('📊 Length:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testNewAPI() {
  try {
    console.log('🚀 Creating model...');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    console.log('📡 Making API call...');
    const result = await model.generateContent('Say "API is working perfectly!"');
    const text = result.response.text();
    
    console.log('✅ SUCCESS! API Response:', text);
    console.log('🎉 Gemini API is now working!');
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
    
    // Try with gemini-1.5-flash as fallback (lower quota usage)
    try {
      console.log('🔄 Trying gemini-1.5-flash model...');
      const model2 = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result2 = await model2.generateContent('Say "Fallback API working!"');
      const text2 = result2.response.text();
      console.log('✅ FALLBACK SUCCESS:', text2);
    } catch (error2) {
      console.error('❌ Fallback also failed:', error2.message);
    }
  }
}

testNewAPI().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}).catch(err => {
  console.error('💥 Test crashed:', err);
  process.exit(1);
});
