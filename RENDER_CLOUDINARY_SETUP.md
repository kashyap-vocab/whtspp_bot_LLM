# Render + Cloudinary Setup Guide

## Problem
When hosting on Render's free tier, the file system is ephemeral (temporary). Any files uploaded to the `uploads/` folder will be lost when the container restarts, causing images to disappear.

## Solution: Cloudinary Integration
We've implemented a hybrid system that automatically uses Cloudinary for image storage when available, with local storage as fallback for development.

## Step 1: Create Cloudinary Account

1. Go to [https://cloudinary.com/](https://cloudinary.com/)
2. Sign up for a free account
3. After login, go to Dashboard
4. Note down your:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

## Step 2: Configure Environment Variables on Render

1. Go to your Render dashboard
2. Select your web service
3. Go to **Environment** tab
4. Add these variables:

```bash
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

5. Click **Save Changes**
6. **Redeploy** your service

## Step 3: How It Works

### Automatic Detection
- If `CLOUDINARY_CLOUD_NAME` is set → Uses Cloudinary storage
- If not set → Falls back to local storage (for development)

### Image Storage
- **Cloudinary**: Images are uploaded to cloud and URLs are stored in database
- **Local**: Images are saved to `uploads/cars/{registration_number}/` folders

### WhatsApp Integration
- **Cloudinary URLs**: Used directly (e.g., `https://res.cloudinary.com/...`)
- **Local paths**: Constructed with your domain (e.g., `https://your-app.onrender.com/uploads/...`)

## Step 4: Test the Setup

1. **Upload an image** through your website
2. **Check the logs** - you should see:
   ```
   ☁️ Cloudinary image uploaded: https://res.cloudinary.com/...
   ```
3. **Check database** - `image_path` should contain Cloudinary URL
4. **Test WhatsApp** - images should now display properly

## Step 5: Migration (Optional)

If you have existing local images, you can migrate them to Cloudinary:

1. **Export your database** to get current image paths
2. **Upload images to Cloudinary** manually or via API
3. **Update database** with new Cloudinary URLs
4. **Redeploy** with Cloudinary enabled

## Benefits of This Solution

✅ **Persistent Storage**: Images never get lost on Render
✅ **Automatic Fallback**: Works locally without Cloudinary
✅ **WhatsApp Compatible**: Images display properly in chat
✅ **Scalable**: Cloudinary handles image optimization
✅ **Free Tier**: Generous free tier available
✅ **No Code Changes**: Automatic detection and switching

## Troubleshooting

### Images Still Not Showing
1. Check if Cloudinary environment variables are set
2. Verify Cloudinary credentials are correct
3. Check Render logs for Cloudinary upload messages
4. Ensure service was redeployed after adding environment variables

### Cloudinary Upload Errors
1. Verify API key and secret are correct
2. Check if Cloudinary account is active
3. Verify image file formats are supported
4. Check Cloudinary dashboard for usage limits

### Local Development
- Remove Cloudinary environment variables to use local storage
- Images will be saved to `uploads/cars/` folders
- Perfect for development and testing

## Alternative Solutions

### Option 1: Render Persistent Disk (Paid)
- Upgrade to Render's paid plan
- Use persistent disk for file storage
- Keep current local file system approach

### Option 2: AWS S3
- More complex setup
- More control over storage
- Higher costs for small projects

### Option 3: Google Cloud Storage
- Similar to AWS S3
- Good free tier
- More complex configuration

## Recommended Approach

**Use Cloudinary** - it's the simplest solution that:
- Solves the Render ephemeral storage problem
- Requires minimal configuration
- Has a generous free tier
- Automatically optimizes images
- Works seamlessly with WhatsApp

## Next Steps

1. **Set up Cloudinary account**
2. **Add environment variables to Render**
3. **Redeploy your service**
4. **Test image uploads**
5. **Verify WhatsApp image display**

Your images will now persist on Render and display properly in WhatsApp! 🎉
