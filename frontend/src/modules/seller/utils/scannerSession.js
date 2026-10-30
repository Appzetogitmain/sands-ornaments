export const getScanBox = (width, height) => ({
  width: Math.floor(Math.min(320, width * 0.85)),
  height: Math.floor(Math.min(200, height * 0.7, width * 0.55)),
});

export const getCameraErrorMessage = (error) => {
  const message = `${error?.name || ""} ${error?.message || error || ""}`;
  if (/NotAllowed|Permission|denied/i.test(message)) {
    return "Camera permission was denied. Allow camera access in your browser settings, then retry.";
  }
  if (/NotFound|DevicesNotFound|no camera/i.test(message)) {
    return "No camera was found on this device.";
  }
  if (/NotReadable|TrackStart|in use/i.test(message)) {
    return "The camera is busy. Close other apps using it, then retry.";
  }
  return "Could not start the camera. Check camera access and try again.";
};

// A new mount must wait for the previous camera to finish starting and stop.
// This also serializes React StrictMode's setup/cleanup/setup cycle.
export function createScannerSessionManager() {
  let previousSession = Promise.resolve();

  return function openScannerSession({ createScanner, getCameras, onDecode, onReady, onError }) {
    let disposed = false;
    let release;
    const released = new Promise((resolve) => { release = resolve; });

    const finished = previousSession.then(async () => {
      if (disposed) return;
      let scanner;
      try {
        scanner = createScanner();
        const config = { fps: 20, qrbox: getScanBox };
        const decode = (text) => { if (!disposed) onDecode(text); };
        try {
          // Keep the camera's native aspect ratio. The library supplies muted
          // inline video playback, as required by Safari on iOS.
          await scanner.start({ facingMode: "environment" }, config, decode, () => {});
        } catch (error) {
          if (disposed) return;
          if (/NotAllowed|Permission|denied/i.test(`${error?.name} ${error?.message || error}`)) {
            throw error;
          }
          const cameras = await getCameras();
          if (disposed) return;
          const camera = cameras.find(({ label }) => /back|rear|environment/i.test(label || ""))
            || cameras[cameras.length - 1];
          if (!camera) throw error;
          await scanner.start(camera.id, config, decode, () => {});
        }
        if (!disposed) {
          onReady(scanner);
          await released;
        }
      } catch (error) {
        if (!disposed) onError(error);
      } finally {
        if (scanner) {
          try {
            if (scanner.isScanning) await scanner.stop();
            scanner.clear();
          } catch (error) {
            console.error("Scanner cleanup failed", error);
          }
        }
      }
    });
    previousSession = finished;

    return () => {
      disposed = true;
      release();
      return finished;
    };
  };
}

export const openScannerSession = createScannerSessionManager();
