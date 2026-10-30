# Seller scanner device checks

Run `npm run test:scanner`, `npm run build`, and
`npx eslint src/modules/seller/pages/QrScannerPage.jsx src/modules/seller/utils/scannerSession.js src/modules/seller/utils/fullResolutionDecoder.js`.

Run `node tests/benchmark-scanner.mjs` to measure decoding of generated 1080p
CODE_128 frames in both orientations. This measures local processing time,
not iPhone autofocus, network latency, or complete time to scan a product.

Camera hardware checks require the deployed HTTPS site. An HTTP LAN address
from the Vite development server cannot provide camera access on an iPhone.
The automated tests decode generated CODE_128 image pixels and mock the camera
lifecycle; they do not validate autofocus or Safari video capture on a physical device.

Repeat these checks in iPhone Safari and Android Chrome:

- Open the seller scanner, allow camera permission, and verify rear-camera video
  and a scan frame appear. Scan a real product CODE_128 barcode and a supported
  QR code containing a product serial. Verify the correct product and price.
- On iPhone, compare time to first detection with a sharp CODE_128 barcode
  crossing the image center, in both orientations. Also scan an off-center label
  and a QR code to check the full-frame fallback. The faster center pass must
  not reduce supported formats or produce duplicate preview requests.
- Keep the barcode in view. Verify only one preview request and one success
  notification occur. Show another barcode while the result is open: the
  displayed product must stay unchanged.
- Cancel and scan again, including the same barcode. Confirm an available unit
  with cash and verify it appears once in direct-sales records. Rapidly tap
  Confirm: there must be only one confirmation request. Unavailable units must
  keep confirmation disabled.
- Scan an unknown serial or disconnect the network. Verify the error is shown,
  repeated requests stop, and Scan Again allows recovery.
- Deny camera permission. Verify the explanation and Retry Camera button.
  Allow permission in browser settings and retry successfully.
- Navigate away immediately after opening, including while the permission
  prompt is pending. Return and verify the scanner starts. Close it and verify
  the browser's camera-use indicator turns off.
- Test narrow portrait and landscape views. Verify the barcode under the
  library's scan frame is decoded and the preview is not stretched or cropped.
- On iPhone, test a long serial barcode with the entire code visible and sharply
  focused. The additional decoder reads sensor pixels rather than the small
  displayed scan box. If the default lens is blurry, use the Camera dropdown
  to select another rear lens. Verify switching releases the previous camera
  and scanning still works. Scan a second item after Cancel / Scan Again.
- Rotate a CODE_128 label 90 degrees and verify the iPhone decoder can still
  read it. If detection fails, expand Scanner details and record the status,
  frame count, image dimensions, and any error text. Increasing frame counts
  with "No barcode found" mean image extraction is working; zero frames or a
  decoder error identify a camera-to-decoder failure. No barcode values or
  images are sent anywhere by this diagnostic panel.
- On a device reporting torch support, toggle flash both ways. On other devices,
  verify flash is disabled and scanning still works.

Also repeat opening/closing in local React StrictMode development over HTTPS
to exercise the additional setup/cleanup cycle.
