const assert = require("assert");
const mongoose = require("mongoose");
const Seller = require("../src/models/Seller");
const {
  getApprovedSellerScope,
  invalidateApprovedSellerScope,
  _getCacheStateForTesting,
} = require("../src/services/sellerScopeService");

/**
 * Deterministic Test Harness for Seller Scope Caching & Invalidation
 * Mocks Seller.find completely to ensure ZERO database interaction/mutation.
 */
async function runTests() {
  console.log("=== STARTING SELLER SCOPE CACHE TEST SUITE ===");

  const originalFind = Seller.find;
  let findCallCount = 0;
  let mockQueryResult = [];
  let mockQueryDelayMs = 0;
  let mockShouldReject = false;
  let mockPendingResolve = null;

  // Setup mock Seller.find
  Seller.find = function (filter) {
    findCallCount++;
    return {
      select: function (fields) {
        return {
          lean: function () {
            if (mockPendingResolve) {
              return new Promise((resolve, reject) => {
                mockPendingResolve = { resolve, reject };
              });
            }
            if (mockShouldReject) {
              return Promise.reject(new Error("Simulated MongoDB Network Error"));
            }
            if (mockQueryDelayMs > 0) {
              return new Promise((resolve) => {
                setTimeout(() => resolve(mockQueryResult), mockQueryDelayMs);
              });
            }
            return Promise.resolve(mockQueryResult);
          },
        };
      },
    };
  };

  const resetMock = () => {
    findCallCount = 0;
    mockQueryResult = [];
    mockQueryDelayMs = 0;
    mockShouldReject = false;
    mockPendingResolve = null;
    invalidateApprovedSellerScope();
  };

  try {
    // -------------------------------------------------------------
    // TEST 1: CACHE MISS (First call queries Seller)
    // -------------------------------------------------------------
    console.log("\n[TEST 1] Cache Miss -> Queries Seller");
    resetMock();
    const sellerId1 = new mongoose.Types.ObjectId();
    mockQueryResult = [{ _id: sellerId1 }];

    const scope1 = await getApprovedSellerScope();
    assert.strictEqual(findCallCount, 1, "Expected 1 DB query on cache miss");
    assert(Array.isArray(scope1.$or), "Scope must have $or array");
    assert.strictEqual(scope1.$or.length, 3, "Scope must have 3 clauses when approved sellers exist");
    assert.deepStrictEqual(scope1.$or[2].sellerId.$in, [sellerId1]);
    console.log("✔ PASS: Cache miss executed DB query and returned approved seller scope");

    // -------------------------------------------------------------
    // TEST 2: CACHE HIT (Second call within TTL does not query Seller)
    // -------------------------------------------------------------
    console.log("\n[TEST 2] Cache Hit -> Served from memory");
    const scope2 = await getApprovedSellerScope();
    assert.strictEqual(findCallCount, 1, "Expected still 1 DB query (served from memory)");
    assert.deepStrictEqual(scope2.$or[2].sellerId.$in, [sellerId1]);
    console.log("✔ PASS: Second call served from memory with zero DB queries");

    // -------------------------------------------------------------
    // TEST 3: IMMUTABILITY (Mutating returned scope doesn't corrupt cache)
    // -------------------------------------------------------------
    console.log("\n[TEST 3] Immutability Defense");
    scope2.$or.push({ corruptedClause: true });
    scope2.$or[2].sellerId.$in.push(new mongoose.Types.ObjectId());

    const scope3 = await getApprovedSellerScope();
    assert.strictEqual(scope3.$or.length, 3, "Cache must not retain caller's pushed clause");
    assert.strictEqual(scope3.$or[2].sellerId.$in.length, 1, "Cache must not retain caller's pushed ID");
    assert.deepStrictEqual(scope3.$or[2].sellerId.$in, [sellerId1]);
    console.log("✔ PASS: Caller mutations to returned scope cannot corrupt cached state");

    // -------------------------------------------------------------
    // TEST 4: INVALIDATION (Invalidation forces next call to query Seller)
    // -------------------------------------------------------------
    console.log("\n[TEST 4] Explicit Invalidation");
    invalidateApprovedSellerScope();
    const sellerId2 = new mongoose.Types.ObjectId();
    mockQueryResult = [{ _id: sellerId2 }];

    const scope4 = await getApprovedSellerScope();
    assert.strictEqual(findCallCount, 2, "Expected new DB query after invalidation");
    assert.deepStrictEqual(scope4.$or[2].sellerId.$in, [sellerId2]);
    console.log("✔ PASS: Invalidation successfully triggered fresh DB query");

    // -------------------------------------------------------------
    // TEST 5: NO APPROVED SELLERS (Empty result handling)
    // -------------------------------------------------------------
    console.log("\n[TEST 5] No Approved Sellers");
    invalidateApprovedSellerScope();
    mockQueryResult = [];

    const scopeEmpty = await getApprovedSellerScope();
    assert.strictEqual(scopeEmpty.$or.length, 2, "Scope must have only null/missing clauses when no sellers approved");
    assert.deepStrictEqual(scopeEmpty.$or, [{ sellerId: null }, { sellerId: { $exists: false } }]);
    console.log("✔ PASS: Correct fallback scope for 0 approved sellers");

    // -------------------------------------------------------------
    // TEST 6: FAIL-CLOSED ON DB ERROR (No stale data returned)
    // -------------------------------------------------------------
    console.log("\n[TEST 6] Fail-Closed DB Error Handling");
    invalidateApprovedSellerScope();
    mockShouldReject = true;

    await assert.rejects(
      async () => {
        await getApprovedSellerScope();
      },
      /Simulated MongoDB Network Error/,
      "Expected error to bubble up without suppressing or returning stale data"
    );
    console.log("✔ PASS: Database errors bubble up cleanly; no stale fallback returned");

    // -------------------------------------------------------------
    // TEST 7: IN-FLIGHT DEDUPLICATION (Multiple concurrent calls -> 1 DB query)
    // -------------------------------------------------------------
    console.log("\n[TEST 7] In-Flight Concurrent Deduplication");
    resetMock();
    mockQueryResult = [{ _id: sellerId1 }];
    mockQueryDelayMs = 25; // Introduce small latency to test concurrency

    const [resA, resB, resC] = await Promise.all([
      getApprovedSellerScope(),
      getApprovedSellerScope(),
      getApprovedSellerScope(),
    ]);

    assert.strictEqual(findCallCount, 1, "Expected exactly 1 DB query for 3 concurrent callers");
    assert.deepStrictEqual(resA, resB);
    assert.deepStrictEqual(resB, resC);
    console.log("✔ PASS: 3 simultaneous callers coalesced into 1 DB query");

    // -------------------------------------------------------------
    // TEST 8: MANDATORY CONCURRENCY RACE TEST (Generation Guard)
    // -------------------------------------------------------------
    console.log("\n[TEST 8] Concurrency Race Guard (Generation Mismatch)");
    resetMock();

    const staleSellerId = new mongoose.Types.ObjectId();
    const freshSellerId = new mongoose.Types.ObjectId();

    // 1. Configure query to be held pending
    mockPendingResolve = true;

    // 2. Request A starts query
    const stateAtStart = _getCacheStateForTesting();
    const initialGen = stateAtStart.cacheGeneration;
    const requestAPromise = getApprovedSellerScope();

    // Grab the pending resolve hook
    const heldHook = mockPendingResolve;
    mockPendingResolve = null; // Next query won't be held

    // 3. Admin rejects/mutates seller mid-flight! Invalidation runs.
    invalidateApprovedSellerScope();
    const stateAfterInvalidate = _getCacheStateForTesting();
    assert.strictEqual(stateAfterInvalidate.cacheGeneration, initialGen + 1, "Generation should increment by 1");

    // Prepare fresh query result for any subsequent query
    mockQueryResult = [{ _id: freshSellerId }];

    // 4. Old query A now resolves with STALE seller
    heldHook.resolve([{ _id: staleSellerId }]);

    // 5. Await Request A
    const requestAResult = await requestAPromise;

    // 6. Verify Request A retried and received the FRESH seller ID (not stale!)
    assert.deepStrictEqual(
      requestAResult.$or[2].sellerId.$in,
      [freshSellerId],
      "Request A must receive fresh seller scope after invalidation race"
    );

    // 7. Verify cache was NOT populated with the stale seller ID
    const cacheStateFinal = _getCacheStateForTesting();
    assert.deepStrictEqual(
      cacheStateFinal.cachedApprovedSellerIds,
      [freshSellerId],
      "Cache must store the fresh seller ID, never the stale seller ID"
    );
    console.log("✔ PASS: Stale in-flight result was rejected and fresh generation scope was cached");

    // -------------------------------------------------------------
    // TEST 9: TTL EXPIRY (Cache entry expires after TTL_MS)
    // -------------------------------------------------------------
    console.log("\n[TEST 9] TTL Expiration -> Cache Miss after 10s");
    resetMock();
    const originalDateNow = Date.now;
    let fakeTime = 1000000;
    Date.now = () => fakeTime;

    try {
      mockQueryResult = [{ _id: sellerId1 }];
      await getApprovedSellerScope();
      assert.strictEqual(findCallCount, 1, "Initial call queries DB");

      // Advance time by 5 seconds (within 10s TTL)
      fakeTime += 5000;
      await getApprovedSellerScope();
      assert.strictEqual(findCallCount, 1, "Call at +5s should hit cache");

      // Advance time by 6 more seconds (+11s total, beyond 10s TTL)
      fakeTime += 6000;
      mockQueryResult = [{ _id: sellerId2 }];
      const scopeExpired = await getApprovedSellerScope();
      assert.strictEqual(findCallCount, 2, "Call at +11s should trigger fresh DB query");
      assert.deepStrictEqual(scopeExpired.$or[2].sellerId.$in, [sellerId2]);
      console.log("✔ PASS: Expired cache correctly triggered fresh DB query");
    } finally {
      Date.now = originalDateNow;
    }

    console.log("\n=======================================================");
    console.log("ALL 9 AUTOMATED TESTS PASSED SUCCESSFULLY (0 FAILURES)");
    console.log("=======================================================");
  } finally {
    // Restore original unmocked Seller.find
    Seller.find = originalFind;
  }
}

runTests().catch((err) => {
  console.error("❌ TEST SUITE FAILED:", err);
  process.exit(1);
});
