const Seller = require("../../../models/Seller");
const bcrypt = require("bcryptjs");
const { success, error } = require("../../../utils/apiResponse");
const Setting = require("../../../models/Setting");
const Product = require("../../../models/Product");
const PickupLocation = require("../../../models/PickupLocation");
const SellerProduct = require("../../../models/SellerProduct");
const Notification = require("../../../models/Notification");
const StockLog = require("../../../models/StockLog");
const { computeVariantPricing, normalizeChargeBearer } = require("../../../utils/metalPricing");
const { normalizeMetalRates, hasNegativeRate } = require("../../../utils/metalRateNormalization");
const SellerMetalRateLog = require("../../../models/SellerMetalRateLog");

exports.getProfile = async (req, res) => {
  try {
    const seller = await Seller.findById(req.user.userId).select("-password");
    if (!seller) return error(res, "Seller not found", 404);
    return success(res, { seller });
  } catch (err) { return error(res, err.message); }
};

exports.updateProfile = async (req, res) => {
  try {
    const seller = await Seller.findById(req.user.userId);
    if (!seller) return error(res, "Seller not found", 404);

    const {
      fullName,
      shopName,
      email,
      mobileNumber,
      dob,
      district,
      shopAddress,
      city,
      state,
      pincode,
      bisNumber,
      bisNumberGold,
      bisNumberSilver,
      firmType,
      cin,
      llpin,
      gstNumber,
      panNumber,
    } = req.body;

    const trimString = (value) => (typeof value === "string" ? value.trim() : value);
    const upperString = (value) => (typeof value === "string" ? value.trim().toUpperCase() : value);
    const digitsOnly = (value) => (typeof value === "string" ? value.replace(/\D/g, "") : value);
    const isEmailLike = (value = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
    const isValidIfsc = (value = "") => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(value || "").trim().toUpperCase());

    // Resolve Bank Account
    let bankAccount = req.body.bankAccount;
    if (typeof bankAccount === "string") {
      try {
        bankAccount = JSON.parse(bankAccount);
      } catch (err) {
        bankAccount = undefined;
      }
    }

    // Resolve Documents
    const documents = { ...(seller.documents || {}) };
    if (req.files?.aadhar?.[0]?.path) documents.aadharUrl = req.files.aadhar[0].path;
    if (req.files?.shopLicense?.[0]?.path) documents.shopLicenseUrl = req.files.shopLicense[0].path;
    if (req.files?.certificate?.[0]?.path) documents.certificateUrl = req.files.certificate[0].path;
    if (req.files?.partnershipDeed?.[0]?.path) documents.partnershipDeedUrl = req.files.partnershipDeed[0].path;
    if (req.files?.pan?.[0]?.path) documents.panUrl = req.files.pan[0].path;
    if (req.files?.gst?.[0]?.path) documents.gstUrl = req.files.gst[0].path;
    if (req.files?.visitingCard?.[0]?.path) documents.visitingCardUrl = req.files.visitingCard[0].path;
    if (req.files?.diamondCertificate?.[0]?.path) documents.diamondCertificateUrl = req.files.diamondCertificate[0].path;

    // Strict Validations for Profile Submission
    const finalFullName = trimString(fullName);
    const finalShopName = trimString(shopName);
    const finalEmail = String(email || "").trim().toLowerCase();
    const finalMobileNumber = digitsOnly(String(mobileNumber || "").trim());
    const finalDob = dob ? new Date(dob) : null;
    const finalDistrict = trimString(district);
    const finalShopAddress = trimString(shopAddress);
    const finalCity = trimString(city);
    const finalState = trimString(state);
    const finalPincode = digitsOnly(String(pincode || "").trim());

    if (!finalFullName) return error(res, "Full name is required", 400);
    if (!finalShopName) return error(res, "Shop name is required", 400);
    if (!finalEmail) return error(res, "Email is required", 400);
    if (!isEmailLike(finalEmail)) return error(res, "Invalid email address", 400);
    if (!finalMobileNumber || finalMobileNumber.length !== 10) {
      return error(res, "Mobile number must be 10 digits", 400);
    }
    if (!finalDob) return error(res, "Date of birth is required", 400);
    if (!finalDistrict) return error(res, "District is required", 400);
    if (!finalShopAddress) return error(res, "Shop address is required", 400);
    if (!finalCity) return error(res, "City is required", 400);
    if (!finalState) return error(res, "State is required", 400);
    if (!finalPincode || finalPincode.length !== 6) {
      return error(res, "Pincode must be 6 digits", 400);
    }

    const finalGstNumber = upperString(gstNumber);
    const finalPanNumber = upperString(panNumber);

    if (!finalGstNumber) return error(res, "GST number is required", 400);
    if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d[Z]{1}[A-Z\d]{1}$/i.test(finalGstNumber)) {
      return error(res, "Enter a valid GST number", 400);
    }
    if (!finalPanNumber) return error(res, "PAN number is required", 400);
    if (!/^[A-Z]{5}\d{4}[A-Z]{1}$/i.test(finalPanNumber)) {
      return error(res, "Enter a valid PAN number", 400);
    }

    // Bank Account validation
    if (!bankAccount || typeof bankAccount !== "object") {
      return error(res, "Bank account details are required", 400);
    }
    const acc = digitsOnly(String(bankAccount.accountNumber || "").trim());
    const ifsc = upperString(bankAccount.ifscCode);
    const bankNameVal = trimString(bankAccount.bankName);
    const branchNameVal = trimString(bankAccount.branchName);

    if (!acc || acc.length < 9 || acc.length > 18) {
      return error(res, "Account number must be between 9 and 18 digits", 400);
    }
    if (!ifsc || !isValidIfsc(ifsc)) {
      return error(res, "Enter a valid bank IFSC code", 400);
    }
    if (!bankNameVal) {
      return error(res, "Bank name is required", 400);
    }

    // Firm Type validation
    const allowedFirmTypes = ["sole proprietorship", "Partnership", "Pvt Ltd", "LLP"];
    if (!firmType || !allowedFirmTypes.includes(firmType)) {
      return error(res, "Please select a valid firm type", 400);
    }

    let finalCin = undefined;
    let finalLlpin = undefined;

    if (firmType === "Partnership") {
      if (!documents.partnershipDeedUrl) {
        return error(res, "Partnership Deed document is required", 400);
      }
    } else if (firmType === "Pvt Ltd") {
      finalCin = trimString(cin);
      if (!finalCin) {
        return error(res, "Corporate Identification Number (CIN) is required", 400);
      }
    } else if (firmType === "LLP") {
      finalLlpin = trimString(llpin);
      if (!finalLlpin) {
        return error(res, "LLP Identification Number is required", 400);
      }
    }

    // Document validation
    if (!documents.aadharUrl) return error(res, "Aadhar document is required", 400);
    if (!documents.shopLicenseUrl) return error(res, "Shop license document is required", 400);
    if (!documents.certificateUrl) return error(res, "Certificate document is required", 400);
    if (!documents.panUrl) return error(res, "PAN document upload is required", 400);
    if (!documents.gstUrl) return error(res, "GST document upload is required", 400);

    // Check unique email / mobile
    if (finalEmail !== seller.email) {
      const existingEmail = await Seller.findOne({ email: finalEmail });
      if (existingEmail) return error(res, "Email already in use", 400);
    }
    if (finalMobileNumber !== seller.mobileNumber) {
      const existingMobile = await Seller.findOne({ mobileNumber: finalMobileNumber });
      if (existingMobile) return error(res, "Mobile number already in use", 400);
    }

    // Apply updates
    seller.fullName = finalFullName;
    seller.shopName = finalShopName;
    seller.email = finalEmail;
    seller.mobileNumber = finalMobileNumber;
    seller.dob = finalDob;
    seller.district = finalDistrict;
    seller.shopAddress = finalShopAddress;
    seller.city = finalCity;
    seller.state = finalState;
    seller.pincode = finalPincode;
    seller.bisNumber = upperString(bisNumber);
    seller.bisNumberGold = upperString(bisNumberGold);
    seller.bisNumberSilver = upperString(bisNumberSilver);
    seller.firmType = firmType;
    seller.cin = finalCin;
    seller.llpin = finalLlpin;
    seller.bankAccount = {
      accountNumber: acc,
      ifscCode: ifsc,
      bankName: bankNameVal,
      branchName: branchNameVal,
    };
    seller.documents = documents;
    seller.gstNumber = finalGstNumber;
    seller.panNumber = finalPanNumber;

    // Transition status to PENDING review, clear rejectionReason
    seller.status = "PENDING";
    seller.rejectionReason = undefined;

    await seller.save();

    // Create Admin Notification
    const adminNotification = await Notification.create({
      title: "Seller Profile Updated",
      message: `${seller.fullName} updated their profile for shop ${seller.shopName} and is awaiting approval.`,
      type: "SELLER_REQUEST",
      priority: "High",
      link: `/admin/seller-details/${seller._id}`,
      isBroadcast: true,
    }).catch(() => null);

    if (adminNotification) {
      try {
        const { emitBroadcastNotification } = require("../../../services/socketEmitter");
        emitBroadcastNotification(adminNotification);
      } catch (err) {
        console.error("Failed to emit socket notification:", err.message);
      }
    }

    // Notify Admin via Email
    if (process.env.ADMIN_EMAIL) {
      try {
        const { sendEmail } = require("../../../services/emailService");
        await sendEmail({
          to: process.env.ADMIN_EMAIL,
          subject: "Seller profile submitted for review",
          html: `Seller ${seller.fullName} (${seller.shopName}) has updated their business profile and is awaiting approval.\n\nReview the updated credentials in the admin panel.`,
        });
      } catch (mailErr) {
        console.error("Seller profile update email failed:", mailErr.message);
      }
    }

    return success(res, { seller: seller.toObject({ versionKey: false, transform: (_, ret) => { delete ret.password; return ret; } }) }, "Profile details submitted for admin review successfully");
  } catch (err) {
    return error(res, err.message);
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return error(res, "Current and new password are required", 400);
    }
    if (newPassword.length < 4) {
      return error(res, "Password must be at least 4 characters long", 400);
    }

    const seller = await Seller.findById(req.user.userId);
    if (!seller) return error(res, "Seller not found", 404);

    const isMatch = await bcrypt.compare(currentPassword, seller.password);
    if (!isMatch) return error(res, "Current password is incorrect", 400);

    const salt = await bcrypt.genSalt(10);
    seller.password = await bcrypt.hash(newPassword, salt);
    await seller.save();

    return success(res, {}, "Password updated successfully");
  } catch (err) { return error(res, err.message); }
};

exports.getMetalPricing = async (req, res) => {
  try {
    const seller = await Seller.findById(req.user.userId).select("metalRates updatedAt");
    if (!seller) return error(res, "Seller not found", 404);
    const settings = await Setting.findOne();
    const sellerProductCount = await Product.countDocuments({ sellerId: req.user.userId });
    const normalizedRates = normalizeMetalRates({}, seller.metalRates || {});
    return success(res, {
      metalRates: normalizedRates,
      gstRate: settings?.gstRate || 0,
      sellerProductCount,
      updatedAt: seller.updatedAt || null
    }, "Metal pricing retrieved");
  } catch (err) { return error(res, err.message); }
};

exports.updateMetalPricing = async (req, res) => {
  try {
    const { metalRates, gstRate: requestedGstRate } = req.body || {};
    const seller = await Seller.findById(req.user.userId);
    if (!seller) return error(res, "Seller not found", 404);

    const previousRates = seller.metalRates ? { ...seller.metalRates } : {};

    if (requestedGstRate !== undefined && requestedGstRate !== null) {
      return error(res, "GST is managed by admin and cannot be updated from seller metal pricing", 400);
    }

    if (metalRates && typeof metalRates === "object") {
      const normalized = normalizeMetalRates(metalRates, seller.metalRates || {});
      if (hasNegativeRate(normalized)) {
        return error(res, "Metal rates cannot be negative", 400);
      }
      seller.metalRates = normalized;
    }
    await seller.save();

    const settings = await Setting.findOne();
    const gstRate = settings?.gstRate || 0;

    // Production hardening: reprice in batches via bulkWrite to avoid timeouts and partial failures.
    const sellerId = req.user.userId;
    const cursor = Product.find({ sellerId })
      .select("paymentGatewayChargeBearer material goldCategory silverCategory weight weightUnit variants")
      .lean()
      .cursor();

    const batchSize = 200;
    let ops = [];
    let processedProducts = 0;
    let processedVariants = 0;
    let modifiedProducts = 0;
    const failedProductIds = [];

    const flush = async () => {
      if (ops.length === 0) return;
      try {
        const result = await Product.bulkWrite(ops, { ordered: false });
        modifiedProducts += Number(result?.modifiedCount || 0);
      } catch (err) {
        // bulkWrite can throw when some ops fail; we still want to continue.
        // We already track per-product compute failures; here we only log and continue.
        console.error("Seller metal repricing bulkWrite failed:", err?.message || err);
      } finally {
        ops = [];
      }
    };

    for await (const product of cursor) {
      try {
        const normalizedBearer = normalizeChargeBearer(product.paymentGatewayChargeBearer);
        const productPayload = {
          ...product,
          paymentGatewayChargeBearer: normalizedBearer
        };

        const variants = Array.isArray(productPayload.variants) ? productPayload.variants : [];
        const nextVariants = variants.map((variant) => {
          const pricing = computeVariantPricing({
            product: productPayload,
            variant,
            rates: seller.metalRates || {},
            gstRate
          });
          return { ...variant, ...pricing };
        });

        processedProducts += 1;
        processedVariants += nextVariants.length;

        ops.push({
          updateOne: {
            filter: { _id: productPayload._id, sellerId },
            update: {
              $set: {
                paymentGatewayChargeBearer: normalizedBearer,
                variants: nextVariants,
                updatedAt: new Date()
              }
            }
          }
        });

        if (ops.length >= batchSize) {
          await flush();
        }
      } catch (err) {
        failedProductIds.push(String(product?._id || ""));
      }
    }
    await flush();

    const sellerProductCount = processedProducts;

    // Audit trail (best effort).
    await SellerMetalRateLog.create({
      sellerId,
      previousRates,
      newRates: seller.metalRates || {},
      gstRate,
      summary: {
        updatedProducts: modifiedProducts || processedProducts,
        updatedVariants: processedVariants,
        failedProducts: failedProductIds.length
      }
    }).catch(() => {});

    return success(res, {
      metalRates: normalizeMetalRates({}, seller.metalRates || {}),
      gstRate,
      sellerProductCount,
      updatedAt: seller.updatedAt || null,
      updateSummary: {
        processedProducts,
        modifiedProducts,
        processedVariants,
        failedProductIds
      }
    }, "Metal pricing updated successfully");
  } catch (err) { return error(res, err.message); }
};

exports.deleteAccount = async (req, res) => {
  try {
    const sellerId = req.user.userId;

    const seller = await Seller.findById(sellerId);
    if (!seller) return error(res, "Seller not found", 404);

    // Cascade delete all seller-owned operational data.
    // Financial/order records (Commission, Order, Shipment, PayoutRequest, WalletTransaction)
    // are intentionally preserved for audit and customer order history integrity.
    await Promise.all([
      Product.deleteMany({ sellerId }),
      SellerProduct.deleteMany({ sellerId }),
      PickupLocation.deleteMany({ sellerId }),
      Notification.deleteMany({ sellerId }),
      StockLog.deleteMany({ sellerId }),
      SellerMetalRateLog.deleteMany({ sellerId }),
      Seller.deleteOne({ _id: sellerId }),
    ]);

    return success(res, {}, "Seller account deleted successfully");
  } catch (err) { return error(res, err.message); }
};
