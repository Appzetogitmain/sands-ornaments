const Seller = require("../models/Seller");

const TTL_MS = 10 * 1000; // 10 seconds
const MAX_RETRIES = 2; // Bounded retries for mid-flight generation invalidations

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
 * 4. Safe Promise ownership (old promises cannot clear new inFlightPromise slots)
 * 5. Call-site immutability guarantee (fresh filter object returned per invocation)
 * 6. Fail-closed error propagation & stale-rejection (no stale fallback, bounded retry error)
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

  const currentPromise = (async () => {
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

    // Generation mismatch: result came from an invalidated generation.
    // NEVER populate cache and NEVER return approvedSellerIds to the caller.
    if (retryCount < MAX_RETRIES) {
      return getApprovedSellerScope(retryCount + 1);
    }

    // Fail-closed: Never return stale seller IDs when retry limit is exhausted
    throw new Error(
      "Approved seller scope resolution exceeded retry limit due to rapid concurrent seller updates"
    );
  })().finally(() => {
    // Only the Promise that currently owns the inFlight slot may clear it
    if (inFlightPromise === currentPromise) {
      inFlightPromise = null;
    }
  });

  inFlightPromise = currentPromise;
  return currentPromise;
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
