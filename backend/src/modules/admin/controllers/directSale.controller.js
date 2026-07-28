const mongoose = require("mongoose");
const Product = require("../../../models/Product");
const StockLog = require("../../../models/StockLog");
const DirectSale = require("../../../models/DirectSale");
const { success, error } = require("../../../utils/apiResponse");
const { consumeSerializedStock, isSerializedVariant, normalizeSerialCodes, countAvailableCodes } = require("../../../utils/inventorySync");

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const safeTrim = (value) => String(value || "").trim();
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));
const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findAdminProductBySerialCode = async ({ serialCode, session }) => {
  const query = {
    sellerId: null, // Admin-owned
    "variants.serialCodes.code": serialCode
  };
  return Product.findOne(query).session(session || null);
};

const findVariantAndCode = (product, serialCode) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const variant = variants.find((v) =>
    Array.isArray(v?.serialCodes) && v.serialCodes.some((c) => String(c?.code || "") === String(serialCode))
  );
  if (!variant) return { variant: null, codeEntry: null, variantIndex: -1 };
  const codeEntry = (variant.serialCodes || []).find((c) => String(c?.code || "") === String(serialCode)) || null;
  const variantIndex = variants.findIndex((v) => String(v?._id || "") === String(variant?._id || ""));
  return { variant, codeEntry, variantIndex };
};

exports.preview = async (req, res) => {
  try {
    const serialCode = safeTrim(req.body.serialCode || req.body.productCode);
    if (!serialCode) return error(res, "Serial code is required", 400);

    const product = await findAdminProductBySerialCode({ serialCode });
    if (!product) return error(res, "Product not found (or belongs to a seller)", 404);

    const { variant, codeEntry } = findVariantAndCode(product, serialCode);
    if (!variant || !codeEntry) return error(res, "Variant not found", 404);

    const status = String(codeEntry.status || "AVAILABLE");
    const available = status === "AVAILABLE";

    return success(
      res,
      {
        available,
        serialCode,
        status,
        product: {
          productId: product._id,
          name: product.name,
          image: Array.isArray(product.images) ? (product.images[0] || "") : "",
          material: product.material || ""
        },
        variant: {
          variantId: variant._id,
          name: variant.name || "Standard",
          price: Number(variant.price) || 0,
          stock: Number(variant.stock) || 0
        }
      },
      available ? "Serial code is available" : "Serial code is not available"
    );
  } catch (err) {
    return error(res, err.message);
  }
};

exports.confirm = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const serialCode = safeTrim(req.body.serialCode || req.body.productCode);
    if (!serialCode) return error(res, "Serial code is required", 400);

    const paymentMethod = "cash"; // Admin direct sales default to cash
    const customerName = "";
    const customerPhone = "";
    const note = "Logged by admin";

    session.startTransaction();

    // Prevent duplicate direct sales for the same unit.
    const existing = await DirectSale.findOne({ serialCode }).session(session);
    if (existing) {
      await session.abortTransaction();
      return error(res, "This unit has already been recorded as a direct sale", 409);
    }

    const product = await findAdminProductBySerialCode({ serialCode, session });
    if (!product) {
      await session.abortTransaction();
      return error(res, "Product not found (or belongs to a seller)", 404);
    }

    const { variant, codeEntry, variantIndex } = findVariantAndCode(product, serialCode);
    if (!variant || !codeEntry) {
      await session.abortTransaction();
      return error(res, "Variant not found", 404);
    }

    const currentStatus = String(codeEntry.status || "AVAILABLE");
    if (currentStatus !== "AVAILABLE") {
      await session.abortTransaction();
      return error(res, "Serial code is not available", 400);
    }

    const previousStock = Number(variant.stock) || 0;

    if (isSerializedVariant(product, variant)) {
      consumeSerializedStock({
        product,
        variant,
        quantity: 1,
        variantIndex,
        saleStatus: "SOLD_OFFLINE"
      });
    } else {
      codeEntry.status = "SOLD_OFFLINE";
      variant.stock = Math.max(0, previousStock - 1);
    }

    await product.save({ session });

    await StockLog.create(
      [
        {
          productId: product._id,
          variantId: variant._id,
          changeType: "sale",
          previousStock,
          newStock: Number(variant.stock) || 0,
          change: -1,
          reason: `Direct sale (offline) - ${serialCode} (Admin)`,
          sellerId: null, // Admin
          adminId: req.user?._id || req.user?.id || null
        }
      ],
      { session }
    );

    const sale = await DirectSale.create(
      [
        {
          sellerId: null, // Admin
          productId: product._id,
          variantId: variant._id,
          serialCode,
          productName: product.name || "",
          variantName: variant.name || "Standard",
          productImage: Array.isArray(product.images) ? (product.images[0] || "") : "",
          material: product.material || "",
          amount: Number(variant.price) || 0,
          currency: "INR",
          paymentMethod,
          customerName,
          customerPhone,
          note,
          status: "completed"
        }
      ],
      { session }
    );

    await session.commitTransaction();

    return success(res, { directSale: sale[0] }, "Direct sale recorded successfully");
  } catch (err) {
    try {
      await session.abortTransaction();
    } catch (_e) {
      // ignore
    }
    if (String(err?.code) === "11000") {
      return error(res, "This unit has already been recorded", 409);
    }
    return error(res, err.message);
  } finally {
    session.endSession();
  }
};

exports.list = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const { status, search, sellerId } = req.query;

    // Admin direct sales history only returns admin-owned direct sales (sellerId: null)
    const query = { sellerId: null };
    if (status) query.status = String(status);

    if (search) {
      const escaped = escapeRegex(search);
      query.$or = [
        { serialCode: { $regex: escaped, $options: "i" } },
        { productName: { $regex: escaped, $options: "i" } },
        { variantName: { $regex: escaped, $options: "i" } },
        { customerName: { $regex: escaped, $options: "i" } },
        { customerPhone: { $regex: escaped, $options: "i" } }
      ];
    }

    const skip = (page - 1) * limit;
    const [sales, total] = await Promise.all([
      DirectSale.find(query)
        .populate("sellerId", "shopName fullName email mobileNumber")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      DirectSale.countDocuments(query)
    ]);

    return success(res, {
      directSales: sales,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    }, "All direct sales retrieved");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.void = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const id = req.params.id;
    if (!isValidObjectId(id)) return error(res, "Invalid direct sale id", 400);

    const reason = safeTrim(req.body.reason) || "Voided by admin";

    session.startTransaction();

    // Query sale without restricting by sellerId to allow admin to void any sale (or admin-owned sale)
    const sale = await DirectSale.findById(id).session(session);
    if (!sale) {
      await session.abortTransaction();
      return error(res, "Direct sale not found", 404);
    }
    if (sale.status !== "completed") {
      await session.abortTransaction();
      return error(res, "Only completed direct sales can be voided", 400);
    }

    const serialCode = String(sale.serialCode || "").trim();
    if (!serialCode) {
      await session.abortTransaction();
      return error(res, "Missing serial code on sale", 400);
    }

    // Find the product by serial code (checking both admin and seller products based on sale.sellerId)
    const productQuery = {
      sellerId: sale.sellerId,
      "variants.serialCodes.code": serialCode
    };
    const product = await Product.findOne(productQuery).session(session);
    if (!product) {
      await session.abortTransaction();
      return error(res, "Associated product not found", 404);
    }

    const { variant, codeEntry } = findVariantAndCode(product, serialCode);
    if (!variant || !codeEntry) {
      await session.abortTransaction();
      return error(res, "Associated variant not found", 404);
    }

    const currentStatus = String(codeEntry.status || "AVAILABLE");
    if (currentStatus !== "SOLD_OFFLINE") {
      await session.abortTransaction();
      return error(
        res,
        `Cannot void: serial code status is ${currentStatus} (expected SOLD_OFFLINE)`,
        400
      );
    }

    const previousStock = Number(variant.stock) || 0;

    codeEntry.status = "AVAILABLE";
    const normalized = normalizeSerialCodes(variant.serialCodes || []);
    variant.serialCodes = normalized;
    variant.stock = countAvailableCodes(normalized);

    await product.save({ session });

    await StockLog.create(
      [
        {
          productId: product._id,
          variantId: variant._id,
          changeType: "return",
          previousStock,
          newStock: Number(variant.stock) || 0,
          change: (Number(variant.stock) || 0) - previousStock,
          reason: `Direct sale void - ${serialCode}. ${reason} (Admin)`,
          sellerId: sale.sellerId,
          adminId: req.user?._id || req.user?.id || null
        }
      ],
      { session }
    );

    sale.status = "voided";
    sale.voidReason = reason;
    sale.voidedAt = new Date();
    await sale.save({ session });

    await session.commitTransaction();

    return success(res, { directSale: sale }, "Direct sale voided successfully");
  } catch (err) {
    try {
      await session.abortTransaction();
    } catch (_e) {
      // ignore
    }
    return error(res, err.message);
  } finally {
    session.endSession();
  }
};
