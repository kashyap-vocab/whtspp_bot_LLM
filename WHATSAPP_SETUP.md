# WhatsApp Webhook Setup Guide

## Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# WhatsApp Business API Configuration
WHATSAPP_API_TOKEN=your_whatsapp_api_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_VERIFY_TOKEN=your_verify_token_here

# Server Configuration
PORT=3000
```

## Webhook Configuration Steps

### 1. Set Up Your Verify Token
- Choose a secure verify token (e.g., `my_secure_token_123`)
- Add it to your `.env` file as `WHATSAPP_VERIFY_TOKEN`
- Use the same token in your WhatsApp Business API dashboard

### 2. Configure Webhook URL
In your WhatsApp Business API dashboard:
- **Webhook URL**: `https://your-domain.com/webhook`
- **Verify Token**: Use the same token from your `.env` file
- **Webhook Fields**: Subscribe to `messages` events

### 3. Test Your Webhook
1. Start your server: `npm start`
2. Make sure your server is accessible from the internet (use ngrok for local development)
3. Configure the webhook URL in WhatsApp dashboard
4. The verification should succeed if tokens match

## Troubleshooting

### "Callback URL or verify token couldn't be validated"
- **Check verify token**: Ensure it matches exactly between your code and WhatsApp dashboard
- **Check webhook URL**: Make sure the URL is accessible and returns a 200 status
- **Check server logs**: Look for verification failure messages in your console

### Common Issues
1. **Token mismatch**: Verify tokens don't match between code and dashboard
2. **URL not accessible**: Webhook URL is not publicly accessible
3. **Server not running**: Your server is not running when verification is attempted
4. **Wrong port**: Server is running on a different port than expected

## Local Development with ngrok

If testing locally, use ngrok to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Expose your local server
ngrok http 3000

# Use the ngrok URL as your webhook URL
# Example: https://abc123.ngrok.io/webhook
```

## Security Notes
- Keep your verify token secure and unique
- Use environment variables, never hardcode tokens
- Regularly rotate your API tokens
- Monitor webhook logs for suspicious activity 