"use strict";

const Return = require("../models/Return");
const Replacement = require("../models/Replacement");

/**
 * Checks if there are other active return or replacement claims on an order
 * excluding the current claim being updated.
 *
 * @param {ObjectId|String} orderId - The order ID to check
 * @param {ObjectId|String} currentClaimId - The current claim ID to ignore
 * @returns {Promise<Boolean>} - True if other active claims exist, false otherwise
 */
const hasOtherActiveClaims = async (orderId, currentClaimId) => {
  const activeReturns = await Return.find({
    orderId,
    _id: { $ne: currentClaimId },
    status: { $in: ["Pending", "Approved", "Pickup Scheduled", "Pickup Completed", "Refund Initiated"] }
  });

  const activeReplacements = await Replacement.find({
    orderId,
    _id: { $ne: currentClaimId },
    status: { $in: ["Pending", "Approved", "Pickup Scheduled", "Pickup Completed", "Replacement Shipped"] }
  });

  return activeReturns.length > 0 || activeReplacements.length > 0;
};

module.exports = {
  hasOtherActiveClaims
};
