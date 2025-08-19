require('dotenv').config();
const axios = require('axios');

async function testWebhook() {
  console.log('🧪 Testing Webhook Endpoint\n');

  const baseURL = 'http://localhost:3000';
  
  // Test health endpoint first
  try {
    console.log('📡 Testing health endpoint...');
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log('✅ Health endpoint working:', healthResponse.data);
  } catch (error) {
    console.error('❌ Health endpoint failed:', error.message);
    return;
  }

  // Test webhook verification
  try {
    console.log('\n📡 Testing webhook verification...');
    const verifyResponse = await axios.get(`${baseURL}/webhook?hub.mode=subscribe&hub.verify_token=auto&hub.challenge=test123`);
    console.log('✅ Webhook verification working');
  } catch (error) {
    console.error('❌ Webhook verification failed:', error.message);
  }

  // Test webhook message processing
  const testMessages = [
    {
      name: "Simple greeting",
      body: {
        object: "whatsapp_business_account",
        entry: [{
          changes: [{
            value: {
              messaging_product: "whatsapp",
              metadata: { phone_number_id: "test_phone_id" },
              contacts: [{ wa_id: "1234567890" }],
              messages: [{
                from: "1234567890",
                text: { body: "Hi" }
              }]
            }
          }]
        }]
      }
    },
    {
      name: "Browse cars option",
      body: {
        object: "whatsapp_business_account",
        entry: [{
          changes: [{
            value: {
              messaging_product: "whatsapp",
              metadata: { phone_number_id: "test_phone_id" },
              contacts: [{ wa_id: "1234567890" }],
              messages: [{
                from: "1234567890",
                text: { body: "🚗 Browse Used Cars" }
              }]
            }
          }]
        }]
      }
    },
    {
      name: "Out-of-context question",
      body: {
        object: "whatsapp_business_account",
        entry: [{
          changes: [{
            value: {
              messaging_product: "whatsapp",
              metadata: { phone_number_id: "test_phone_id" },
              contacts: [{ wa_id: "1234567890" }],
              messages: [{
                from: "1234567890",
                text: { body: "Help me cook biryani" }
              }]
            }
          }]
        }]
      }
    }
  ];

  for (const testCase of testMessages) {
    try {
      console.log(`\n📝 Testing: ${testCase.name}`);
      const response = await axios.post(`${baseURL}/webhook`, testCase.body, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log(`✅ ${testCase.name} processed successfully`);
    } catch (error) {
      console.error(`❌ ${testCase.name} failed:`, error.message);
    }
  }

  console.log('\n🎉 Webhook testing completed!');
}

// Run the test
testWebhook().catch(console.error);
