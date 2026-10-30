import { performance } from "node:perf_hooks";
import { createRequire } from "node:module";
import { decodeFramePixels } from "../src/modules/seller/utils/fullResolutionDecoder.js";

const require = createRequire(import.meta.url);
const JsBarcode = require("jsbarcode");
const code = "SANDS-TEST-123456";
const barcode = {};
JsBarcode(barcode, code, { format: "CODE128", displayValue: false });
const modules = barcode.encodings.map((encoding) => encoding.data).join("");

for (const sideways of [false, true]) {
  const width = 1920;
  const height = 1080;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  const codeWidth = modules.length * 2;
  const codeHeight = 120;
  for (let y = 0; y < codeHeight; y++) {
    for (let x = 0; x < codeWidth; x++) {
      if (modules[Math.floor(x / 2)] !== "1") continue;
      const targetX = sideways ? (width - codeHeight) / 2 + y : (width - codeWidth) / 2 + x;
      const targetY = sideways ? (height - codeWidth) / 2 + x : (height - codeHeight) / 2 + y;
      const offset = (targetY * width + targetX) * 4;
      data[offset] = data[offset + 1] = data[offset + 2] = 0;
    }
  }
  const times = [];
  for (let sample = 0; sample < 4; sample++) {
    const start = performance.now();
    const decoded = decodeFramePixels({ data, width, height });
    if (decoded !== code) throw new Error("Incorrect benchmark decode");
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  console.log(JSON.stringify({ orientation: sideways ? "sideways" : "horizontal", medianMs: Math.round((times[1] + times[2]) / 2), samplesMs: times.map(Math.round) }));
}
