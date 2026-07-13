const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer from multer
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
function uploadToCloudinary(fileBuffer, folder = 'kumar-dresses') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    const readable = Readable.from(fileBuffer);
    readable.pipe(uploadStream);
  });
}

/**
 * Delete an image from Cloudinary by URL
 * @param {string} imageUrl - The full Cloudinary URL
 */
async function deleteFromCloudinary(imageUrl) {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) return;
  try {
    // Extract public_id from URL
    const parts = imageUrl.split('/upload/');
    if (parts[1]) {
      const pathWithExt = parts[1].replace(/^v\d+\//, ''); // remove version
      const publicId = pathWithExt.replace(/\.[^/.]+$/, ''); // remove extension
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (err) {
    console.error('Cloudinary delete error:', err.message);
  }
}

module.exports = { uploadToCloudinary, deleteFromCloudinary, cloudinary };
