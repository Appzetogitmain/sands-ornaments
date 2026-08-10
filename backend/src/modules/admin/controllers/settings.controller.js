const Setting = require("../../../models/Setting");
const { success, error } = require("../../../utils/apiResponse");
const Product = require("../../../models/Product");
const Seller = require("../../../models/Seller");
const { applyMetalPricingToProduct } = require("../../../utils/metalPricing");
const { normalizeMetalRates, hasNegativeRate } = require("../../../utils/metalRateNormalization");
const auditLogger = require("../../../utils/auditLogger");

const getOrCreateSettings = async () => {
  let settings = await Setting.findOne();
  if (!settings) {
    settings = await Setting.create({});
  } else {
    const normalized = normalizeMetalRates({}, settings.metalRates || {});
    if (JSON.stringify(settings.metalRates || {}) !== JSON.stringify(normalized)) {
      settings.metalRates = normalized;
      await settings.save();
    }
  }
  return settings;
};

const buildSellerRateMap = async (products = []) => {
  const sellerIds = [...new Set(
    products
      .map((product) => product.sellerId ? String(product.sellerId) : null)
      .filter(Boolean)
  )];
  const sellers = await Seller.find({ _id: { $in: sellerIds } }).select("_id metalRates");
  return new Map(sellers.map((seller) => {
    const normalized = normalizeMetalRates({}, seller.metalRates || {});
    if (JSON.stringify(seller.metalRates || {}) !== JSON.stringify(normalized)) {
      seller.metalRates = normalized;
      seller.save().catch((err) => console.error("Seller metal rates normalization failed:", err.message));
    }
    return [String(seller._id), normalized];
  }));
};

const countAdminOwnedProducts = async () => Product.countDocuments({
  $or: [{ sellerId: null }, { sellerId: { $exists: false } }]
});

exports.getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({}); // Initialize with defaults
    }
    return success(res, { settings });
  } catch (err) { return error(res, err.message); }
};

exports.updateSettings = async (req, res) => {
  try {
    const payload = { ...req.body };
    delete payload._id;
    delete payload.__v;

    const before = await Setting.findOne().lean();

    const settings = await Setting.findOneAndUpdate(
      {},
      { $set: payload },
      { new: true, upsert: true, runValidators: true }
    );

    auditLogger.log(req, {
      action: "SETTINGS_UPDATE",
      entity: "Settings",
      entityId: String(settings._id),
      entityLabel: "Global Settings",
      before: before
        ? Object.keys(payload || {}).reduce((acc, key) => {
            acc[key] = before[key];
            return acc;
          }, {})
        : null,
      after: { ...payload }
    });
    return success(res, { settings }, "Settings updated successfully");
  } catch (err) { return error(res, err.message); }
};

exports.getMetalPricing = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const adminProductCount = await countAdminOwnedProducts();
    const normalizedRates = normalizeMetalRates({}, settings.metalRates || {});
    return success(res, {
      metalRates: normalizedRates,
      adminProductCount,
      updatedAt: settings.metalPricingUpdatedAt || settings.updatedAt || settings.createdAt || null
    }, "Metal pricing retrieved");
  } catch (err) { return error(res, err.message); }
};

exports.updateMetalPricing = async (req, res) => {
  try {
    const { metalRates, gstRate } = req.body || {};
    const settings = await getOrCreateSettings();
    const beforeRates = { ...(settings.metalRates || {}) };

    if (gstRate !== undefined && gstRate !== null) {
      return error(res, "GST is managed through Tax Settings, not Metal Pricing", 400);
    }

    if (metalRates && typeof metalRates === "object") {
      const normalizedRates = normalizeMetalRates(metalRates, settings.metalRates || {});
      if (hasNegativeRate(normalizedRates)) {
        return error(res, "Metal rates cannot be negative", 400);
      }
      settings.metalRates = normalizedRates;
    }
    settings.metalPricingUpdatedAt = new Date();
    await settings.save();

    auditLogger.log(req, {
      action: "SETTINGS_UPDATE",
      entity: "Settings",
      entityId: String(settings._id),
      entityLabel: "Metal Pricing",
      before: { metalRates: beforeRates },
      after:  { metalRates: settings.metalRates || {} }
    });

    const adminProducts = await Product.find({
      $or: [{ sellerId: null }, { sellerId: { $exists: false } }]
    });

    for (const product of adminProducts) {
      applyMetalPricingToProduct(product, settings.metalRates || {}, settings.gstRate || 0);
      await product.save();
    }

    const adminProductCount = await countAdminOwnedProducts();
    return success(res, {
      metalRates: settings.metalRates || {},
      adminProductCount,
      updatedAt: settings.metalPricingUpdatedAt || settings.updatedAt || settings.createdAt || null
    }, "Metal pricing updated successfully");
  } catch (err) { return error(res, err.message); }
};

exports.getTaxSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const totalProductCount = await Product.countDocuments();
    return success(res, {
      gstRate: settings.gstRate || 0,
      totalProductCount,
      updatedAt: settings.taxSettingsUpdatedAt || settings.updatedAt || settings.createdAt || null
    }, "Tax settings retrieved");
  } catch (err) { return error(res, err.message); }
};

exports.updateTaxSettings = async (req, res) => {
  try {
    const { gstRate } = req.body || {};
    const normalizedGst = Number(gstRate);
    if (!Number.isFinite(normalizedGst) || normalizedGst < 0) {
      return error(res, "GST cannot be negative", 400);
    }

    if (normalizedGst > 100) {
      return error(res, "GST cannot be greater than 100", 400);
    }

    const settings = await getOrCreateSettings();
    const previousGst = settings.gstRate || 0;
    settings.gstRate = normalizedGst;
    settings.taxSettingsUpdatedAt = new Date();
    await settings.save();

    auditLogger.log(req, {
      action: "SETTINGS_UPDATE",
      entity: "Settings",
      entityId: String(settings._id),
      entityLabel: "Tax Settings",
      before: { gstRate: previousGst },
      after:  { gstRate: normalizedGst }
    });

    const allProducts = await Product.find({});
    const sellerRateMap = await buildSellerRateMap(allProducts);

    for (const product of allProducts) {
      const ownerRates = product.sellerId
        ? (sellerRateMap.get(String(product.sellerId)) || {})
        : (settings.metalRates || {});
      applyMetalPricingToProduct(product, ownerRates, settings.gstRate || 0);
      await product.save();
    }

    return success(res, {
      gstRate: settings.gstRate || 0,
      totalProductCount: allProducts.length,
      updatedAt: settings.taxSettingsUpdatedAt || settings.updatedAt || settings.createdAt || null
    }, "Tax settings updated successfully");
  } catch (err) { return error(res, err.message); }
};
