# Image Upload System Documentation

## Overview
The AutoSherpa inventory management system automatically saves all uploaded car images to the local file system using the car's registration number as the directory structure.

## Directory Structure
```
uploads/
├── cars/
│   ├── KA13AB0997/           # Registration number directory
│   │   ├── KA13AB0997_1.jpg  # Front view
│   │   ├── KA13AB0997_2.jpg  # Back view
│   │   ├── KA13AB0997_3.jpg  # Side view
│   │   └── KA13AB0997_4.jpg  # Interior view
│   ├── DL46AB0011/           # Another car's directory
│   │   ├── DL46AB0011_1.png  # Front view (PNG format)
│   │   ├── DL46AB0011_2.jpeg # Back view (JPEG format)
│   │   └── DL46AB0011_3.jpg  # Side view
│   └── temp/                  # Temporary files (auto-cleaned)
│       └── temp_1234567890_image.jpg
```

## How It Works

### 1. Image Upload Process
- When a user uploads images for a car, they must provide the registration number
- Images are automatically saved to `uploads/cars/{registration_number}/`
- Each image is named using the pattern: `{registration_number}_{sequence_number}.{extension}`
- Original file extensions are preserved (JPG, PNG, JPEG, GIF)

### 2. File Naming Convention
- **Front View**: `{registration_number}_1.{ext}`
- **Back View**: `{registration_number}_2.{ext}`
- **Side View**: `{registration_number}_3.{ext}`
- **Interior View**: `{registration_number}_4.{ext}`

### 3. Database Storage
- Image paths are stored in the `car_images` table
- Each image record includes:
  - `car_id`: Reference to the car
  - `image_path`: Full path (e.g., `uploads/cars/KA13AB0997/KA13AB0997_1.jpg`)
  - `image_type`: Type of image (front, back, side, interior)

### 4. WhatsApp Integration
- Images are served via HTTP endpoints
- URLs are constructed as: `{base_url}/{image_path}`
- Example: `https://your-domain.com/uploads/cars/KA13AB0997/KA13AB0997_1.jpg`

## Configuration

### Environment Variables
```bash
# Required for WhatsApp to access images
NGROK_URL=https://your-ngrok-subdomain.ngrok.app

# Server ports
PORT=3000                    # Inventory system
WHATSAPP_PORT=3001          # WhatsApp bot
```

### File Permissions
- Ensure the `uploads/` directory is writable by the application
- The system automatically creates directories as needed

## API Endpoints

### Upload Images
```
POST /api/upload-car-images
Content-Type: multipart/form-data

Body:
- images: Array of image files (max 4)
- registrationNumber: Car registration number
- imageTypes: JSON array of image types
- imageIndices: JSON array of sequence numbers
```

### Debug Information
```
GET /api/debug/cars-images
```
Returns detailed information about cars and their images, including file system verification.

## Automatic Cleanup

### Temp Files
- Temporary files older than 1 hour are automatically removed
- Cleanup runs on server startup
- Temp files are only created when registration number is missing

### Image Path Cleanup
- Old image paths are automatically updated to new naming convention
- Orphaned files are cleaned up
- Database records are synchronized with actual files

## Troubleshooting

### Images Not Showing in WhatsApp
1. Check if `NGROK_URL` is set in `.env`
2. Verify the URL is accessible from the internet
3. Check file permissions on the uploads directory
4. Use the debug endpoint to verify file system status

### File Upload Errors
1. Ensure registration number is provided
2. Check file format (only images allowed)
3. Verify directory permissions
4. Check server logs for detailed error messages

### Missing Images
1. Use debug endpoint to check file system vs database
2. Verify images exist in correct directory
3. Check image naming convention
4. Ensure file extensions match

## Example Usage

### Frontend Upload
```javascript
const formData = new FormData();
formData.append('registrationNumber', 'KA13AB0997');
formData.append('imageTypes', JSON.stringify(['front', 'back', 'side', 'interior']));
formData.append('imageIndices', JSON.stringify([0, 1, 2, 3]));

// Add image files
for (let i = 0; i < imageFiles.length; i++) {
    formData.append('images', imageFiles[i]);
}

fetch('/api/upload-car-images', {
    method: 'POST',
    body: formData
});
```

### WhatsApp Bot Access
```javascript
// In handleBrowseUsedCars.js
const imageUrl = `${process.env.NGROK_URL || 'http://localhost:3000'}/${imagePath}`;
// imagePath example: uploads/cars/KA13AB0997/KA13AB0997_1.jpg
```

## Benefits

1. **Organized Storage**: Each car has its own directory
2. **Predictable Naming**: Easy to locate and manage images
3. **Extension Preservation**: Original file formats are maintained
4. **Automatic Cleanup**: No orphaned files or directories
5. **WhatsApp Compatible**: Images are served with proper URLs
6. **Database Sync**: File system and database stay synchronized

## Security Considerations

- Only authenticated users can upload images
- File types are validated (images only)
- Maximum file size limits are enforced
- Images are stored in a dedicated uploads directory
- No direct file system access from web requests
