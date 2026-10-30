# Seller scanner device checks

Run `npm run test:scanner`, `npm run build`, and
`npx eslint src/modules/seller/pages/QrScannerPage.jsx src/modules/seller/utils/scannerSession.js`.

Camera hardware checks require the deployed HTTPS site. An HTTP LAN address
from the Vite development server cannot provide camera access on an iPhone.
The automated tests mock the camera; they do not validate autofocus or Safari
video capture on a physical device.

Repeat these checks in iPhone Safari and Android Chrome:

- Open the seller scanner, allow camera permission, and verify rear-camera video
  and a scan frame appear. Scan a real product CODE_128 barcode and a supported
  QR code containing a product serial. Verify the correct product and price.
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
- On a device reporting torch support, toggle flash both ways. On other devices,
  verify flash is disabled and scanning still works.

Also repeat opening/closing in local React StrictMode development over HTTPS
to exercise the additional setup/cleanup cycle.
