/**
 * Universal Price Utility for Sands Jewels
 * Centralizes the logic for extracting product prices to avoid ₹0 errors.
 */

/**
 * Gets the effective price of a product (lowest available price).
 * @param {Object} product - The product object from the API.
 * @returns {number} - The price in rupees.
 */
export const getProductPrice = (product) => {
  if (!product) return 0;

  // 1. Check for root level prices (legacy or pre-normalized)
  const rootCandidates = [
    product.price,
    product.finalPrice,
    product.discountedPrice,
  ]
    .map((v) => Number(v))
    .filter((v) => !isNaN(v) && v > 0);

  // 2. Check variants (modern schema)
  const variantPrices = (product.variants || [])
    .map((v) => Number(v.price ?? v.finalPrice ?? v.priceAfterTax))
    .filter((v) => !isNaN(v) && v > 0);

  if (variantPrices.length > 0) return Math.min(...variantPrices);
  if (rootCandidates.length > 0) return rootCandidates[0];

  return 0;
};

/**
 * Gets the original price (MRP) of a product (highest available MRP).
 * @param {Object} product - The product object from the API.
 * @returns {number} - The MRP in rupees.
 */
export const getProductMRP = (product) => {
  if (!product) return 0;

  const rootCandidates = [product.originalPrice, product.mrp, product.basePrice]
    .map((v) => Number(v))
    .filter((v) => !isNaN(v) && v > 0);

  const variantMRPs = (product.variants || [])
    .map((v) => Number(v.mrp ?? v.price ?? v.finalPrice))
    .filter((v) => !isNaN(v) && v > 0);

  if (variantMRPs.length > 0) return Math.max(...variantMRPs);
  if (rootCandidates.length > 0) return rootCandidates[0];

  return 0;
};

/**
 * Formats a number as Indian Rupee currency (no decimals on user-facing UI).
 * @param {number|string} value - The price to format.
 * @returns {string} - Formatted currency string like ₹1,234.
 */
export const formatCurrency = (value) => {
  return `₹${Math.round(Number(value || 0)).toLocaleString("en-IN")}`;
};
