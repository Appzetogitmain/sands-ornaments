import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { decodeCenterStrip, decodeFramePixels, decodeLuminance, isIOSDevice, startFullResolutionDecoder } from "../src/modules/seller/utils/fullResolutionDecoder.js";

const require = createRequire(import.meta.url);
const JsBarcode = require("jsbarcode");
const ZXing = require("html5-qrcode/third_party/zxing-js.umd.js");

function barcodeFrame(sideways = false, { code = "SANDS-TEST-123456", format = "CODE128" } = {}) {
  const barcode = {};
  JsBarcode(barcode, code, { format, displayValue: false });
  const modules = barcode.encodings.map((encoding) => encoding.data).join("");
  const originalWidth = modules.length * 2 + 60;
  const originalHeight = 180;
  const width = sideways ? originalHeight : originalWidth;
  const height = sideways ? originalWidth : originalHeight;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 30; y < 150; y++) {
    for (let x = 0; x < modules.length * 2; x++) {
      if (modules[Math.floor(x / 2)] !== "1") continue;
      const originalX = x + 30;
      const offset = sideways
        ? (originalX * width + (originalHeight - 1 - y)) * 4
        : (y * width + originalX) * 4;
      data[offset] = data[offset + 1] = data[offset + 2] = 0;
    }
  }
  return { data, width, height };
}

test("RGBA camera frames decode in both portrait and sideways orientations", () => {
  assert.equal(decodeFramePixels(barcodeFrame()), "SANDS-TEST-123456");
  assert.equal(decodeFramePixels(barcodeFrame(true)), "SANDS-TEST-123456");
});

test("centered product barcodes decode through the fast pass in both directions", () => {
  assert.equal(decodeCenterStrip(barcodeFrame(), false), "SANDS-TEST-123456");
  assert.equal(decodeCenterStrip(barcodeFrame(true), true), "SANDS-TEST-123456");
});

test("the full-frame fallback still reads barcodes outside the center strips", () => {
  const image = barcodeFrame();
  const height = 700;
  const data = new Uint8ClampedArray(image.width * height * 4).fill(255);
  data.set(image.data, image.width * 20 * 4);
  const frame = { data, width: image.width, height };
  assert.throws(() => decodeCenterStrip(frame, false));
  assert.throws(() => decodeCenterStrip(frame, true));
  assert.equal(decodeFramePixels(frame), "SANDS-TEST-123456");
});

test("the full-frame fallback preserves EAN_13 and QR support", () => {
  assert.equal(decodeFramePixels(barcodeFrame(false, { code: "5901234123457", format: "EAN13" })), "5901234123457");
  const matrix = new ZXing.QRCodeWriter().encode("SANDS-QR-123", ZXing.BarcodeFormat.QR_CODE, 240, 240, new Map());
  const width = matrix.getWidth();
  const height = matrix.getHeight();
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (matrix.get(x, y)) {
        const offset = (y * width + x) * 4;
        data[offset] = data[offset + 1] = data[offset + 2] = 0;
      }
    }
  }
  assert.equal(decodeFramePixels({ data, width, height }), "SANDS-QR-123");
});

test("video frame extraction and decoding report success through the complete adapter", (t) => {
  const originalDocument = globalThis.document;
  t.after(() => { if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument; });
  const image = barcodeFrame(true);
  const canvas = { getContext: () => ({ drawImage() {}, getImageData: () => image }) };
  globalThis.document = { createElement: () => canvas };
  let scheduled;
  const delays = [];
  t.mock.method(globalThis, "setTimeout", (callback, delay) => { scheduled = callback; delays.push(delay); return 1; });
  t.mock.method(globalThis, "clearTimeout", () => {});
  const decoded = [];
  const statuses = [];
  const stop = startFullResolutionDecoder({
    video: { readyState: 4, videoWidth: image.width, videoHeight: image.height },
    shouldDecode: () => true, onDecode: (text) => decoded.push(text), onStatus: (status) => statuses.push(status),
  });
  scheduled();
  assert.deepEqual(decoded, ["SANDS-TEST-123456"]);
  assert.equal(statuses[0].state, "decoded");
  assert.equal(statuses[0].frames, 1);
  assert.deepEqual(delays, [0, 250]);
  stop();
});

test("frame extraction errors are reported rather than treated as unreadable barcodes", (t) => {
  const originalDocument = globalThis.document;
  t.after(() => { if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument; });
  globalThis.document = { createElement: () => ({ getContext: () => ({ drawImage() { throw new TypeError("Frame unavailable"); } }) }) };
  let scheduled;
  t.mock.method(globalThis, "setTimeout", (callback) => { scheduled = callback; return 1; });
  t.mock.method(globalThis, "clearTimeout", () => {});
  const statuses = [];
  const stop = startFullResolutionDecoder({
    video: { readyState: 4, videoWidth: 1920, videoHeight: 1080 },
    shouldDecode: () => true, onDecode: () => assert.fail("must not decode"), onStatus: (status) => statuses.push(status),
  });
  scheduled();
  assert.equal(statuses[0].state, "Decoder error");
  assert.match(statuses[0].error, /Frame unavailable/);
  stop();
});

test("shrinking a dense CODE_128 frame to 320 pixels loses decodable bar detail", () => {
  const serial = "SANDS-ABCDEFGHIJKLMNOPQRSTUVWXYZ-0123456789";
  const barcode = {};
  JsBarcode(barcode, serial, { format: "CODE128", displayValue: false });
  const modules = barcode.encodings.map((encoding) => encoding.data).join("");
  const width = modules.length * 2 + 60;
  const height = 180;
  const pixels = new Uint8ClampedArray(width * height).fill(255);
  for (let y = 20; y < 160; y++) {
    for (let x = 0; x < modules.length * 2; x++) {
      if (modules[Math.floor(x / 2)] === "1") pixels[y * width + x + 30] = 0;
    }
  }
  assert.equal(decodeLuminance(new ZXing.RGBLuminanceSource(pixels, width, height)), serial);
  const small = new Uint8ClampedArray(320 * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < 320; x++) {
      small[y * 320 + x] = pixels[y * width + Math.floor((x + 0.5) * width / 320)];
    }
  }
  assert.throws(() => decodeLuminance(new ZXing.RGBLuminanceSource(small, 320, height)));
});

test("the full-resolution decoder reads actual product CODE_128 pixels", () => {
  for (const serial of ["SANDS-20261030-000123", "SN012345678901234567890123456789"]) {
    const barcode = {};
    JsBarcode(barcode, serial, { format: "CODE128", displayValue: false });
    const modules = barcode.encodings.map((encoding) => encoding.data).join("");
    const quietZone = 30;
    const width = modules.length * 2 + quietZone * 2;
    const height = 180;
    const pixels = new Uint8ClampedArray(width * height).fill(255);
    for (let y = 30; y < 150; y++) {
      for (let x = 0; x < modules.length * 2; x++) {
        if (modules[Math.floor(x / 2)] === "1") pixels[y * width + x + quietZone] = 0;
      }
    }
    const source = new ZXing.RGBLuminanceSource(pixels, width, height);
    assert.equal(decodeLuminance(source), serial);
    assert.ok(width > 320, "fixture contains more barcode detail than the old CSS-width scan box");
  }
});

test("a frame without a barcode is rejected", () => {
  const source = new ZXing.RGBLuminanceSource(new Uint8ClampedArray(200 * 100).fill(255), 200, 100);
  assert.throws(() => decodeLuminance(source));
});

test("the extra decoding pass is selected for iPhone and desktop-mode iPad only", () => {
  assert.equal(isIOSDevice({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" }), true);
  assert.equal(isIOSDevice({ userAgent: "Safari", platform: "MacIntel", maxTouchPoints: 5 }), true);
  assert.equal(isIOSDevice({ userAgent: "Android Chrome", platform: "Linux", maxTouchPoints: 5 }), false);
  assert.equal(isIOSDevice({ userAgent: "Safari", platform: "MacIntel", maxTouchPoints: 0 }), false);
});

test("video decoding preserves sensor dimensions, respects scan locks, and stops on cleanup", (t) => {
  const oldDocument = globalThis.document;
  t.after(() => { if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument; });
  const draws = [];
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: (...args) => draws.push(args) }) };
  globalThis.document = { createElement: () => canvas };
  let scheduled;
  t.mock.method(globalThis, "setTimeout", (callback) => { scheduled = callback; return 123; });
  const cleared = t.mock.method(globalThis, "clearTimeout", () => {});
  let allowed = true;
  const video = { readyState: 4, videoWidth: 1920, videoHeight: 1080 };
  const stop = startFullResolutionDecoder({ video, shouldDecode: () => allowed, onDecode: () => assert.fail("mock frame cannot decode") });
  scheduled();
  assert.equal(canvas.width, 1920);
  assert.equal(canvas.height, 1080);
  assert.deepEqual(draws, [[video, 0, 0]]);
  allowed = false;
  scheduled();
  assert.equal(draws.length, 1);
  stop();
  scheduled();
  assert.equal(draws.length, 1);
  assert.equal(cleared.mock.callCount(), 1);
});
