const Seller = require("../models/Seller");

const TTL_MS = 10 * 1000; // 10 seconds

let cacheGeneration = 0;
let cachedApprovedSellerIds = null;
let cacheExpiresAt = 0;
let inFlightPromise = null;

/**
 * Builds the MongoDB query filter object from an array of approved seller ObjectIds.
 * Constructing a fresh object per call prevents shared mutable state across requests.
 *
 * @param {Array} ids - Array of approved seller _id values
 * @returns {Object} MongoDB $or filter
 */
const buildScopeFilter = (ids) => {
  if (ids && ids.length > 0) {
    return {
      $or: [
        { sellerId: null },
        { sellerId: { $exists: false } },
        { sellerId: { $in: [...ids] } },
      ],
    };
  }
  return {
    $or: [{ sellerId: null }, { sellerId: { $exists: false } }],
  };
};

/**
 * Retrieves the approved seller query scope using an in-process cache with:
 * 1. 10-second TTL
 * 2. In-flight Promise deduplication (coalescing simultaneous concurrent calls)
 * 3. Generation guard (prevents stale in-flight results from overwriting newer invalidations)
 * 4. Immutability guarantee (fresh filter object returned per invocation)
 * 5. Fail-closed error propagation (no stale-while-error)
 *
 * @param {number} [retryCount=0] - Recursion guard for race resolution
 * @returns {Promise<Object>} The MongoDB sellerId query filter
 */
const getApprovedSellerScope = async (retryCount = 0) => {
  const now = Date.now();

  // Fast path: cache hit
  if (cachedApprovedSellerIds !== null && now < cacheExpiresAt) {
    return buildScopeFilter(cachedApprovedSellerIds);
  }

  // Deduplication: if a query is already running, await it
  if (inFlightPromise) {
    return inFlightPromise;
  }

  const queryGeneration = cacheGeneration;

  inFlightPromise = (async () => {
    try {
      const approvedSellers = await Seller.find({ status: "APPROVED" })
        .select("_id")
        .lean();

      const approvedSellerIds = (approvedSellers || []).map((seller) => seller._id);

      // Concurrency guard: Only populate cache if no invalidation occurred during execution
      if (queryGeneration === cacheGeneration) {
        cachedApprovedSellerIds = approvedSellerIds;
        cacheExpiresAt = Date.now() + TTL_MS;
        return buildScopeFilter(cachedApprovedSellerIds);
      }

      // If generation changed while query was running, this result is stale.
      // Do NOT populate cache with stale data.
      // Retry once against the current generation to ensure correctness for the waiting request.
      if (retryCount < 2) {
        return getApprovedSellerScope(retryCount + 1);
      }

      // Safety fallback if rapid successive mutations occur: return fresh query non-cached
      return buildScopeFilter(approvedSellerIds);
    } finally {
      // Clear in-flight promise reference
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
};

/**
 * Synchronously invalidates the approved seller scope cache.
 * Increments generation to invalidate any currently in-flight DB queries.
 */
const invalidateApprovedSellerScope = () => {
  cacheGeneration += 1;
  cachedApprovedSellerIds = null;
  cacheExpiresAt = 0;
  inFlightPromise = null;
};

/**
 * Helper to inspect cache state for isolated unit testing only.
 */
const _getCacheStateForTesting = () => ({
  cacheGeneration,
  cachedApprovedSellerIds: cachedApprovedSellerIds ? [...cachedApprovedSellerIds] : null,
  cacheExpiresAt,
  hasInFlightPromise: inFlightPromise !== null,
});

module.exports = {
  getApprovedSellerScope,
  invalidateApprovedSellerScope,
  _getCacheStateForTesting,
};
