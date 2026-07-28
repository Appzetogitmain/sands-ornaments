const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const morgan = require("morgan");

const { notFound, errorHandler } = require("./middlewares/errorHandler");
const authenticate = require("./middlewares/authenticate");
const requireRole = require("./middlewares/requireRole");

const app = express();

const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://sands-ornaments-ten.vercel.app",
  "https://sandsjewels.com",
];

const configuredAllowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [];

const allowedOrigins = [
  ...new Set([...defaultAllowedOrigins, ...configuredAllowedOrigins]),
];

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes("*") || allowedOrigins.includes(origin))
    return true;

  try {
    const { hostname } = new URL(origin);
    return hostname.endsWith(".vercel.app");
  } catch (error) {
    return false;
  }
};

// ── GLOBAL MIDDLEWARES ───────────────────────────────────────────────────────
app.use(helmet()); // Security headers
const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(compression()); // Performance: Gzip compression
app.use(morgan("dev")); // Logging (Production: use "combined")

// Trust first proxy (required for accurate IP detection behind reverse proxies/load balancers)
app.set("trust proxy", 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // limit each IP to 1000 requests per windowMs
});
app.use("/api/", limiter);

// Health Check / Root route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Sands Jewels API is running smoothly",
    timestamp: new Date().toISOString(),
  });
});

// Auth (user + admin + seller)
app.use("/api/auth", require("./modules/auth/routes/auth.routes"));

// Public Tracking (no auth)
app.use("/api/analytics", require("./modules/admin/routes/analytics.routes"));

// Public storefront (no auth)
app.use("/api/public", require("./modules/public/routes/index"));

// ── Courier Webhooks (no auth – verified by secret inside controllers) ───────
app.post(
  "/api/webhooks/shiprocket",
  require("./modules/shared/shiprocketWebhook.controller")
    .handleShiprocketWebhook,
);

// Customer routes (must be authenticated)
// Allow both users and sellers to access user-related routes if they have the token,
// but requireRole("user") for specific ones inside the module.
// However, to be safe, I'll just allow "seller" for the notifications specifically.
app.use(
  "/api/user",
  authenticate,
  (req, res, next) => {
    // Allow all authenticated users (User, Seller, Admin) to access personal data endpoints
    // If they are not an 'admin' or 'seller', they default to requireRole('user')
    return requireRole("user", "seller", "admin")(req, res, next);
  },
  require("./modules/user/routes/index"),
);

// Admin routes
app.use(
  "/api/admin",
  authenticate,
  requireRole("admin"),
  require("./modules/admin/routes/index"),
);

// Seller routes
app.use(
  "/api/seller",
  authenticate,
  requireRole("seller", { allowUnapproved: true }),
  require("./modules/seller/routes/index"),
);

// -- Error Handling -------------------------------------------------------------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
