// image-uploader.js

// Global variables for image management
let uploadedImages = {
    front: null,
    back: null,
    side: null,
    interior: null
};
let stream = null;
let capturedImage = null;
let selectedImageType = null;

// Select image function
function selectImage(type) {
    selectedImageType = type;
    document.getElementById(`${type}Image`).click();
}

// Preview image function
function previewImage(type, input) {
    const file = input.files[0];
    if (file) {
        uploadedImages[type] = file;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewDiv = document.getElementById(`${type}ImagePreview`);
            previewDiv.innerHTML = `
                <img src="${e.target.result}" class="image-preview" alt="${type} view">
                <div class="image-type-label">${type.toUpperCase()} VIEW</div>
            `;
            
            document.getElementById(`${type}ImageArea`).classList.add('has-image');
        };
        reader.readAsDataURL(file);
        
        checkUploadReady();
    }
}

// Check if ready to upload
function checkUploadReady() {
    const allImagesUploaded = Object.values(uploadedImages).every(img => img !== null);
    document.getElementById('uploadBtn').disabled = !allImagesUploaded;
}

async function convertToJpeg(fileOrDataUrl, fileName) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        if (fileOrDataUrl instanceof File) {
            const reader = new FileReader();
            reader.onload = e => {
                img.src = e.target.result;
            };
            reader.readAsDataURL(fileOrDataUrl);
        } else if (typeof fileOrDataUrl === "string" && fileOrDataUrl.startsWith("data:image/")) {
            img.src = fileOrDataUrl;
        } else {
            return reject("Unsupported input format");
        }

        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(
                blob => {
                    if (!blob) return reject("JPEG conversion failed");
                    const jpegFile = new File([blob], fileName, { type: "image/jpeg" });
                    resolve(jpegFile);
                },
                "image/jpeg",
                0.9 // quality
            );
        };
        img.onerror = err => reject(err);
    });
}


// Upload images
async function uploadImages() {
    if (!currentCarId) {
        alert('Please select a car first');
        return;
    }
    
    const allImagesUploaded = Object.values(uploadedImages).every(img => img !== null);
    if (!allImagesUploaded) {
        alert('Please upload all 4 images');
        return;
    }
    
    // Show progress
    document.getElementById('uploadProgress').style.display = 'block';
    document.getElementById('uploadBtn').disabled = true;
    
    try {
        const token = localStorage.getItem('authToken');
        const formData = new FormData();
        
        // Define image types and their corresponding indices
        const imageTypes = ['front', 'back', 'side', 'interior'];
        const imageIndices = [];
        
        // Add images to form data with proper indexing
        for (let [index, type] of imageTypes.entries()) {
            const imageData = uploadedImages[type];
            if (imageData) {
                const jpegFile = await convertToJpeg(imageData, `${type}.jpg`);
                formData.append("images", jpegFile);
                imageIndices.push(index);
            }
        }
        
        // Add metadata
        formData.append('registrationNumber', currentRegistrationNumber);
        formData.append('imageTypes', JSON.stringify(imageTypes));
        formData.append('imageIndices', JSON.stringify(imageIndices)); // Send as JSON string
        
        console.log(`📸 Uploading ${imageTypes.length} images for car ${currentRegistrationNumber}`);
        
        const response = await fetch('/api/upload-car-images', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Images uploaded successfully!');
            resetUploads();
            hideCarInfo();
            document.getElementById('registrationNumber').value = '';
            // Stop camera if it's running
            stopCamera();
        } else {
            alert('Upload failed: ' + (result.error || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        alert('An error occurred during upload');
    } finally {
        // Hide progress
        document.getElementById('uploadProgress').style.display = 'none';
        document.getElementById('uploadBtn').disabled = false;
    }
}

// Camera-related functions
async function startCamera() {
    const selectedType = document.getElementById('captureImageType').value;
    if (!selectedType) {
        alert('Please select an image type first');
        return;
    }
    
    try {
        const video = document.getElementById('camera');
        
        // Check if camera permissions are available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera API not supported in this browser');
        }
        
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'environment' // Use back camera if available
            } 
        });
        
        video.srcObject = stream;
        await video.play();
        
        document.getElementById('canvas').style.display = 'block';
        document.getElementById('captureButtons').style.display = 'none'; 
        document.getElementById('capturedImagePreview').innerHTML = '';
        document.getElementById('captureBtn').disabled = false;
        document.getElementById('stopCameraBtn').disabled = false;
        document.getElementById('startCameraBtn').disabled = true;
        document.getElementById('cameraStatus').style.display = 'block';
        
    } catch (error) {
        console.error('Error starting camera:', error);
        alert('Could not start camera. Please check permissions and try again.');
    }
}

function stopCamera() {
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        stream = null;
        document.getElementById('camera').srcObject = null;
        document.getElementById('canvas').style.display = 'none';
        document.getElementById('captureButtons').style.display = 'none';
        document.getElementById('capturedImagePreview').innerHTML = '';
        document.getElementById('captureBtn').disabled = true;
        document.getElementById('stopCameraBtn').disabled = true;
        document.getElementById('startCameraBtn').disabled = false;
        document.getElementById('cameraStatus').style.display = 'none';
    }
}

function captureImage() {
    // Camera capture functionality
    const selectedType = document.getElementById('captureImageType').value;
    if (!selectedType) {
        alert('Please select an image type first');
        return;
    }
    
    const video = document.getElementById('camera');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    capturedImage = canvas.toDataURL('image/jpeg', 0.9);
    
    document.getElementById('capturedImagePreview').innerHTML = `
        <div class="alert alert-success">
            <h6><i class="fas fa-check-circle me-2"></i>Image Captured!</h6>
            <img src="${capturedImage}" alt="Captured Image" style="max-width: 100%; max-height: 150px; border-radius: 8px; margin: 10px 0;">
            <div><strong>Type:</strong> ${selectedType.toUpperCase()} VIEW</div>
        </div>
    `;
    document.getElementById('captureButtons').style.display = 'block';
}

function useCapturedImage() {
    const selectedType = document.getElementById('captureImageType').value;
    if (selectedType && capturedImage) {
        uploadedImages[selectedType] = capturedImage;
        const previewDiv = document.getElementById(`${selectedType}ImagePreview`);
        previewDiv.innerHTML = `
            <img src="${capturedImage}" class="image-preview" alt="${selectedType.toUpperCase()} VIEW">
            <div class="image-type-label">${selectedType.toUpperCase()} VIEW (Live Capture)</div>
        `;
        document.getElementById(`${selectedType}ImageArea`).classList.add('has-image');
        
        document.getElementById('captureImagePreview').innerHTML = '';
        document.getElementById('captureButtons').style.display = 'none';
        document.getElementById('captureImageType').value = '';
        
        checkUploadReady();
    }
}

function discardCapturedImage() {
    document.getElementById('capturedImagePreview').innerHTML = '';
    document.getElementById('captureButtons').style.display = 'none';
    capturedImage = null;
}

function resetUploads() {
    uploadedImages = {
        front: null,
        back: null,
        side: null,
        interior: null
    };
    
    ['front', 'back', 'side', 'interior'].forEach(type => {
        document.getElementById(`${type}ImagePreview`).innerHTML = '';
        document.getElementById(`${type}ImageArea`).classList.remove('has-image');
        document.getElementById(`${type}Image`).value = '';
    });
    
    stopCamera();
    document.getElementById('captureImageType').value = '';
    document.getElementById('capturedImagePreview').innerHTML = '';
    document.getElementById('captureButtons').style.display = 'none';
    document.getElementById('captureInstructions').style.display = 'block';
    
    document.getElementById('uploadBtn').disabled = true;
}

// Check camera support on page load
document.addEventListener('DOMContentLoaded', function() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        document.getElementById('captureImageType').disabled = true;
        document.getElementById('startCameraBtn').disabled = true;
        document.getElementById('captureInstructions').innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Camera not supported:</strong> Your browser doesn't support camera access.
                <br><small>Please use a modern browser like Chrome, Firefox, or Safari.</small>
            </div>
        `;
    }
});
