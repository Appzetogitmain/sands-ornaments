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

export function startFullResolutionDecoder({ video, onDecode, shouldDecode, interval = 700 }) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  let stopped = false;
  let timeout;

  const scan = () => {
    if (stopped) return;
    if (context && shouldDecode() && video.readyState >= 2 && video.videoWidth && video.videoHeight) {
      // Preserve sensor pixels instead of shrinking the barcode to a CSS-sized
      // scan box. Include the whole image so longer serial barcodes fit.
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      try {
        context.drawImage(video, 0, 0);
        const text = decodeLuminance(new ZXing.HTMLCanvasElementLuminanceSource(canvas));
        if (!stopped) onDecode(text);
      } catch {
        // A frame without a readable barcode is normal; try the next frame.
      }
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
