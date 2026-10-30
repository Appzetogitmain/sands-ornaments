import test from "node:test";
import assert from "node:assert/strict";
import { createScannerSessionManager, getScanBox, getCameraErrorMessage } from "../src/modules/seller/utils/scannerSession.js";

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const tick = () => new Promise((resolve) => setImmediate(resolve));

function fixture(overrides = {}) {
  const calls = [];
  const scanner = {
    isScanning: false,
    async start(camera, config, decode) {
      calls.push(["start", camera, config]);
      scanner.decode = decode;
      scanner.isScanning = true;
    },
    async stop() { calls.push(["stop"]); scanner.isScanning = false; },
    clear() { calls.push(["clear"]); },
    ...overrides,
  };
  return {
    scanner, calls,
    options: {
      createScanner: () => scanner,
      getCameras: async () => [{ id: "front", label: "Front" }, { id: "rear", label: "Back Camera" }],
      onReady: () => calls.push(["ready"]),
      onDecode: (text) => calls.push(["decode", text]),
      onError: (error) => calls.push(["error", error]),
    },
  };
}

test("starts the rear camera without a forced aspect ratio and stops on disposal", async () => {
  const f = fixture();
  const dispose = createScannerSessionManager()(f.options);
  await tick();
  assert.deepEqual(f.calls[0][1], { facingMode: "environment" });
  assert.equal(f.calls[0][2].aspectRatio, undefined);
  assert.equal(f.calls[0][2].fps, 20);
  f.scanner.decode("SERIAL-123");
  await dispose();
  f.scanner.decode("ignored after unmount");
  assert.deepEqual(f.calls.map(([name]) => name), ["start", "ready", "decode", "stop", "clear"]);
});

test("StrictMode cleanup before initialization does not request a camera", async () => {
  const open = createScannerSessionManager();
  const first = fixture();
  const second = fixture();
  const disposeFirst = open(first.options);
  const firstFinished = disposeFirst();
  const disposeSecond = open(second.options);
  await firstFinished;
  await tick();
  assert.deepEqual(first.calls, []);
  assert.equal(second.calls[0][0], "start");
  await disposeSecond();
});

test("a remount waits for pending startup AND asynchronous stop", async () => {
  const open = createScannerSessionManager();
  const startup = deferred();
  const stopping = deferred();
  const first = fixture();
  first.scanner.start = async () => { await startup.promise; first.scanner.isScanning = true; };
  first.scanner.stop = async () => { first.calls.push(["stop"]); await stopping.promise; first.scanner.isScanning = false; };
  const disposeFirst = open(first.options);
  await tick();
  const firstFinished = disposeFirst();
  const second = fixture();
  const disposeSecond = open(second.options);
  await tick();
  assert.deepEqual(second.calls, []);
  startup.resolve();
  await tick();
  assert.deepEqual(second.calls, []);
  stopping.resolve();
  await firstFinished;
  await tick();
  assert.equal(first.calls.some(([name]) => name === "ready"), false);
  assert.equal(second.calls[0][0], "start");
  await disposeSecond();
});

test("falls back to a named rear camera when facingMode fails", async () => {
  const f = fixture();
  const start = f.scanner.start;
  f.scanner.start = async (...args) => {
    if (typeof args[0] === "object") throw new Error("OverconstrainedError");
    await start(...args);
  };
  const dispose = createScannerSessionManager()(f.options);
  await tick();
  assert.equal(f.calls[0][1], "rear");
  await dispose();
});

test("fallback startup finishing after unmount is stopped without updating UI", async () => {
  const pending = deferred();
  const f = fixture();
  f.scanner.start = async (camera) => {
    if (typeof camera === "object") throw new Error("OverconstrainedError");
    await pending.promise;
    f.scanner.isScanning = true;
  };
  const dispose = createScannerSessionManager()(f.options);
  await tick();
  const finished = dispose();
  pending.resolve();
  await finished;
  assert.deepEqual(f.calls.map(([name]) => name), ["stop", "clear"]);
});

test("does not start fallback after unmount during camera enumeration", async () => {
  const cameras = deferred();
  const f = fixture({ start: async () => { throw new Error("OverconstrainedError"); } });
  f.options.getCameras = () => cameras.promise;
  const dispose = createScannerSessionManager()(f.options);
  await tick();
  const finished = dispose();
  cameras.resolve([{ id: "rear", label: "Back" }]);
  await finished;
  assert.deepEqual(f.calls, [["clear"]]);
});

test("permission denial produces an error without another permission request", async () => {
  const error = new Error("NotAllowedError: Permission denied");
  const f = fixture({ start: async () => { throw error; } });
  f.options.getCameras = () => assert.fail("must not enumerate cameras after denial");
  const dispose = createScannerSessionManager()(f.options);
  await tick();
  assert.deepEqual(f.calls, [["error", error], ["clear"]]);
  await dispose();
});

test("failed startup does not block a retry", async () => {
  const open = createScannerSessionManager();
  const first = fixture({ start: async () => { throw new Error("NotAllowedError"); } });
  const disposeFirst = open(first.options);
  await tick();
  const second = fixture();
  const disposeSecond = open(second.options);
  await tick();
  assert.equal(second.calls[0][0], "start");
  await disposeFirst();
  await disposeSecond();
});

test("scan box stays inside portrait, landscape and narrow camera views", () => {
  for (const [width, height] of [[390, 520], [844, 390], [240, 180], [320, 160], [1024, 768]]) {
    const box = getScanBox(width, height);
    assert.ok(box.width > 0 && box.width < width);
    assert.ok(box.height > 0 && box.height < height);
  }
});

test("camera errors give actionable permission, missing-camera and busy messages", () => {
  assert.match(getCameraErrorMessage("NotAllowedError"), /permission was denied/);
  assert.match(getCameraErrorMessage({ name: "NotFoundError" }), /No camera/);
  assert.match(getCameraErrorMessage(new Error("NotReadableError")), /camera is busy/);
});

test("iOS requests preferred capture resolution and preserves an explicitly selected lens", async () => {
  const f = fixture();
  const dispose = createScannerSessionManager()({ ...f.options, highResolution: true, cameraId: "rear-wide" });
  await tick();
  assert.equal(f.calls[0][1], "rear-wide");
  assert.equal(f.calls[0][2].fps, 5);
  assert.deepEqual(f.calls[0][2].videoConstraints, {
    deviceId: { exact: "rear-wide" }, width: { ideal: 1920 }, height: { ideal: 1080 },
  });
  await dispose();
});

test("additional decoder is stopped before releasing the camera", async () => {
  const f = fixture();
  f.options.onReady = (scanner, decode) => {
    decode("SERIAL-123");
    return () => f.calls.push(["stop-decoder"]);
  };
  const dispose = createScannerSessionManager()(f.options);
  await tick();
  await dispose();
  assert.deepEqual(f.calls.map(([name]) => name), ["start", "decode", "stop-decoder", "stop", "clear"]);
});
