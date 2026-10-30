import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  ArrowLeft,
  CheckCircle2 as SuccessIcon,
  Zap,
  ZapOff,
  Loader2,
} from "lucide-react";
import { sellerDirectSaleService } from "../services/sellerDirectSaleService";
import toast from "react-hot-toast";
import { getCameraErrorMessage, openScannerSession } from "../utils/scannerSession";

const playSuccessEffects = () => {
  try {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3");
    audio.play().catch(() => {});
    window.navigator?.vibrate?.(200);
  } catch {
    // Sound and vibration are optional on iOS and other browsers.
  }
};

const QrScannerPage = () => {
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const scannerRef = useRef(null);

  const scanLockedRef = useRef(false);
  const confirmingRef = useRef(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [flashSupported, setFlashSupported] = useState(false);

  const resetScan = () => {
    setScannedProduct(null);
    setScanResult(null);
    setScanError(null);
    scanLockedRef.current = false;
  };

  useEffect(() => {
    let active = true;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(window.isSecureContext
        ? "Camera access is unavailable in this browser. Open this page in Safari or Chrome."
        : "Camera access requires HTTPS. Open the secure website to scan.");
      return;
    }

    const dispose = openScannerSession({
      createScanner: () => new Html5Qrcode("reader", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_39,
        ],
        verbose: false,
      }),
      getCameras: () => Html5Qrcode.getCameras(),
      onReady: (scanner) => {
        scannerRef.current = scanner;
        setScannerReady(true);
        try {
          setFlashSupported(scanner.getRunningTrackCapabilities().torch === true);
        } catch {
          setFlashSupported(false);
        }
      },
      onError: (error) => {
        console.error("Scanner start error:", error);
        setCameraError(getCameraErrorMessage(error));
      },
      onDecode: async (decodedText) => {
        const code = String(decodedText || "").trim();
        // Acquire synchronously: React state updates cannot guard callbacks
        // from subsequent frames or a second barcode while preview is open.
        if (!code || scanLockedRef.current) return;
        scanLockedRef.current = true;
        setScanResult(code);
        setLoading(true);
        playSuccessEffects();
        try {
          const response = await sellerDirectSaleService.preview({ serialCode: code });
          if (!active) return;
          if (!response?.success) throw new Error(response?.message || "Failed to preview");
          const data = response.data || response;
          setScannedProduct({
            name: data.product?.name,
            stock: data.variant?.stock,
            price: data.variant?.price,
            serialCode: data.serialCode,
            available: data.available,
            status: data.status,
          });
          toast.success(data.available ? "Identity Verified: Unit Available" : "Unit Not Available");
        } catch (error) {
          if (!active) return;
          const message = error.response?.data?.message || error.message || "Failed to preview";
          setScanError(message);
          toast.error(message);
        } finally {
          if (active) setLoading(false);
        }
      },
    });

    return () => {
      active = false;
      scannerRef.current = null;
      void dispose();
    };
  }, [cameraAttempt]);

  const confirmDirectSale = async () => {
    if (!scannedProduct?.serialCode || scannedProduct.available === false || confirmingRef.current) return;
    confirmingRef.current = true;
    setConfirming(true);
    try {
      const res = await sellerDirectSaleService.confirm({
        serialCode: scannedProduct.serialCode,
        paymentMethod: "cash",
      });
      if (!res?.success)
        throw new Error(res?.message || "Failed to record sale");
      toast.success("Direct sale recorded");
      resetScan();
    } catch (err) {
      toast.error(err?.message || "Failed to record sale");
    } finally {
      confirmingRef.current = false;
      setConfirming(false);
    }
  };

  const toggleFlash = async () => {
    if (!scannerRef.current || !scannerRef.current.isScanning) return;
    try {
      const newState = !isFlashOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: newState }],
      });
      setIsFlashOn(newState);
    } catch {
      toast.error("Flash not supported on this device");
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0c0c0c] z-[9999] flex flex-col font-sans overflow-hidden">
      {/* Dark Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={() => navigate(-1)}
          className="p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white hover:bg-white/20 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">
            Direct Terminal
          </span>
          <h1 className="text-white text-xs font-black uppercase tracking-widest mt-1">
            Sands Jewels HQ
          </h1>
        </div>
        <button
          onClick={toggleFlash}
          disabled={!scannerReady || !flashSupported}
          aria-label={isFlashOn ? "Turn flash off" : "Turn flash on"}
          className={`p-3 backdrop-blur-xl border rounded-2xl transition-all disabled:opacity-40 ${isFlashOn ? "bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/40" : "bg-white/10 border-white/20 text-white"}`}
        >
          {isFlashOn ? <Zap size={20} /> : <ZapOff size={20} />}
        </button>
      </div>

      {/* Let the library align its viewfinder with the native video dimensions. */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center overflow-auto">
        <div id="reader" className="w-full" />
        {!scannedProduct && !cameraError && !scanError && (
          <div className="absolute bottom-8 inset-x-4 pointer-events-none text-center">
            {!scannerReady && <Loader2 className="mx-auto mb-4 w-8 h-8 text-amber-500 animate-spin" />}
            <p className="text-white text-xs font-bold">
              {scannerReady ? "Position the barcode or QR code within the camera frame" : "Starting camera..."}
            </p>
          </div>
        )}
        {(cameraError || scanError) && (
          <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/80 px-8 text-center text-white">
            <p>{cameraError || scanError}</p>
            <button
              className="rounded-xl bg-amber-500 px-6 py-3 font-bold text-black"
              onClick={() => {
                resetScan();
                if (cameraError) {
                  setCameraError(null);
                  setScannerReady(false);
                  setFlashSupported(false);
                  setIsFlashOn(false);
                  setCameraAttempt((attempt) => attempt + 1);
                }
              }}
            >
              {cameraError ? "Retry Camera" : "Scan Again"}
            </button>
          </div>
        )}
      </div>

      {/* Bottom Status / Result Overlay */}
      {scannedProduct && (
        <div className="absolute bottom-10 left-6 right-6 p-1 bg-white/5 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
          <div className="bg-white rounded-[2.3rem] p-8 flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 shadow-inner">
              <SuccessIcon className="text-emerald-500 w-10 h-10" />
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                {scannedProduct.name}
              </h2>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Inventory:
                </span>
                <span
                  className={`text-xs font-black uppercase ${scannedProduct.stock > 10 ? "text-emerald-600" : "text-amber-500"}`}
                >
                  {scannedProduct.stock} Units Remaining
                </span>
              </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                  Pricing Module
                </p>
                <p className="text-lg font-black text-[#3E2723]">
                  ₹{scannedProduct.price || 0}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                  Assigned ID
                </p>
                <p className="text-lg font-mono font-black text-[#8D6E63]">
                  {scanResult}
                </p>
              </div>
            </div>

            <button
              onClick={confirmDirectSale}
              disabled={confirming || scannedProduct.available === false}
              className="w-full py-5 bg-[#3E2723] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-[#3E2723]/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirming
                ? "Recording..."
                : scannedProduct.available === false
                  ? "Not Available"
                  : "Confirm Direct Sale"}
            </button>

            <button
              onClick={resetScan}
              disabled={confirming}
              className="w-full py-4 bg-gray-50 text-gray-700 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] border border-gray-200 active:scale-95 transition-all"
            >
              Cancel / Scan Again
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
          <p className="text-white text-[10px] font-black uppercase tracking-[0.3em]">
            Decrypting Identity...
          </p>
        </div>
      )}

      <style>{`
        #reader { width: 100%; border: none; }
        #reader video { width: 100% !important; height: auto !important; }
      `}</style>
    </div>
  );
};

export default QrScannerPage;
