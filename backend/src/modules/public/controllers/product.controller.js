const Product = require("../../../models/Product");
const Category = require("../../../models/Category");
const Seller = require("../../../models/Seller");
const mongoose = require("mongoose");
const { success, error } = require("../../../utils/apiResponse");
const { normalizeProductForResponse } = require("../../../utils/productCompatibility");

const getApprovedSellerScope = async () => {
  const approvedSellers = await Seller.find({ status: "APPROVED" }).select("_id").lean();
  const approvedSellerIds = approvedSellers.map((seller) => seller._id);

  return approvedSellerIds.length
    ? {
        $or: [
          { sellerId: null },
          { sellerId: { $exists: false } },
          { sellerId: { $in: approvedSellerIds } }
        ]
      }
    : {
        $or: [{ sellerId: null }, { sellerId: { $exists: false } }]
      };
};

const clampInt = (value, fallback, { min, max } = {}) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  const n = Number.isFinite(parsed) ? parsed : fallback;
  const withMin = typeof min === "number" ? Math.max(min, n) : n;
  return typeof max === "number" ? Math.min(max, withMin) : withMin;
};

const normalizeGoldKarat = (value) => {
  const digits = String(value || "").replace(/[^0-9]/g, "");
  return digits || "";
};

const normalizeSilverTier = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "sterling" || normalized === "925" || normalized.includes("sterling")) return "sterling";
  if (normalized === "fine" || normalized.includes("fine")) return "fine";
  return "";
};

/**
 * GET /api/products
 * Query Params:
 * - search
 * - category (id/slug/name)
 * - metal (matches Product.material)
 * - karat (gold purity: 14/18/22/24)
 * - silver_type (fine|sterling)
 * - price_min/price_max (aliases for minPrice/maxPrice)
 * - minPrice/maxPrice
 * - audience (men,women,family,unisex)
 * - tags (isTrending,isNewArrival,...)
 * - sort (priceLtoH,priceHtoL,rating,newest,latest,most-sold,random)
 * - page, limit
 */
exports.getProducts = async (req, res) => {
  try {
    const { 
      search,
      category,
      metal,
      karat,
      silver_type,
      audience,
      diamondType,
      tags,
      sort,
      inStockOnly = "false",
      page = 1,
      limit = 20
    } = req.query;

    const query = { status: "Active", active: { $ne: false } };
    const andFilters = [await getApprovedSellerScope()];

    const effectiveMinPrice = req.query.minPrice ?? req.query.price_min ?? req.query.priceMin ?? null;
    const effectiveMaxPrice = req.query.maxPrice ?? req.query.price_max ?? req.query.priceMax ?? null;

    const resolvedPage = clampInt(page, 1, { min: 1, max: 100000 });
    const resolvedLimit = clampInt(limit, 20, { min: 1, max: 60 });

    // 1. Text Search
    if (search) {
      andFilters.push({
        $or: [
        { name: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
        ]
      });
    }

    // 2. Category Filter
    if (category) {
      let categoryId = category;
      if (!mongoose.isValidObjectId(category)) {
        const resolved = await Category.findOne({
          $or: [{ slug: category }, { name: new RegExp(`^${category}$`, "i") }],
          isActive: true
        }).select("_id");
        categoryId = resolved?._id || new mongoose.Types.ObjectId("000000000000000000000000");
      }
      query.categories = categoryId;
    }

    // 3. Price Range Filter (matches any variant price)
    if (effectiveMinPrice || effectiveMaxPrice) {
      query["variants.price"] = {};
      if (effectiveMinPrice) query["variants.price"].$gte = Number(effectiveMinPrice);
      if (effectiveMaxPrice) query["variants.price"].$lte = Number(effectiveMaxPrice);
    }

    // 3.1 Metal + purity filters
    // Backwards-compat: older links may pass karat/silver_type without metal.
    // In that case, infer metal from the purity param to avoid silently returning all products.
    const inferredMetal = !metal
      ? (karat ? "gold" : (silver_type ? "silver" : ""))
      : "";

    const effectiveMetal = metal || inferredMetal;
    if (effectiveMetal) {
      const normalized = String(effectiveMetal || "").trim().toLowerCase();
      // material is stored like "Silver" / "Gold" / etc. Keep this case-insensitive exact match.
      query.material = { $regex: `^${normalized}$`, $options: "i" };

      const normalizedKarat = normalizeGoldKarat(karat);
      if (normalized === "gold" && normalizedKarat) {
        query.goldCategory = String(normalizedKarat);
      }

      const tier = normalizeSilverTier(silver_type);
      if (normalized === "silver" && tier) {
        if (tier === "sterling") {
          query.silverCategory = { $regex: "^925\\s+sterling\\s+silver$", $options: "i" };
        } else if (tier === "fine") {
          // Treat all other silver categories as fine (including empty), but exclude sterling.
          query.silverCategory = { $not: { $regex: "^925\\s+sterling\\s+silver$", $options: "i" } };
        }
      }
    }

    // 3.2 Audience scope (men/women/family/unisex). Include unisex by default.
    if (audience) {
      const requested = String(audience || "")
        .split(",")
        .map((v) => String(v || "").trim().toLowerCase())
        .filter(Boolean);
      if (requested.length > 0) {
        // If requesting men/women, include unisex too (matches frontend logic).
        const expanded = new Set(requested);
        expanded.add("unisex");
        query.audience = { $in: Array.from(expanded) };
      }
    }

    // 3.3 Diamond Type Filter
    if (diamondType) {
      const requested = String(diamondType || "").trim().toLowerCase();
      if (requested !== "all" && requested !== "") {
          andFilters.push({
              $or: [
                  { diamondType: requested },
                  { "variants.diamondType": requested }
              ]
          });
      }
    }

    // 4. Tags Filter (e.g. tags=isTrending,isNewArrival)
    if (tags) {
      const tagList = tags.split(",");
      tagList.forEach(t => {
        if (["isNewArrival", "isMostGifted", "isNewLaunch", "isTrending", "isPremium"].includes(t)) {
          query[`tags.${t}`] = true;
        }
      });
    }

    if (String(inStockOnly).toLowerCase() === "true") {
      query["variants.stock"] = { $gt: 0 };
    }

    // 5. Sorting
    let sortOption = { createdAt: -1 }; // Default: Newest
    if (sort) {
      switch (sort) {
        case "price-asc": sortOption = { "variants.0.price": 1 }; break;   // legacy frontend links
        case "price-desc": sortOption = { "variants.0.price": -1 }; break; // legacy frontend links
        case "priceLtoH": sortOption = { "variants.0.price": 1 }; break;
        case "priceHtoL": sortOption = { "variants.0.price": -1 }; break;
        case "rating":    sortOption = { rating: -1 }; break;
        case "newest":    sortOption = { createdAt: -1 }; break;
        case "latest":    sortOption = { createdAt: -1 }; break;
        case "most-sold": sortOption = { sold: -1, createdAt: -1 }; break;
        case "random":    sortOption = null; break;
      }
    }

    if (andFilters.length) {
      query.$and = andFilters;
    }

    // 6. Execute Query with Pagination
    let products = [];
    if (sortOption) {
      products = await Product.find(query)
        .select("name slug productCode brand images videoUrl variants tags rating reviewCount categories category categorySlug categoryId navShopByCategory weight weightUnit goldCategory silverCategory material audience sold createdAt updatedAt")
        .populate("categories", "name slug")
        .sort(sortOption)
        .limit(resolvedLimit)
        .skip((resolvedPage - 1) * resolvedLimit)
        .lean();
    } else {
      // random: sample results (pagination is not deterministic; we return a random page-1 slice).
      products = await Product.aggregate([
        { $match: query },
        { $sample: { size: resolvedLimit } },
      ]);
    }

    const total = await Product.countDocuments(query);

    return success(res, {
      products: products.map((product) => normalizeProductForResponse(product)),
      pagination: {
        total,
        page: Number(resolvedPage),
        limit: Number(resolvedLimit),
        pages: Math.ceil(total / resolvedLimit)
      }
    }, "Products retrieved successfully");

  } catch (err) { return error(res, err.message); }
};

/**
 * GET /api/products/:slug
 * Supports slug or ObjectId.
 */
exports.getProductDetail = async (req, res) => {
  try {
    const identifier = req.params.slug;
    const baseQuery = { status: "Active", active: { $ne: false } };
    const inStockOnly = String(req.query?.inStockOnly || "false").toLowerCase() === "true";
    const lookup = mongoose.isValidObjectId(identifier)
      ? { ...baseQuery, _id: identifier }
      : { ...baseQuery, slug: identifier };

    const product = await Product.findOne(lookup)
      .populate("categories", "name slug")
      .populate("sellerId", "shopName")
      .lean();

    if (!product) return error(res, "Product not found", 404);

    if (product.sellerId) {
      const seller = await Seller.findById(product.sellerId).select("status").lean();
      if (!seller || seller.status !== "APPROVED") {
        return error(res, "Product not found", 404);
      }
    }

    if (inStockOnly) {
      const hasStock = (product.variants || []).some((variant) => Number(variant?.stock || 0) > 0);
      if (!hasStock) return error(res, "Product not found", 404);
    }

    return success(res, { product: normalizeProductForResponse(product) }, "Product details retrieved");
  } catch (err) { return error(res, err.message); }
};

/**
 * GET /api/public/products/by-ids?ids=a,b,c&inStockOnly=false
 * Returns products in the same order as requested ids (when possible).
 * Use this for pinned CMS sections so they don't disappear due to catalogue paging.
 */
exports.getProductsByIds = async (req, res) => {
  try {
    const idsParam = String(req.query?.ids || "").trim();
    if (!idsParam) return success(res, { products: [] });

    const ids = idsParam
      .split(",")
      .map((id) => String(id || "").trim())
      .filter((id) => mongoose.isValidObjectId(id));

    if (ids.length === 0) return success(res, { products: [] });

    const approvedScope = await getApprovedSellerScope();
    const query = {
      status: "Active",
      active: { $ne: false },
      _id: { $in: ids },
      ...approvedScope
    };

    const inStockOnly = String(req.query?.inStockOnly || "false").toLowerCase() === "true";
    if (inStockOnly) {
      query["variants.stock"] = { $gt: 0 };
    }

    const found = await Product.find(query)
      .select("name slug productCode brand images videoUrl variants tags rating reviewCount categories category categorySlug categoryId navShopByCategory weight weightUnit goldCategory silverCategory material audience")
      .populate("categories", "name slug")
      .lean();

    const foundMap = new Map(found.map((p) => [String(p._id), p]));
    const ordered = ids.map((id) => foundMap.get(String(id))).filter(Boolean);

    return success(res, {
      products: ordered.map((product) => normalizeProductForResponse(product))
    });
  } catch (err) {
    return error(res, err.message);
  }
};

/**
 * GET /api/search/suggestions
 * Returns minimal product names matching search query
 */
exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return success(res, { suggestions: [] });

    const approvedSellerScope = await getApprovedSellerScope();
    const suggestions = await Product.find({
      status: "Active",
      active: { $ne: false },
      name: { $regex: q, $options: "i" },
      ...approvedSellerScope
    })
    .select("name slug images")
    .limit(10)
    .lean();

    return success(res, { suggestions });
  } catch (err) { return error(res, err.message); }
};
