const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const Product = require("./src/models/Product");
const Category = require("./src/models/Category");
const Seller = require("./src/models/Seller");
const StockLog = require("./src/models/StockLog");
const { generateUniqueProductCode, generateVariantCode } = require("./src/utils/productIdentity");

const VENDOR_EMAIL = "frk210803@gmail.com";

async function seedVendorProduct() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB successfully");

    // 1. Locate Vendor
    const seller = await Seller.findOne({ email: VENDOR_EMAIL });
    if (!seller) {
      console.error(`Seller with email ${VENDOR_EMAIL} not found!`);
      process.exit(1);
    }
    console.log(`Found Seller: ${seller.fullName} (${seller.shopName}) - ID: ${seller._id}`);

    // 2. Find or Create Category
    let category = await Category.findOne({ slug: "rings" });
    if (!category) {
      category = await Category.findOne({});
    }
    if (!category) {
      category = await Category.create({
        name: "Rings",
        slug: "rings",
        showInNavbar: true,
        showInCollection: true,
        isActive: true,
        metal: "silver"
      });
      console.log("Created Category: Rings");
    }

    // 3. Generate Product Identifiers & Serial Codes
    const productCode = await generateUniqueProductCode(Product);
    const existingCodes = new Set();
    const variantCode = generateVariantCode(productCode, 0, existingCodes);
    const productSlug = `rs1-test-ring-${Date.now()}`;

    const serialCodes = Array.from({ length: 100 }, (_, i) => ({
      code: `RS1-${String(i + 1).padStart(4, "0")}`,
      status: "AVAILABLE"
    }));

    // 4. Construct Product Data
    const productData = {
      name: "Rs 1 Special Test Ring",
      slug: productSlug,
      productCode: productCode,
      brand: "SANDS",
      categories: [category._id],
      category: category.name,
      categorySlug: category.slug,
      categoryId: category._id,
      navShopByCategory: [category._id],
      description: "Special seed product for testing transactions, cart, checkout, and seller orders at ₹1.",
      stylingTips: "Ideal for verifying ₹1 payment gateway integration and order flow.",
      material: "Silver",
      silverCategory: "925",
      audience: ["unisex"],
      status: "Active",
      showInNavbar: true,
      showInCollection: true,
      active: true,
      isSerialized: true,
      sellerId: seller._id,
      images: [
        "https://images.unsplash.com/photo-1605100804763-247f66156ce4?q=80&w=800"
      ],
      tags: {
        isNewArrival: true,
        isTrending: true,
        isNewLaunch: true
      },
      rating: 5,
      reviewCount: 1,
      variants: [
        {
          name: "Standard",
          size: "Free Size",
          variantCode: variantCode,
          weight: 0,
          weightUnit: "Grams",
          makingCharge: 1,
          metalPrice: 0,
          diamondPrice: 0,
          hallmarkingCharge: 0,
          diamondCertificateCharge: 0,
          additionalCharge: 0,
          hiddenCharge: 0,
          subtotalBeforeTax: 1,
          gstAmount: 0,
          priceAfterTax: 1,
          pgChargePercent: 0,
          pgChargeAmount: 0,
          mrp: 1,
          price: 1,
          finalPrice: 1,
          gst: 0,
          stock: 100,
          sold: 0,
          serialCodes: serialCodes
        }
      ]
    };

    // 5. Create Product
    const product = await Product.create(productData);
    console.log("Product created successfully!");
    console.log("------------------------------------------");
    console.log("Product ID:", product._id.toString());
    console.log("Product Name:", product.name);
    console.log("Product Slug:", product.slug);
    console.log("Product Code:", product.productCode);
    console.log("Seller:", seller.fullName, `(${seller.email})`);
    console.log("Price: ₹", product.variants[0].finalPrice);
    console.log("Stock:", product.variants[0].stock);
    console.log("Status:", product.status);
    console.log("------------------------------------------");

    // 6. Log Initial Stock
    if (product.variants && product.variants.length > 0) {
      await StockLog.create({
        productId: product._id,
        variantId: product.variants[0]._id,
        changeType: "purchase",
        previousStock: 0,
        newStock: product.variants[0].stock,
        change: product.variants[0].stock,
        reason: "Initial seed listing for vendor frk210803@gmail.com",
        sellerId: seller._id
      });
      console.log("StockLog recorded.");
    }

    process.exit(0);
  } catch (error) {
    console.error("Failed to seed vendor product:", error);
    process.exit(1);
  }
}

seedVendorProduct();
