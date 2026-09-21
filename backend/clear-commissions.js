/**
 * One-time script to clear all commission data and reset cached commission summaries.
 * 
 * Usage:
 *   cd backend
 *   node clear-commissions.js
 */
"use strict";

const path = require("path");
const dotenv = require("dotenv");

// Try loading .env from current directory or parent directory
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "../.env") });

const mongoose = require("mongoose");
const connectDB = require("./src/config/db");
const Commission = require("./src/models/Commission");
const Order = require("./src/models/Order");

async function clearCommissions() {
  console.log("--------------------------------------------------");
  console.log(" Starting One-Time Commission Ledger Cleanup...");
  console.log("--------------------------------------------------");

  try {
    await connectDB();

    // 1. Delete all Commission documents
    const deleteResult = await Commission.deleteMany({});
    console.log(`\n✅ Deleted ${deleteResult.deletedCount} records from 'commissions' collection.`);

    // 2. Reset commissionSummary on Orders
    const orderUpdateResult = await Order.updateMany(
      { "commissionSummary.totalCommission": { $gt: 0 } },
      {
        $set: {
          commissionSummary: {
            totalCommission: 0,
            status: "none"
          }
        }
      }
    );
    console.log(`✅ Reset commissionSummary on ${orderUpdateResult.modifiedCount} orders.`);

    console.log("\n--------------------------------------------------");
    console.log("🎉 Commission cleanup completed successfully!");
    console.log("--------------------------------------------------");
  } catch (err) {
    console.error("\n❌ Error clearing commission data:", err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

clearCommissions();
