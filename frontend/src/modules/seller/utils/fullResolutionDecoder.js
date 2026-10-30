// Reuse the ZXing distribution already shipped by html5-qrcode rather than
// downloading another decoder or WASM file at runtime.
import ZXing from "html5-qrcode/third_party/zxing-js.umd.js";

export const isIOSDevice = (navigatorInfo) =>
  /iPad|iPhone|iPod/.test(navigatorInfo.userAgent || "")
  || (navigatorInfo.platform === "MacIntel" && navigatorInfo.maxTouchPoints > 1);

export function decodeLuminance(source) {
  const hints = new Map([
    [ZXing.DecodeHintType.POSSIBLE_FORMATS, [
      ZXing.BarcodeFormat.QR_CODE,
      ZXing.BarcodeFormat.CODE_128,
      ZXing.BarcodeFormat.EAN_13,
      ZXing.BarcodeFormat.EAN_8,
      ZXing.BarcodeFormat.UPC_A,
      ZXing.BarcodeFormat.UPC_E,
      ZXing.BarcodeFormat.CODE_39,
    ]],
    [ZXing.DecodeHintType.TRY_HARDER, true],
  ]);
  const bitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(source));
  return new ZXing.MultiFormatReader(false, hints).decode(bitmap).text;
}

const isDecodeMiss = (error) => error instanceof ZXing.NotFoundException
  || error instanceof ZXing.ChecksumException || error instanceof ZXing.FormatException;

export function decodeFramePixels({ data, width, height }) {
  const pixels = new Uint8ClampedArray(width * height);
  for (let i = 0; i < pixels.length; i++) {
    const offset = i * 4;
    pixels[i] = data[offset + 3] === 0 ? 255
      : (306 * data[offset] + 601 * data[offset + 1] + 117 * data[offset + 2] + 512) >> 10;
  }
  try {
    return decodeLuminance(new ZXing.RGBLuminanceSource(pixels, width, height));
  } catch (error) {
    if (!isDecodeMiss(error)) throw error;
  }
  // The bundled HTMLCanvasElementLuminanceSource keeps its original dimensions
  // after rotation. Rotate the pixels explicitly, including width/height, so
  // portrait and sideways barcodes use the same tested luminance path.
  const rotated = new Uint8ClampedArray(pixels.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      rotated[(width - 1 - x) * height + y] = pixels[y * width + x];
    }
  }
  return decodeLuminance(new ZXing.RGBLuminanceSource(rotated, height, width));
}

export function startFullResolutionDecoder({ video, onDecode, shouldDecode, onStatus = () => {}, interval = 700 }) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  let stopped = false;
  let timeout;
  let frames = 0;

  const scan = () => {
    if (stopped) return;
    if (context && shouldDecode() && video.readyState >= 2 && video.videoWidth && video.videoHeight) {
      // Preserve sensor pixels instead of shrinking the barcode to a CSS-sized
      // scan box. Include the whole image so longer serial barcodes fit.
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      try {
        context.drawImage(video, 0, 0);
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        frames++;
        const text = decodeFramePixels(image);
        onStatus({ state: "decoded", frames, width: canvas.width, height: canvas.height });
        if (!stopped) onDecode(text);
      } catch (error) {
        // Report unexpected extraction/decoder failures instead of silently
        // treating every exception as an ordinary frame without a barcode.
        onStatus({
          state: isDecodeMiss(error) ? "No barcode found" : "Decoder error",
          frames, width: canvas.width, height: canvas.height,
          error: isDecodeMiss(error) ? "" : `${error?.name || "Error"}: ${error?.message || error}`,
        });
      }
    } else if (!context || !video.videoWidth || video.readyState < 2) {
      onStatus({ state: context ? "Waiting for camera frames" : "Canvas unavailable", frames,
        width: video.videoWidth, height: video.videoHeight, readyState: video.readyState });
    }
    if (!stopped) timeout = setTimeout(scan, interval);
  };
  timeout = setTimeout(scan, interval);
  return () => {
    stopped = true;
    clearTimeout(timeout);
    canvas.width = 0;
    canvas.height = 0;
  };
}
