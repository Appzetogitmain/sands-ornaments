const Product = require("../../../models/Product");
const StockLog = require("../../../models/StockLog");
const Review = require("../../../models/Review");
const HomepageSection = require("../../../models/HomepageSection");
const slugify = require("../../../utils/slugify");
const { deleteFromCloudinary } = require("../../../utils/cloudinaryUtils");
const { success, error } = require("../../../utils/apiResponse");
const Setting = require("../../../models/Setting");
const Seller = require("../../../models/Seller");
const { applyMetalPricingToProduct } = require("../../../utils/metalPricing");
const { generateUniqueProductCode, generateVariantCode } = require("../../../utils/productIdentity");
const { normalizeProductForResponse } = require("../../../utils/productCompatibility");
const auditLogger = require("../../../utils/auditLogger");

// BUG-10 FIX: explicit whitelist of fields that can be updated via API
const PRODUCT_UPDATE_WHITELIST = [
  "name", "description", "slug", "productCode", "tags", "stylingTips",
  "variants", "status", "categories", "sellerId",
  "isFeatured", "isTrending", "isNewArrival",
  "returnEligibilities", "weight", "material", "faqs",
  "showInNavbar", "showInCollection", "active",
  "navShopByCategory",
  "cardLabel", "cardBadge", "careTips", "silverCategory",
  "goldCategory", "weightUnit", "specifications", "supplierInfo",
  "huid", "sizes", "isSerialized", "paymentGatewayChargeBearer", "audience",
  "diamondType",
  "seo", "logistics", "relatedProducts",
  "videoUrl"
];

const normalizeSerialCodes = (codes = []) => {
  if (!Array.isArray(codes)) return [];
  return codes
    .map(code => {
      if (typeof code === "string") return { code, status: "AVAILABLE" };
      if (code && typeof code === "object" && code.code) {
        return { code: String(code.code), status: code.status || "AVAILABLE" };
      }
      return null;
    })
    .filter(Boolean);
};

const countAvailableCodes = (codes = []) =>
  codes.filter(c => (c.status || "AVAILABLE") === "AVAILABLE").length;

const normalizeDiamondType = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "lab_grown" || raw === "natural" || raw === "none") return raw;
  return "none";
};

const normalizeVariantFields = (variants = [], fallback = {}) => {
  const fallbackWeight = fallback.weight !== undefined && fallback.weight !== null
    ? Number(fallback.weight) || 0
    : undefined;
  const fallbackWeightUnit = fallback.weightUnit || "Grams";
  return variants.map((variant) => ({
    ...variant,
    size: variant.size || "",
    variantCode: variant.variantCode || "",
    diamondType: normalizeDiamondType(variant.diamondType),
    variantImages: Array.isArray(variant.variantImages)
      ? variant.variantImages.filter(Boolean)
      : [],
    variantFaqs: Array.isArray(variant.variantFaqs)
      ? variant.variantFaqs.map((faq) => ({
        question: String(faq?.question || "").trim(),
        answer: String(faq?.answer || "").trim()
      })).filter((faq) => faq.question || faq.answer)
      : [],
    weight: variant.weight !== undefined && variant.weight !== null && variant.weight !== ""
      ? Number(variant.weight) || 0
      : fallbackWeight,
    weightUnit: variant.weightUnit || fallbackWeightUnit,
    makingCharge: Number(variant.makingCharge) || 0,
    diamondPrice: Number(variant.diamondPrice) || 0,
    hallmarkingCharge: Number(variant.hallmarkingCharge) || 0,
    diamondCertificateCharge: Number(variant.diamondCertificateCharge) || 0,
    additionalCharge: Number(variant.additionalCharge) || 0,
    hiddenCharge: Number(variant.hiddenCharge) || 0,
    subtotalBeforeTax: Number(variant.subtotalBeforeTax) || 0,
    gstAmount: Number(variant.gstAmount) || 0,
    priceAfterTax: Number(variant.priceAfterTax) || 0,
    pgChargePercent: Number(variant.pgChargePercent) || 0,
    pgChargeAmount: Number(variant.pgChargeAmount) || 0,
    metalPrice: Number(variant.metalPrice) || 0,
    gst: Number(variant.gst) || 0,
    finalPrice: Number(variant.finalPrice) || 0,
    mrp: Number(variant.mrp) || 0,
    price: Number(variant.price) || 0,
    stock: Number(variant.stock) || 0,
    discount: Number(variant.discount) || 0,
    diamondSpecs: {
      carat: String(variant.diamondSpecs?.carat || "").trim(),
      clarity: String(variant.diamondSpecs?.clarity || "").trim(),
      color: String(variant.diamondSpecs?.color || "").trim(),
      cut: String(variant.diamondSpecs?.cut || "").trim(),
      shape: String(variant.diamondSpecs?.shape || "").trim(),
      diamondCount: Number(variant.diamondSpecs?.diamondCount) || 0
    },
    serialCodes: normalizeSerialCodes(variant.serialCodes || [])
  }));
};

const ensureVariantCodes = (variants = [], productCode = "") => {
  const existingCodes = new Set(
    variants
      .map((variant) => variant.variantCode)
      .filter(Boolean)
  );

  return variants.map((variant, index) => ({
    ...variant,
    variantCode: variant.variantCode || generateVariantCode(productCode, index, existingCodes)
  }));
};

const splitUploadedProductImages = (files = [], variantCount = 0) => {
  const normalizedFiles = Array.isArray(files) ? files : [];
  const productImages = normalizedFiles
    .filter((file) => file?.fieldname === "images")
    .map((file) => file.path)
    .filter(Boolean);

  const variantImageMap = {};
  for (let index = 0; index < variantCount; index += 1) {
    const fieldname = `variantImages_${index}`;
    const uploaded = normalizedFiles
      .filter((file) => file?.fieldname === fieldname)
      .map((file) => file.path)
      .filter(Boolean);
    if (uploaded.length > 0) {
      variantImageMap[index] = uploaded;
    }
  }

  return { productImages, variantImageMap };
};

const collectReferencedImageUrls = (productLike = {}) => {
  const productImages = Array.isArray(productLike.images) ? productLike.images.filter(Boolean) : [];
  const variantImages = Array.isArray(productLike.variants)
    ? productLike.variants.flatMap((variant) => (
      Array.isArray(variant?.variantImages) ? variant.variantImages.filter(Boolean) : []
    ))
    : [];

  return new Set([...productImages, ...variantImages]);
};


// ─────────────────────────────────────────────────────────────────
// POST /api/admin/products
// ─────────────────────────────────────────────────────────────────
exports.createProduct = async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.name && !/^[a-zA-Z0-9 ]+$/.test(data.name)) {
      return error(res, "Product name must contain only alphanumeric characters and spaces.", 400);
    }
    if (data.categories) {
      if (Array.isArray(data.categories)) {
        data.categories = data.categories.length > 0 ? [data.categories[0]] : [];
      } else if (typeof data.categories === "string") {
        data.categories = [data.categories];
      }
    }
    const productSlug = data.slug ? slugify(data.slug) : slugify(data.name);
    const existing = await Product.findOne({ slug: productSlug });
    if (existing) return error(res, "Product with this slug already exists.", 409);
    if (!data.productCode) {
      data.productCode = await generateUniqueProductCode(Product);
    }
    const existingProductCode = await Product.findOne({ productCode: data.productCode }).select("_id");
    if (existingProductCode) return error(res, "Product code already exists.", 409);

    if (data.variants && data.variants.length > 0) {
      data.variants = normalizeVariantFields(data.variants, {
        weight: data.weight,
        weightUnit: data.weightUnit
      }).map(v => {
        if (v.mrp && v.price && !v.discount) {
          v.discount = Math.round(((v.mrp - v.price) / v.mrp) * 100);
        }
        const serialCodes = normalizeSerialCodes(v.serialCodes || []);
        if (serialCodes.length > 0) {
          v.serialCodes = serialCodes;
          v.stock = countAvailableCodes(serialCodes);
        }
        return v;
      });
      data.variants = ensureVariantCodes(data.variants, data.productCode);
    }

    const { productImages, variantImageMap } = splitUploadedProductImages(req.files, data.variants?.length || 0);
    let images = productImages;

    const uploadedVideo = (Array.isArray(req.files) ? req.files : [])
      .find((file) => file?.fieldname === "video");
    const videoUrl = uploadedVideo?.path || (typeof data.videoUrl === "string" ? data.videoUrl.trim() : "");
    if (Array.isArray(data.variants) && data.variants.length > 0) {
      data.variants = data.variants.map((variant, index) => ({
        ...variant,
        variantImages: [...(variant.variantImages || []), ...(variantImageMap[index] || [])]
      }));
    }

    const settings = await Setting.findOne();
    const metalRates = settings?.metalRates || {};
    const gstRate = settings?.gstRate || 0;

    const productData = applyMetalPricingToProduct(
      { ...data, productCode: data.productCode, slug: productSlug, images, videoUrl, isSerialized: true },
      metalRates,
      gstRate
    );

    const product = await Product.create(productData);

    const stockLogs = product.variants.map(v => ({
      productId:     product._id,
      variantId:     v._id,
      changeType:    "purchase",
      previousStock: 0,
      newStock:      v.stock,
      change:        v.stock,
      reason:        "Initial stock entry",
      adminId:       req.user.userId,
    }));
    await StockLog.insertMany(stockLogs);

    return success(res, { product }, "Product created successfully", 201);
  } catch (err) { return error(res, err.message); }
};


// ─────────────────────────────────────────────────────────────────
// GET /api/admin/products
// ─────────────────────────────────────────────────────────────────
exports.getProducts = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    // BUG-13 FIX: cap limit to 100 to prevent memory-exhaustion attacks
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const { search, category, status, minPrice, maxPrice, inStock, sortBy, sellerId } = req.query;

    const query = {};
    if (search) {
      // BUG-21 FIX (also applied here): escape special regex characters
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.name = { $regex: escaped, $options: "i" };
    }
    if (category) query.categories = category;
    if (status)   query.status = status;
    if (sellerId) query.sellerId = sellerId;

    // Advanced Filters
    if (minPrice || maxPrice) {
      query["variants.price"] = {};
      if (minPrice) query["variants.price"].$gte = Number(minPrice);
      if (maxPrice) query["variants.price"].$lte = Number(maxPrice);
    }

    if (inStock === 'true') {
      query["variants.stock"] = { $gt: 0 };
    } else if (inStock === 'false') {
      query["variants.stock"] = { $lte: 0 };
    }

    // Sort Options
    let sortOptions = { createdAt: -1 };
    if (sortBy === 'price_low') sortOptions = { "variants.price": 1 };
    else if (sortBy === 'price_high') sortOptions = { "variants.price": -1 };
    else if (sortBy === 'name_asc') sortOptions = { name: 1 };

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("categories",    "name")
        .sort(sortOptions)
        .limit(limit)
        .skip((page - 1) * limit),
      Product.countDocuments(query),
    ]);

    return success(res, {
      products: products.map((product) => normalizeProductForResponse(product)),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    }, "Products retrieved");
  } catch (err) { return error(res, err.message); }
};


// ─────────────────────────────────────────────────────────────────
// GET /api/admin/products/:id
// ─────────────────────────────────────────────────────────────────
exports.getProductDetail = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("categories",    "name");
    if (!product) return error(res, "Product not found", 404);
    return success(res, { product: normalizeProductForResponse(product) }, "Product details retrieved");
  } catch (err) { return error(res, err.message); }
};


// ─────────────────────────────────────────────────────────────────
// PATCH /api/admin/products/:id
// ─────────────────────────────────────────────────────────────────
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return error(res, "Product not found", 404);
    const originalReferencedImages = collectReferencedImageUrls(product.toObject ? product.toObject() : product);

    const data = { ...req.body };
    if (data.name && !/^[a-zA-Z0-9 ]+$/.test(data.name)) {
      return error(res, "Product name must contain only alphanumeric characters and spaces.", 400);
    }
    if (data.categories) {
      if (Array.isArray(data.categories)) {
        data.categories = data.categories.length > 0 ? [data.categories[0]] : [];
      } else if (typeof data.categories === "string") {
        data.categories = [data.categories];
      }
    }

    // Handle slug update if name changes
    if (data.name && !data.slug) {
      data.slug = slugify(data.name);
    } else if (data.slug) {
      data.slug = slugify(data.slug);
    }
    if (data.productCode) {
      const existingProductCode = await Product.findOne({ productCode: data.productCode, _id: { $ne: product._id } }).select("_id");
      if (existingProductCode) return error(res, "Product code already exists.", 409);
    } else if (!product.productCode) {
      data.productCode = await generateUniqueProductCode(Product);
    }

    const deletedImages = Array.isArray(data.deletedImages) ? data.deletedImages.filter(Boolean) : [];
    if (deletedImages.length > 0) {
      product.images = (product.images || []).filter((img) => !deletedImages.includes(img));
    }

    const removeVideo = String(data.removeVideo || "").toLowerCase() === "true";
    const uploadedVideo = (Array.isArray(req.files) ? req.files : [])
      .find((file) => file?.fieldname === "video");

    if (removeVideo && product.videoUrl) {
      const previous = product.videoUrl;
      product.videoUrl = "";
      await Promise.allSettled([deleteFromCloudinary(previous)]);
    }

    if (uploadedVideo?.path) {
      const previous = product.videoUrl;
      product.videoUrl = uploadedVideo.path;
      if (previous) {
        await Promise.allSettled([deleteFromCloudinary(previous)]);
      }
    }

    // Append new images (don't allow overwrite via body)
    const { productImages, variantImageMap } = splitUploadedProductImages(req.files, data.variants?.length || product.variants?.length || 0);

    if (productImages.length > 0) {
      const newImages = productImages;
      product.images = [...product.images, ...newImages];
    }

    // BUG-10 FIX: only apply whitelisted fields — prevents prototype pollution / field injection
    PRODUCT_UPDATE_WHITELIST.forEach(key => {
      if (data[key] !== undefined) product[key] = data[key];
    });

    if (Array.isArray(product.variants)) {
      product.variants = normalizeVariantFields(product.variants, {
        weight: product.weight,
        weightUnit: product.weightUnit
      }).map(v => {
        const serialCodes = normalizeSerialCodes(v.serialCodes || []);
        if (serialCodes.length > 0) {
          v.serialCodes = serialCodes;
          v.stock = countAvailableCodes(serialCodes);
        }
        return v;
      });
      product.variants = product.variants.map((variant, index) => ({
        ...variant,
        variantImages: [...(variant.variantImages || []), ...(variantImageMap[index] || [])]
      }));
      product.variants = ensureVariantCodes(product.variants, product.productCode || data.productCode || "");
    }

    product.isSerialized = true;

    const nextReferencedImages = collectReferencedImageUrls(product);
    const removedImageUrls = [...originalReferencedImages].filter((imageUrl) => !nextReferencedImages.has(imageUrl));

    const settings = await Setting.findOne();
    const metalRates = settings?.metalRates || {};
    const gstRate = settings?.gstRate || 0;
    applyMetalPricingToProduct(product, metalRates, gstRate);

    await product.save();

    if (removedImageUrls.length > 0) {
      await Promise.allSettled(
        removedImageUrls.map((imageUrl) => deleteFromCloudinary(imageUrl))
      );
    }

    // Audit log — non-blocking
    auditLogger.log(req, {
      action:      "UPDATE",
      entity:      "Product",
      entityId:    String(product._id),
      entityLabel: product.name || "",
      before:      null,
      after:       { name: product.name, status: product.status, updatedFields: Object.keys(data).filter(k => PRODUCT_UPDATE_WHITELIST.includes(k)) }
    });

    return success(res, { product }, "Product updated successfully");
  } catch (err) { return error(res, err.message); }
};


// ─────────────────────────────────────────────────────────────────
// DELETE /api/admin/products/:id
// ─────────────────────────────────────────────────────────────────
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return error(res, "Product not found", 404);

    const mediaToRemove = [
      ...(Array.isArray(product.images) ? product.images : []),
      product.videoUrl
    ].filter(Boolean);

    // BUG-07 FIX: cascade cleanup to prevent orphaned data
    await Promise.all([
      // Remove reviews for this product
      Review.deleteMany({ productId: product._id }),
      // Remove from homepage sections (set productId to null)
      HomepageSection.updateMany(
        { "items.productId": product._id },
        { $pull: { items: { productId: product._id } } }
      ),
      // Remove stock logs (historical data, safe to archive but fine to delete)
      StockLog.deleteMany({ productId: product._id }),
    ]);

    await product.deleteOne();

    // Audit log — non-blocking
    auditLogger.log(req, {
      action:      "DELETE",
      entity:      "Product",
      entityId:    String(product._id),
      entityLabel: product.name || "",
      before:      { name: product.name, status: product.status },
      after:       null
    });

    if (mediaToRemove.length > 0) {
      await Promise.allSettled(mediaToRemove.map((url) => deleteFromCloudinary(url)));
    }

    return success(res, {}, "Product and associated data deleted successfully");
  } catch (err) { return error(res, err.message); }
};

// ─────────────────────────────────────────────────────────────────
// PATCH /api/admin/products/:id/toggle-status
// ─────────────────────────────────────────────────────────────────
exports.toggleProductStatus = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return error(res, "Product not found", 404);

    product.active = product.active === false ? true : false;
    await product.save();

    return success(res, { active: product.active }, `Product ${product.active ? 'activated' : 'deactivated'} successfully`);
  } catch (err) { return error(res, err.message); }
};
// ─────────────────────────────────────────────────────────────────
// PATCH /api/admin/products/bulk/prices
// ─────────────────────────────────────────────────────────────────
exports.bulkPriceUpdate = async (req, res) => {
  try {
    const { categoryId, productIds = [], type, value } = req.body;
    const allowedTypes = [
      "increase_making_amount",
      "decrease_making_amount",
      "increase_making_percent",
      "decrease_making_percent",
      "set_hallmarking_charge",
      "set_diamond_certificate_charge",
      "set_pg_charge_to_user",
      "set_pg_charge_to_seller"
    ];
    if (!allowedTypes.includes(type)) {
      return error(res, "Invalid update type provided.", 400);
    }

    const typesRequiringValue = new Set([
      "increase_making_amount",
      "decrease_making_amount",
      "increase_making_percent",
      "decrease_making_percent",
      "set_hallmarking_charge",
      "set_diamond_certificate_charge"
    ]);
    const numericValue = Number(value);
    if (typesRequiringValue.has(type) && (Number.isNaN(numericValue) || numericValue < 0)) {
      return error(res, "A valid non-negative value is required for this bulk update.", 400);
    }

    const query = {};
    if (Array.isArray(productIds) && productIds.length > 0) {
      query._id = { $in: productIds };
    } else if (categoryId) {
      query.categories = categoryId;
    }

    const products = await Product.find(query);
    const settings = await Setting.findOne();
    const gstRate = settings?.gstRate || 0;
    const sellerIds = [...new Set(
      products
        .map((product) => product.sellerId ? String(product.sellerId) : null)
        .filter(Boolean)
    )];
    const sellers = await Seller.find({ _id: { $in: sellerIds } }).select("_id metalRates");
    const sellerRateMap = new Map(
      sellers.map((seller) => [String(seller._id), seller.metalRates || {}])
    );

    for (const prod of products) {
      prod.variants = prod.variants.map(v => {
        switch (type) {
          case "increase_making_amount":
            v.makingCharge = (Number(v.makingCharge) || 0) + numericValue;
            break;
          case "decrease_making_amount":
            v.makingCharge = Math.max(0, (Number(v.makingCharge) || 0) - numericValue);
            break;
          case "increase_making_percent":
            v.makingCharge = Math.max(0, Math.round((Number(v.makingCharge) || 0) * (1 + numericValue / 100) * 100) / 100);
            break;
          case "decrease_making_percent":
            v.makingCharge = Math.max(0, Math.round((Number(v.makingCharge) || 0) * (1 - numericValue / 100) * 100) / 100);
            break;
          case "set_hallmarking_charge":
            v.hallmarkingCharge = numericValue;
            break;
          case "set_diamond_certificate_charge":
            v.diamondCertificateCharge = numericValue;
            break;
          case "set_pg_charge_to_user":
            prod.paymentGatewayChargeBearer = "user";
            break;
          case "set_pg_charge_to_seller":
            prod.paymentGatewayChargeBearer = "seller";
            break;
          default:
            break;
        }
        return v;
      });

      const ownerRates = prod.sellerId
        ? (sellerRateMap.get(String(prod.sellerId)) || {})
        : (settings?.metalRates || {});
      applyMetalPricingToProduct(prod, ownerRates, gstRate);
      await prod.save();
    }

    return success(res, { count: products.length }, "Bulk product pricing inputs updated successfully");
  } catch (err) { return error(res, err.message); }
};
