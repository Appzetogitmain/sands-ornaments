import api from '../services/api';
import axios from 'axios';

/**
 * Compresses an image file in the browser using HTML5 Canvas
 * @param {File} file - Original image file
 * @returns {Promise<File>} Compressed image file
 */
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1920;
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(compressedFile);
        }, 'image/jpeg', 0.8); // 80% quality
      };
      img.onerror = () => resolve(file); // Fallback to original on error
    };
    reader.onerror = () => resolve(file);
  });
};

/**
 * Uploads a file directly to Cloudinary using secure signed signature from backend
 * @param {File} file - The file to upload (Image or Video)
 * @param {string} signatureEndpoint - API endpoint to fetch upload signature (e.g. 'user/support/upload-signature')
 * @param {function} onProgress - Progress callback (percent) => {}
 * @returns {Promise<object>} Secure URL, type, and original name
 */
export const uploadToCloudinary = async (file, signatureEndpoint, onProgress) => {
  let fileToUpload = file;
  
  // Client-Side Image Compression
  if (file.type.startsWith('image/')) {
    try {
      fileToUpload = await compressImage(file);
    } catch (err) {
      console.warn('Canvas compression failed, falling back to raw upload:', err);
    }
  }
  
  // Fetch secure upload signature from Node backend
  const sigRes = await api.get(signatureEndpoint);
  const signatureData = sigRes.data.data || sigRes.data;
  if (!signatureData || !signatureData.signature) {
    throw new Error('Failed to obtain upload signature');
  }
  
  const { signature, timestamp, apiKey, cloudName, folder } = signatureData;
  
  const formData = new FormData();
  formData.append('file', fileToUpload);
  formData.append('signature', signature);
  formData.append('timestamp', timestamp);
  formData.append('api_key', apiKey);
  formData.append('folder', folder);
  
  const res = await axios.post(
    `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    }
  );
  
  return {
    url: res.data.secure_url,
    type: file.type.startsWith('video/') ? 'video' : 'image',
    name: file.name
  };
};
