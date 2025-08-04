require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const { routeMessage } = require('./utils/mainRouter');
const sessions = {}; 

const app = express();
app.use(bodyParser.json());

app.use('/images', express.static('images'));
const WHATSAPP_TOKEN = process.env.WHATSAPP_API_TOKEN;
const API_BASE_URL = `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

// Webhook Verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'auto';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Webhook verification failed');
    console.log('Expected token:', VERIFY_TOKEN);
    console.log('Received token:', token);
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  try {
    const entry = req.body?.entry?.[0]?.changes?.[0]?.value;
    const msg = entry?.messages?.[0];
    const from = msg?.from;

    // Support for text and button replies
    const userMsg =
      msg?.text?.body ||
      msg?.interactive?.list_reply?.title ||
      msg?.interactive?.button_reply?.title;

    if (from && userMsg) {
      if (!sessions[from]) sessions[from] = {};

      console.log('\n📩 Incoming Message');
      console.log('From:', from);
      console.log('Message:', userMsg);
      console.log('Session Before:', JSON.stringify(sessions[from], null, 2));

     const response = await routeMessage(sessions[from], userMsg);
      console.log('Session After:', JSON.stringify(sessions[from], null, 2));
      console.log('----------------------------------');

      await sendWhatsAppMessage(from, response.message, response.options || [], response.messages || []);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Error handling webhook:', err.message);
    res.sendStatus(500);
  }
});

// Send WhatsApp Message
async function sendWhatsAppMessage(to, text, options = [], messages = []) {
  try {
    console.log("📨 Preparing to send message to:", to);
    console.log("📝 Message Text:", text);
    console.log("🧩 Options:", options);
    console.log("📸 Messages:", messages);

    // If we have messages array (for car images and buttons), send them first
    if (messages && messages.length > 0) {
      console.log("📸 Sending car messages...");
      
      for (const msg of messages) {
        try {
          let payload = {
            messaging_product: 'whatsapp',
            to,
            ...msg
          };

          console.log("📦 Message Payload:", JSON.stringify(payload, null, 2));
          
          const response = await axios.post(API_BASE_URL, payload, {
            headers: {
              Authorization: `Bearer ${WHATSAPP_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log("✅ Message sent successfully");

          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error("❌ Failed to send message:", error.message);
          if (error.response) {
            console.error("🔻 Response Data:", JSON.stringify(error.response.data, null, 2));
          }
        }
      }
    }

    let payload;

    if (options.length > 0) {
      const isList = options.length > 3;
      const action = isList
        ? {
            button: 'Choose',
            sections: [
              {
                title: 'Available Options',
                rows: options.map((opt, i) => ({
                  id: `option_${i + 1}`,
                  title: opt
                }))
              }
            ]
          }
        : {
            buttons: options.map((opt, i) => ({
              type: 'reply',
              reply: { id: `option_${i + 1}`, title: opt }
            }))
          };

      payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type: isList ? 'list' : 'button',
          body: { text },
          ...(isList ? { footer: { text: 'Tap to choose from list' } } : {}),
          action
        }
      };

      console.log("📦 Payload (Interactive):", JSON.stringify(payload, null, 2));
    } else {
      payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text }
      };

      console.log("📦 Payload (Text):", JSON.stringify(payload, null, 2));
    }

    const response = await axios.post(API_BASE_URL, payload, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log("✅ WhatsApp API response status:", response.status);
    console.log("📬 Message successfully sent!");
    return response;
  } catch (error) {
    console.error("❌ Failed to send WhatsApp message:");
    if (error.response) {
      console.error("🔻 Response Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("❗ Error Message:", error.message);
    }
  }
}


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server live at http://localhost:${PORT}`);
});
