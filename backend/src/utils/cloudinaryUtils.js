const cloudinary = require("../config/cloudinary");

/**
 * Deletes an image from Cloudinary based on its secure_url
 * @param {string} url - The Cloudinary image URL
 * @returns {Promise<object>} - Cloudinary destruction result
 */
const deleteFromCloudinary = async (url) => {
  try {
    if (!url || !url.includes("cloudinary.com")) return null;

    // Detect resource type from URL
    // Images: .../image/upload/...
    // Videos: .../video/upload/...
    const isVideo = url.includes("/video/upload/");
    const resourceType = isVideo ? "video" : "image";

    // Extract public_id from URL
    // Format: https://res.cloudinary.com/cloud_name/[image|video]/upload/v12345/folder/public_id.ext
    const parts = url.split("/");
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1) return null;

    // The public_id with folder is everything after version (v...) until the extension
    // We skip 'upload' and the version (e.g., v12345678)
    const publicIdWithExt = parts.slice(uploadIndex + 2).join("/");
    const publicId = publicIdWithExt.split(".")[0];
    
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log(`Cloudinary deletion result for ${publicId} (${resourceType}):`, result);
    return result;
  } catch (err) {
    console.error("Cloudinary deletion error:", err);
    throw err;
  }
};

/**
 * Generates a signed upload signature for secure client-side uploading to Cloudinary
 * @param {string} folder - The Cloudinary folder path
 * @returns {object} - Timestamp, signature, apiKey, cloudName, and folder
 */
const generateUploadSignature = (folder) => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder
    },
    cloudinary.config().api_secret
  );

  return {
    timestamp,
    signature,
    cloudName: cloudinary.config().cloud_name,
    apiKey: cloudinary.config().api_key,
    folder
  };
};

module.exports = { deleteFromCloudinary, generateUploadSignature };
