import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  X,
  QrCode,
  ArrowLeft,
  CheckCircle2 as SuccessIcon,
  Package,
  Zap,
  ZapOff,
  Loader2,
} from "lucide-react";
import { sellerDirectSaleService } from "../services/sellerDirectSaleService";
import toast from "react-hot-toast";

const QrScannerPage = () => {
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    // Pass formats to constructor where html5-qrcode expects them
    const html5QrCode = new Html5Qrcode("reader", {
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
    });
    scannerRef.current = html5QrCode;

    const startScanner = async () => {
      const scanConfig = {
        fps: 20,
        qrbox: { width: 280, height: 180 },
      };

      try {
        // Primary: Start with environment (rear) camera
        // Note: aspectRatio constraint is omitted so WebKit/Safari does not reject
        await html5QrCode.start(
          { facingMode: "environment" },
          scanConfig,
          onScanSuccess,
          () => {} // silent per-frame handler
        );

        if (isMounted) {
          setScannerReady(true);
        } else if (html5QrCode.isScanning) {
          html5QrCode.stop().then(() => html5QrCode.clear()).catch(() => {});
        }
      } catch (primaryErr) {
        if (!isMounted) return;

        // Fallback: Query available cameras directly (helps multi-lens iPhones & iPads)
        try {
          const cameras = await Html5Qrcode.getCameras().catch(() => []);
          if (cameras && cameras.length > 0) {
            const backCamera =
              cameras.find((cam) =>
                /back|rear|environment/i.test(cam.label || "")
              ) || cameras[cameras.length - 1];

            await html5QrCode.start(
              backCamera.id,
              scanConfig,
              onScanSuccess,
              () => {}
            );

            if (isMounted) {
              setScannerReady(true);
              return;
            }
          }
        } catch (_fallbackErr) {
          // Keep primary error log
        }

        console.error("Scanner start error:", primaryErr);
        toast.error("Camera access denied or not found");
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (html5QrCode.isScanning) {
        html5QrCode
          .stop()
          .then(() => {
            html5QrCode.clear();
          })
          .catch((err) => console.error("Scanner stop error", err));
      }
    };
  }, []);

  const onScanSuccess = async (decodedText) => {
    if (loading || scanResult === decodedText) return;

    playSuccessEffects();
    setScanResult(decodedText);
    handleProductScan(decodedText);
  };

  const playSuccessEffects = () => {
    try {
      // Beep
      const audio = new Audio(
        "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
      );
      audio.play().catch(() => {});

      // Vibrate
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(200);
      }
    } catch (_e) {
      // Ignore sound/vibration failures (common on some browsers/devices).
    }
  };

  const handleProductScan = async (code) => {
    setLoading(true);
    try {
      const response = await sellerDirectSaleService.preview({
        serialCode: code,
      });
      if (!response?.success)
        throw new Error(response?.message || "Failed to preview");
      const data = response?.data || response;
      setScannedProduct({
        name: data.product?.name,
        stock: data.variant?.stock,
        price: data.variant?.price,
        serialCode: data.serialCode,
        available: data.available,
        status: data.status,
      });
      toast.success(
        data.available
          ? "Identity Verified: Unit Available"
          : "Unit Not Available",
      );
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Critical: Decrypted data mismatch",
      );
      setScanResult(null); // Reset to allow retry
    } finally {
      setLoading(false);
    }
  };

  const confirmDirectSale = async () => {
    if (!scannedProduct?.serialCode) return;
    setConfirming(true);
    try {
      const res = await sellerDirectSaleService.confirm({
        serialCode: scannedProduct.serialCode,
        paymentMethod: "cash",
      });
      if (!res?.success)
        throw new Error(res?.message || "Failed to record sale");
      toast.success("Direct sale recorded");
      setScannedProduct(null);
      setScanResult(null);
    } catch (err) {
      toast.error(err?.message || "Failed to record sale");
    } finally {
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
    } catch (err) {
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
          className={`p-3 backdrop-blur-xl border rounded-2xl transition-all ${isFlashOn ? "bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/40" : "bg-white/10 border-white/20 text-white"}`}
        >
          {isFlashOn ? <Zap size={20} /> : <ZapOff size={20} />}
        </button>
      </div>

      {/* Viewfinder Container */}
      <div className="flex-grow relative flex items-center justify-center">
        <div id="reader" className="w-full h-full object-cover"></div>

        {/* Custom Overlay */}
        {!scannedProduct && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div className="relative w-72 h-72">
              {/* Scanning Corners */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-500 rounded-tl-2xl"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-500 rounded-tr-2xl"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-500 rounded-bl-2xl"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-500 rounded-br-2xl"></div>

              {/* Scanning Laser Line */}
              <div
                className={`absolute top-0 left-0 right-0 h-0.5 bg-amber-500 shadow-[0_0_15px_#f59e0b] shadow-amber-500 transition-all duration-1000 ease-in-out scanner-laser`}
              ></div>

              {!scannerReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-3xl">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                </div>
              )}
            </div>
            <p className="mt-12 text-white/60 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
              Position identity code within frame
            </p>
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
              onClick={() => {
                setScannedProduct(null);
                setScanResult(null);
              }}
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
                #reader {
                    width: 100% !important;
                    height: 100% !important;
                    border: none !important;
                }
                #reader video {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                }
                .scanner-laser {
                    animation: laser 2s infinite ease-in-out;
                }
                @keyframes laser {
                    0% { top: 0; opacity: 1; }
                    50% { top: 100%; opacity: 0.5; }
                    100% { top: 0; opacity: 1; }
                }
            `}</style>
    </div>
  );
};

export default QrScannerPage;
