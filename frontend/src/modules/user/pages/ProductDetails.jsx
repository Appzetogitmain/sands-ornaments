import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useParams, useNavigate } from "react-router-dom";
import { useShop } from "../../../context/ShopContext";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../services/api";
import toast from "react-hot-toast";
import ProductCard from "../components/ProductCard";
import {
  getProductDetailUrl,
  getProductCardUrl,
  getProductThumbUrl,
} from "../../../utils/imageUtils";
import { useResetScroll } from "../../../hooks/useResetScroll";

import {
  Heart,
  ShoppingBag,
  Star,
  Share2,
  Plus,
  Minus,
  Truck,
  ShieldCheck,
  Smile,
  Gift,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  Camera,
  Check,
  ArrowLeft,
  ArrowRight,
  Droplets,
  Sparkles,
  Play,
  Globe,
  Zap,
  Users,
  Ruler,
  ExternalLink,
  RotateCcw,
  Lock,
  Layers,
  Scale,
  Box,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Loader2,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
// Product video is backend-driven (optional) via `product.videoUrl`.
import { useAnalytics } from "../../../hooks/useAnalytics";
import Loader from "../../shared/components/Loader";
import { getProductPrice, getProductMRP, formatCurrency } from "../utils/price";
import RecentlyViewed from "../components/RecentlyViewed";

// Import model shots (angle 2) for maximum hover impact
import latestRing from "@assets/latest_drop_ring.png";
import latestBracelet from "@assets/latest_drop_bracelet.png";
import latestNecklace from "@assets/latest_drop_necklace.png";
import latestEarrings from "@assets/latest_drop_earrings.png";
import newAnklets from "@assets/new_launch_anklets.png";

const fallbackModelMap = {
  ring: latestRing,
  pendant: latestNecklace,
  earring: latestEarrings,
  bracelet: latestBracelet,
  anklet: newAnklets,
};

const isImageMedia = (src = "") =>
  /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i.test(String(src));

const ImageLightbox = ({
  images,
  currentIndex,
  isOpen,
  onClose,
  onPrev,
  onNext,
}) => {
  const [zoom, setZoom] = useState(1);
  const [dragConstraints, setDragConstraints] = useState({
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);

  // Reset zoom and loading state when image changes
  useEffect(() => {
    setZoom(1);
    setIsLoading(true);
  }, [currentIndex]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.5, 1));
  const handleReset = () => setZoom(1);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl touch-none"
        onClick={onClose}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-[110] p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10 backdrop-blur"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Main Image Container */}
        <div
          ref={containerRef}
          className="relative w-full h-full flex items-center justify-center overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Placeholder (Low-res blurred) */}
          <motion.img
            key={`placeholder-${currentIndex}`}
            src={images[currentIndex]}
            className="absolute inset-0 w-full h-full object-contain blur-2xl opacity-30 scale-110 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
          />

          {/* Loading Spinner */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <Loader2 className="w-10 h-10 text-white/40 animate-spin" />
            </div>
          )}

          {/* High-res Image */}
          <motion.div
            className="w-full h-full flex items-center justify-center"
            style={{ scale: zoom }}
            drag={zoom > 1}
            dragConstraints={containerRef}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{
              scale: zoom,
              opacity: isLoading ? 0 : 1,
              transition: { duration: 0.4, ease: "easeOut" },
            }}
          >
            <img
              src={images[currentIndex]}
              alt="Product view"
              className="max-w-[90%] max-h-[90vh] object-contain select-none shadow-2xl"
              onLoad={() => setIsLoading(false)}
              draggable={false}
            />
          </motion.div>

          {/* Navigation Buttons (Desktop) */}
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
            <button
              onClick={onPrev}
              className="p-4 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all backdrop-blur-md pointer-events-auto border border-white/10 group"
            >
              <ChevronLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => onNext()}
              className="p-4 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all backdrop-blur-md pointer-events-auto border border-white/10 group"
            >
              <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 p-2 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 z-[120]">
            <button
              onClick={handleZoomOut}
              className="p-3 text-white/80 hover:text-white transition-colors hover:bg-white/10 rounded-xl"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <div className="w-[1px] h-4 bg-white/20" />
            <button
              onClick={handleReset}
              className="px-4 py-2 text-xs font-bold text-white/80 hover:text-white transition-colors flex items-center gap-2 hover:bg-white/10 rounded-xl uppercase tracking-widest"
            >
              <RefreshCw className="w-4 h-4" /> {Math.round(zoom * 100)}%
            </button>
            <div className="w-[1px] h-4 bg-white/20" />
            <button
              onClick={handleZoomIn}
              className="p-3 text-white/80 hover:text-white transition-colors hover:bg-white/10 rounded-xl"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Thumbnails Row */}
        <div className="absolute bottom-32 left-0 right-0 flex justify-center gap-3 px-4 z-[120]">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => onNext(idx)}
              className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all shadow-lg ${currentIndex === idx ? "border-[#D39A9F] scale-110 shadow-[#D39A9F]/20" : "border-white/10 opacity-50 hover:opacity-100 hover:border-white/40"}`}
            >
              <img
                src={img}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

const useDragScroll = () => {
  const ref = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const onMouseDown = (e) => {
    if (!ref.current) return;
    // Don't drag if clicking a button or input
    if (
      e.target.tagName === "BUTTON" ||
      e.target.tagName === "INPUT" ||
      e.target.tagName === "SELECT"
    )
      return;

    setIsDragging(true);
    setStartX(e.pageX - ref.current.offsetLeft);
    setStartY(e.pageY - ref.current.offsetTop);
    setScrollLeft(ref.current.scrollLeft);
    setScrollTop(ref.current.scrollTop);
  };

  const onMouseLeave = () => {
    setIsDragging(false);
  };

  const onMouseUp = () => {
    setIsDragging(false);
  };

  const onMouseMove = (e) => {
    if (!isDragging || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    const y = e.pageY - ref.current.offsetTop;
    const walkX = (x - startX) * 1.5; // Scroll speed
    const walkY = (y - startY) * 1.5;
    ref.current.scrollLeft = scrollLeft - walkX;
    ref.current.scrollTop = scrollTop - walkY;
  };

  return {
    ref,
    events: {
      onMouseDown,
      onMouseLeave,
      onMouseUp,
      onMouseMove,
    },
    isDragging,
  };
};

const AccordionItem = ({ title, children, isOpen, onClick }) => (
  <div className="border-b border-[#EBCDD0]/50">
    <button
      className="w-full py-5 flex items-center justify-center md:justify-between text-center md:text-left focus:outline-none group relative"
      onClick={onClick}
    >
      <span
        className={`font-sans text-lg font-semibold transition-colors ${isOpen ? "text-black" : "text-gray-800 group-hover:text-black"}`}
      >
        {title}
      </span>
      <span
        className={`md:static absolute right-0 transform transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
      >
        <ChevronDown
          className={`w-5 h-5 ${isOpen ? "text-[#D39A9F]" : "text-gray-400 group-hover:text-[#D39A9F]"}`}
        />
      </span>
    </button>
    <div
      className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-[1000px] opacity-100 pb-4" : "max-h-0 opacity-0"}`}
    >
      <div className="text-sm text-black leading-relaxed font-sans text-center md:text-left">
        {children}
      </div>
    </div>
  </div>
);

const stripHtml = (html) => {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
};

const ProductDetails = () => {
  useResetScroll();
  const { id } = useParams();
  const { track } = useAnalytics();
  const navigate = useNavigate();
  const {
    addToCart,
    addToWishlist,
    removeFromWishlist,
    wishlist,
    products,
    isLoading,
    pincode,
    updatePincode,
  } = useShop();
  const { user } = useAuth();
  const [localPincode, setLocalPincode] = useState(pincode || "");
  const [showAuthPopup, setShowAuthPopup] = useState(false);

  useEffect(() => {
    setLocalPincode(pincode);
  }, [pincode]);

  const catalogueProduct = useMemo(
    () => (products || []).find((p) => String(p.id || p._id) === String(id)),
    [products, id],
  );
  const [detailProduct, setDetailProduct] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [settings, setSettings] = useState({
    productHeader: "ESTIMATED DELIVERY DATE",
    returnPolicy: "7-Day Returns",
    exchangePolicy: "10 Days Exchange",
    codPolicy: "Cash On Delivery",
    warrantyText: "Lifetime Warranty",
    safetyText: "Skin Safe Jewellery",
    platingText: "18k Gold Tone Plated",
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.get("public/settings");
        if (res.data.success && res.data.data?.settings) {
          setSettings(res.data.data.settings);
          return;
        }
      } catch (err) {
        console.warn(
          "Failed to fetch public settings from API, falling back to localStorage/defaults:",
          err.message,
        );
      }

      const saved = localStorage.getItem("siteSettings");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSettings((prev) => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error("Failed to parse siteSettings from localStorage", e);
        }
      }
    };

    loadSettings();
    window.addEventListener("storage", loadSettings);
    return () => window.removeEventListener("storage", loadSettings);
  }, []);

  // Production-safe priority: API detail -> catalogue.
  const product = useMemo(() => {
    return detailProduct || catalogueProduct || null;
  }, [detailProduct, catalogueProduct]);

  const metalType = useMemo(() => {
    if (!product) return null;
    const material = String(product?.material || product?.metal || "").trim().toLowerCase();
    if (material.includes("gold")) return "gold";
    if (material.includes("silver") || String(product?.name || "").toLowerCase().includes("silver")) return "silver";
    return null;
  }, [product]);

  const is925SterlingSilver = useMemo(() => {
    if (!product) return false;
    const category = String(product.silverCategory || "")
      .toLowerCase()
      .trim();
    return category === "925 sterling silver";
  }, [product]);

  useEffect(() => {
    let ignore = false;
    const loadDetail = async () => {
      if (!id) return;
      setDetailLoading(true);
      try {
        const res = await api.get(`public/products/${id}`);
        const data = res.data?.data?.product || res.data?.product;
        if (!ignore && data) {
          setDetailProduct({
            ...data,
            id: data._id || data.id,
          });
        }
      } catch (err) {
        // fall back to catalogue (if already in context)
        if (!ignore) setDetailProduct(null);
      } finally {
        if (!ignore) setDetailLoading(false);
      }
    };
    loadDetail();
    return () => {
      ignore = true;
    };
  }, [id]);

  useEffect(() => {
    if (product) {
      track("product_view", {
        productId: product._id || product.id,
        name: product.name,
      });
      const materialLower = String(product?.material || product?.metal || "")
        .trim()
        .toLowerCase();
      const suffix =
        materialLower === "gold"
          ? "Gold Jewellery"
          : materialLower === "silver"
            ? "Silver Jewellery"
            : "Jewellery";
      document.title = `${product.name} | Sands Jewels - ${suffix}`;
    }
  }, [product, track]);

  useEffect(() => {
    const loadReviews = async () => {
      const productId = product?.id || product?._id;
      if (!productId) return;
      try {
        const res = await api.get("public/reviews", { params: { productId } });
        const list = res.data?.data?.reviews || res.data?.reviews || [];
        setReviews(
          list.map((r) => ({
            id: r._id,
            name: r.userId?.name || "Customer",
            date: new Date(r.createdAt).toLocaleDateString("en-GB"),
            rating: r.rating || 0,
            title: r.title || "Review",
            comment: r.body || "",
          })),
        );
      } catch (err) {
        console.error("Failed to load reviews", err);
      }
    };
    loadReviews();
  }, [product?.id, product?._id]);

  useEffect(() => {
    const fetchRelated = async () => {
      if (!product?.relatedProducts || product.relatedProducts.length === 0) {
        setRelatedProducts([]);
        return;
      }
      setIsRelatedLoading(true);
      try {
        const res = await api.get("public/products/by-ids", {
          params: { ids: product.relatedProducts.join(",") },
        });
        setRelatedProducts(res.data?.data?.products || []);
      } catch (err) {
        console.error("Failed to load related products", err);
      } finally {
        setIsRelatedLoading(false);
      }
    };
    fetchRelated();
  }, [product?.relatedProducts]);

  // State for Animations
  
  const [isAtBottom, setIsAtBottom] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrolledToBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 150;
      setIsAtBottom(scrolledToBottom);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [flying, setFlying] = useState(false);
  const [flyingType, setFlyingType] = useState("cart");

  // State for UI Sections
  const [openSection, setOpenSection] = useState("description");
  const [activeTab, setActiveTab] = useState("related");
  const [activeDetailTab, setActiveDetailTab] = useState("details");

  // State for Reviews
  const [isWriteReviewOpen, setIsWriteReviewOpen] = useState(false);
  const [reviewStep, setReviewStep] = useState(1);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [isReviewFilterOpen, setIsReviewFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState("Featured");
  const [rating, setRating] = useState(0);

  const [reviews, setReviews] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [isRelatedLoading, setIsRelatedLoading] = useState(false);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [isLabGrownModalOpen, setIsLabGrownModalOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  const thumbScroll = useDragScroll();
  const detailsScroll = useDragScroll();
  const tableScroll = useDragScroll();

  const sortedReviews = useMemo(() => {
    const parseReviewDate = (value) => {
      if (!value) return 0;
      const [day, month, year] = String(value).split("/");
      return new Date(`${year}-${month}-${day}`).getTime() || 0;
    };

    const list = [...reviews];
    if (sortBy === "Newest")
      return list.sort(
        (a, b) => parseReviewDate(b.date) - parseReviewDate(a.date),
      );
    if (sortBy === "Highest Ratings")
      return list.sort((a, b) => b.rating - a.rating);
    if (sortBy === "Lowest Ratings")
      return list.sort((a, b) => a.rating - b.rating);
    return list.sort(
      (a, b) =>
        b.rating - a.rating ||
        parseReviewDate(b.date) - parseReviewDate(a.date),
    );
  }, [reviews, sortBy]);

  const handleReviewSubmit = async () => {
    if (!reviewTitle.trim() && !reviewComment.trim() && rating === 0) return;
    if (!user) {
      const redirectPath = `${window.location.pathname}${window.location.search}`;
      toast.error("Please login to write a review");
      navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }

    const productId = product?.id || product?._id;
    if (!productId) return;

    try {
      const res = await api.post("public/reviews", {
        productId,
        rating: rating || 5,
        title: reviewTitle.trim() || "Review",
        body: reviewComment.trim() || "No comment provided.",
      });
      if (res.data?.success) {
        toast.success(res.data.message || "Review submitted for approval");
        setIsWriteReviewOpen(false);
        setReviewTitle("");
        setReviewComment("");
        setRating(0);
        setReviewStep(1);
      } else {
        toast.error(res.data?.message || "Unable to submit review");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to submit review");
    }
  };

  // Image Gallery State
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");

  useEffect(() => {
    if (product) {
      const firstVariant = product.variants?.[0];
      setSelectedVariantId(firstVariant?.id || firstVariant?._id || "");
      // Defer image selection to the unified galleryImages logic below (variant images > product images).
      setSelectedImage(null);
    }
    setOpenSection(window.location.hash === "#care" ? "care" : "description"); // Reset sections
  }, [product, id]);

  useEffect(() => {
    if (window.location.hash === "#care" && product) {
      setOpenSection("care");
      const el = document.getElementById("care-guide-section");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, [product]);

  const selectedVariant =
    product?.variants?.find(
      (v) => String(v.id || v._id) === String(selectedVariantId),
    ) || product?.variants?.[0];
  const variantPrice = selectedVariant?.price ?? getProductPrice(product);
  const variantMrp = selectedVariant?.mrp ?? getProductMRP(product);
  const variantDiscount =
    variantMrp > variantPrice
      ? Math.round(((variantMrp - variantPrice) / variantMrp) * 100)
      : 0;
  const selectedVariantStock = Number(selectedVariant?.stock);
  const availableStock = Number.isFinite(selectedVariantStock)
    ? Math.max(0, selectedVariantStock)
    : null;
  const canAddToCart = availableStock === null || availableStock > 0;

  const galleryImages = useMemo(() => {
    const productImages = Array.isArray(product?.images)
      ? product.images.filter(Boolean)
      : [];
    const variantImages = Array.isArray(selectedVariant?.variantImages)
      ? selectedVariant.variantImages.filter(Boolean)
      : [];
    const legacy = product?.image ? [product.image] : [];

    const chosen =
      variantImages.length > 0
        ? variantImages
        : productImages.length > 0
          ? productImages
          : legacy;

    // Keep order, remove duplicates.
    const seen = new Set();
    return chosen.filter((img) => {
      if (!img) return false;
      if (seen.has(img)) return false;
      seen.add(img);
      return true;
    });
  }, [product, selectedVariant]);

  useEffect(() => {
    if (galleryImages.length === 0) return;
    if (!selectedImage || !galleryImages.includes(selectedImage)) {
      setSelectedImage(galleryImages[0]);
    }
    // Intentionally ignore setSelectedImage in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryImages, selectedVariantId, product?.id, product?._id]);

  // Compute primary image with robust fallback
  const primaryImage = useMemo(() => {
    return selectedImage || galleryImages[0] || null;
  }, [selectedImage, galleryImages]);

  const hoverPaneImage = useMemo(() => {
    const candidate = galleryImages.find((img) => img && img !== primaryImage);
    if (candidate) return candidate;

    const categoryData = product?.category;
    const categoryName =
      typeof categoryData === "object" ? categoryData?.name : categoryData;
    const searchStr = String(categoryName || product?.name || "").toLowerCase();

    if (searchStr.includes("ring")) return fallbackModelMap.ring;
    if (searchStr.includes("pendant") || searchStr.includes("necklace"))
      return fallbackModelMap.pendant;
    if (searchStr.includes("earring")) return fallbackModelMap.earring;
    if (searchStr.includes("bracelet")) return fallbackModelMap.bracelet;
    if (searchStr.includes("anklet")) return fallbackModelMap.anklet;
    return null;
  }, [galleryImages, primaryImage, product]);

  const reviewCount = product?.reviewCount ?? reviews.length ?? 0;
  const averageRating = Number(product?.rating || 0);
  const hasReviews = reviewCount > 0 && averageRating > 0;

  const resolvedHiddenCharge = Number(
    selectedVariant?.hiddenCharge ??
      Number(selectedVariant?.hallmarkingCharge || 0) +
        Number(selectedVariant?.diamondCertificateCharge || 0) +
        Number(selectedVariant?.additionalCharge || 0),
  );
  const resolvedPgCharge = Number(selectedVariant?.pgChargeAmount || 0);
  const pricingBreakdown = {
    metalPrice: Number(selectedVariant?.metalPrice || 0),
    makingCharge:
      Number(selectedVariant?.makingCharge || 0) +
      resolvedHiddenCharge +
      resolvedPgCharge,
    diamondPrice: Number(selectedVariant?.diamondPrice || 0),
    gst: Number(selectedVariant?.gst ?? selectedVariant?.gstAmount ?? 0),
    finalPrice: Number(selectedVariant?.finalPrice ?? variantPrice ?? 0),
  };
  const selectedVariantWeight = selectedVariant?.weight ?? product?.weight ?? 0;
  const selectedVariantWeightUnit =
    selectedVariant?.weightUnit || product?.weightUnit || "";
  const pricingSubtotal =
    Number(selectedVariant?.subtotalBeforeTax || 0) ||
    Number(pricingBreakdown.metalPrice || 0) +
      Number(pricingBreakdown.makingCharge || 0) +
      Number(pricingBreakdown.diamondPrice || 0) -
      resolvedPgCharge;
  const gstPercent =
    pricingSubtotal > 0
      ? Math.round(
          (Number(pricingBreakdown.gst || 0) / pricingSubtotal) * 10000,
        ) / 100
      : 0;
  const supplierName =
    product?.sellerId?.shopName || product?.brand || "Sands Jewels";

  // Local currencyText removed
  // Using imported formatCurrency

  // State for Size Selection

  // Handlers for Animation
  const handleAddToCart = () => {
    if (!canAddToCart) {
      toast.error("This variant is out of stock");
      return;
    }

    // Add to cart with specific size
    setFlyingType("cart");
    setFlying(true);

    // Create a unique ID for this specific size variant so it doesn't merge with other sizes
    // Pass 'selectedSize' so the Cart component can display it
    addToCart({
      ...product,
      selectedVariant: product?.variants?.find(
        (v) => String(v.id || v._id) === String(selectedVariantId),
      ),
    });

    setTimeout(() => {
      setFlying(false);
      navigate("/cart");
    }, 800);
  };

  const handleWishlist = () => {
    if (!isWishlisted) {
      setFlyingType("heart");
      setFlying(true);
      addToWishlist(product);
      setTimeout(() => {
        setFlying(false);
        navigate("/wishlist");
      }, 800);
    } else {
      removeFromWishlist(product.id);
    }
  };

  useEffect(() => {
    if (product && product.id) {
      const recentlyViewed = JSON.parse(
        localStorage.getItem("recentlyViewed") || "[]",
      );
      const filtered = recentlyViewed.filter(
        (item) => item.id !== product.id && item.id !== product._id,
      );
      const updated = [
        {
          id: product.id || product._id,
          name: product.name,
          price: variantPrice,
          image: primaryImage || product.images?.[0],
        },
        ...filtered,
      ].slice(0, 10);
      localStorage.setItem("recentlyViewed", JSON.stringify(updated));
    }
  }, [product, variantPrice, primaryImage]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isLightboxOpen) return;
      if (e.key === "Escape") setIsLightboxOpen(false);
      if (e.key === "ArrowRight") handleLightboxNext();
      if (e.key === "ArrowLeft") handleLightboxPrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, galleryImages.length]);

  // Note: Gallery image preloading removed — browser native lazy loading handles
  // this more efficiently on mobile without saturating bandwidth on load.

  if (isLoading || detailLoading) {
    return <Loader />;
  }

  if (!product) {
    return (
      <div className="bg-white min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <ShoppingBag className="w-16 h-16 text-gray-200 mb-4" />
        <h3 className="text-2xl font-serif text-black mb-2">
          Product Not Found
        </h3>
        <p className="text-gray-600 mb-8 max-w-md">
          The jewellery piece you are looking for might have been moved or is no
          longer available.
        </p>
        <button
          onClick={() => navigate("/shop")}
          className="bg-black text-white px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#D39A9F] transition-colors"
        >
          Back to Shop
        </button>
      </div>
    );
  }

  // Derived State
  const safeWishlist = Array.isArray(wishlist) ? wishlist : [];
  const isWishlisted = safeWishlist.some((item) => item.id === product?.id);

  const currentVariant = selectedVariant || product?.variants?.[0] || {};
  const dSpecs = currentVariant?.diamondSpecs || {};
  const hasDiamonds = !!(
    product?.diamondWeight ||
    product?.diamondCount ||
    currentVariant?.diamondWeight ||
    currentVariant?.diamondCount ||
    dSpecs?.carat ||
    dSpecs?.diamondCount ||
    Number(currentVariant?.diamondPrice || 0) > 0
  );
  const diamondType =
    product?.diamondType ||
    currentVariant?.diamondType ||
    (hasDiamonds ? "Natural" : "None");
  const isLabGrown = String(diamondType).toLowerCase().includes("lab_grown");

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  // Lightbox Handlers
  const openLightbox = (image) => {
    const index = galleryImages.findIndex((img) => img === image);
    setLightboxIndex(index >= 0 ? index : 0);
    setIsLightboxOpen(true);
  };

  const handleLightboxNext = (index) => {
    if (typeof index === "number") {
      setLightboxIndex(index);
    } else {
      setLightboxIndex((prev) => (prev + 1) % galleryImages.length);
    }
  };

  const handleLightboxPrev = () => {
    setLightboxIndex(
      (prev) => (prev - 1 + galleryImages.length) % galleryImages.length,
    );
  };

  return (
    <div className="bg-white min-h-screen py-8 pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-both selection:bg-[#D39A9F] selection:text-white">
      <Helmet>
        <title>{product.seo?.title || `${product.name} | Sands Jewels`}</title>
        <meta
          name="description"
          content={
            product.seo?.description ||
            product.description?.replace(/<[^>]*>?/gm, "").slice(0, 160) ||
            `Buy ${product.name} at Sands Jewels.`
          }
        />
        {product.seo?.keywords && (
          <meta name="keywords" content={product.seo.keywords} />
        )}
        <meta property="og:title" content={product.seo?.title || `${product.name} | Sands Jewels`} />
        <meta
          property="og:description"
          content={
            product.seo?.description ||
            `Exclusive ${product.category?.name || "jewellery"} piece starting at ${formatCurrency(variantPrice)}.`
          }
        />
        <meta property="og:image" content={primaryImage} />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:type" content="product" />
      </Helmet>
      {/* Back Button */}
      <div className="container mx-auto px-4 md:px-6 mb-2 mt-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-black hover:text-[#9C5B61] transition-all group font-bold uppercase tracking-widest text-[10px] md:text-xs"
        >
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100 group-hover:-translate-x-1 transition-transform">
            <ArrowLeft className="w-4 h-4 md:w-5 h-5 text-gray-500" />
          </div>
          <span>Go Back</span>
        </button>
      </div>

      {/* Flying Image Animation Element — keyframes in index.css */}
      {flying && primaryImage && (
        <img
          src={primaryImage}
          alt=""
          className={`fixed z-[9999] w-64 h-64 object-cover shadow-2xl pointer-events-none border-4 border-white ${flyingType === "cart" ? "animate-fly-cart" : "animate-fly-heart"}`}
          style={{ left: "50%", top: "50%" }}
        />
      )}

      <div className="container mx-auto px-4 md:px-6">
        {/* DESKTOP STICKY CENTRE ACTION BAR */}
        {!isAtBottom && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[150] hidden md:flex pointer-events-none w-full max-w-fit px-4">
            <div className="pointer-events-auto flex items-center bg-white border border-gray-100 rounded-full p-1.5 shadow-md transition-all animate-in fade-in slide-in-from-bottom-6 duration-500">
              {/* Price Section */}
              <div className="flex flex-col items-start px-6 border-r border-gray-100">
                <span className="text-[9px] text-gray-400 font-medium uppercase tracking-widest mb-0.5">
                  Price
                </span>
                <span className="text-xl font-semibold text-gray-900 tracking-tight">
                  {formatCurrency(variantPrice)}
                </span>
              </div>

              {/* Weight Selector Pill */}
              <div className="px-6 min-w-[160px]">
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full cursor-pointer group relative">
                  <LucideIcons.SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
                  <div className="flex-1 flex items-center gap-1.5 text-[13px] text-gray-600">
                    <span className="text-gray-400 font-medium">Size:</span>
                    <select
                      value={selectedVariantId}
                      onChange={(e) => setSelectedVariantId(e.target.value)}
                      className="bg-transparent border-none outline-none font-medium text-black cursor-pointer appearance-none pr-6 relative z-10"
                    >
                      {product.variants?.map((v) => (
                        <option key={v.id || v._id} value={v.id || v._id}>
                          {is925SterlingSilver
                            ? v.name
                            : `${v.weight} ${v.weightUnit || "g"}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <LucideIcons.ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-4" />
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleAddToCart}
                disabled={!canAddToCart}
                className={`px-8 py-3 rounded-full font-medium text-[10px] tracking-widest uppercase transition-all active:scale-95 ${canAddToCart ? "bg-[#8E2B45] hover:bg-[#5B1E26] text-white shadow-sm" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
              >
                {canAddToCart ? "Add to Bag" : "Out of Stock"}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Left: Product Lookbook (Split: Video & Image) */}
          <div className="relative space-y-4">
            <div className="h-[400px] lg:h-[520px] w-full bg-white rounded-2xl overflow-hidden shadow-sm relative flex flex-col md:flex-row gap-[1px] border border-gray-100">
              {/* Video Pane (optional, product-specific) */}
              {product?.videoUrl && (
                <div className="w-full md:w-1/2 relative h-1/2 md:h-full group overflow-hidden border-r border-white/10 bg-black">
                  {isImageMedia(product.videoUrl) ? (
                    <>
                      <img
                        src={product.videoUrl}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/5 transition-colors" />
                    </>
                  ) : (
                    <video
                      src={product.videoUrl}
                      autoPlay
                      muted
                      loop
                      playsInline
                      controls
                      preload="none"
                      className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110"
                      onError={(e) => {
                        console.error("Product video playback failed:", e);
                      }}
                    />
                  )}

                  {/* Experience Sticker Layer (Subtle) */}
                  <div className="absolute bottom-4 right-4 z-30 scale-75 md:scale-[0.85]">
                    <div className="relative w-24 h-24 flex items-center justify-center animate-[spin_10s_linear_infinite]">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <path
                          id="circlePathSmall"
                          d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                          fill="none"
                        />
                        <text className="text-[9px] font-bold tracking-[0.2em] uppercase fill-white/80">
                          <textPath xlinkHref="#circlePathSmall">
                            The Lookbook • Sands Royal •{" "}
                          </textPath>
                        </text>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center animate-none">
                        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                          <Play className="w-3 h-3 text-white fill-current translate-x-[1px]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Image Pane - ZOOM IN/OUT implementation */}
              <div
                onClick={() => setIsImageZoomed(prev => !prev)}
                className={`${product?.videoUrl ? "w-full md:w-1/2 h-1/2 md:h-full" : "w-full h-full"} relative group overflow-hidden bg-[#F7F2F3] ${isImageZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
              >
                {primaryImage ? (
                  <>
                    {/* Main State Image (Thumbnail selected or default) — eager load (LCP element) */}
                    <img
                      src={getProductDetailUrl(primaryImage)}
                      alt={product.name}
                      fetchPriority="high"
                      decoding="sync"
                      className={`absolute inset-0 w-full h-full object-cover z-0 transition-transform duration-500 ease-out ${isImageZoomed ? 'scale-150' : 'scale-100'}`}
                    />

                    {/* Hover Image (2nd gallery image when available; otherwise model fallback) */}
                    {hoverPaneImage ? (
                      <img
                        src={getProductCardUrl(hoverPaneImage)}
                        alt={`${product.name} look`}
                        loading="lazy"
                        decoding="async"
                        className={`absolute inset-0 w-full h-full object-cover z-10 opacity-0 group-hover:opacity-100 transition-all duration-[1200ms] ease-in-out ${isImageZoomed ? 'scale-150' : 'scale-100'}`}
                      />
                    ) : null}
                    {/* Zoom Indicator Icon */}
                    <div className={`absolute inset-0 flex items-center justify-center transition-opacity bg-black/5 z-20 pointer-events-none ${isImageZoomed ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
                      <div className="p-3 rounded-full bg-white/80 backdrop-blur shadow-sm transform scale-90 group-hover:scale-100 transition-transform duration-500">
                        {isImageZoomed ? null : (
                          <Maximize2
                            className="w-5 h-5 text-black"
                            strokeWidth={1.5}
                          />
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#B88B90] text-[10px] font-bold uppercase tracking-widest">
                    Pure Silver
                  </div>
                )}
                <div className="absolute top-3 right-3 flex flex-col gap-2 z-20">
                  <button
                    onClick={async () => {
                      const url = window.location.href;
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: product?.name || "Check out this product",
                            text: `I found this beautiful ${product?.name} on Sands Jewels!`,
                            url: url,
                          });
                        } catch (err) {
                          console.log("Share cancelled");
                        }
                      } else {
                        navigator.clipboard.writeText(url);
                        toast.success("Link copied to clipboard!");
                      }
                    }}
                    className="bg-white/90 p-2 rounded-full shadow-md hover:bg-[#D39A9F] hover:text-white text-black transition-all"
                  >
                    <Share2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Wishlist Button Overlay */}
              <div className="absolute top-4 left-4 z-20">
                <button
                  onClick={handleWishlist}
                  className={`p-3 rounded-full shadow-lg transition-all active:scale-90 ${isWishlisted ? "bg-red-50 text-red-500 shadow-red-100" : "bg-white/90 text-black hover:bg-[#D39A9F] hover:text-white"}`}
                >
                  <Heart
                    className={`w-5 h-5 ${isWishlisted ? "fill-current" : ""}`}
                    strokeWidth={1.5}
                  />
                </button>
              </div>
            </div>

            {/* Thumbnails Row */}
            {galleryImages.length > 1 && (
              <div
                {...thumbScroll.events}
                ref={thumbScroll.ref}
                className={`flex gap-4 overflow-x-auto pb-4 px-1 scrollbar-hide justify-center ${thumbScroll.isDragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
              >
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`relative shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden border-2 transition-all shadow-sm ${selectedImage === img ? "border-[#D39A9F] ring-1 ring-[#D39A9F]" : "border-transparent hover:border-gray-200"}`}
                  >
                    <img
                      src={getProductThumbUrl(img)}
                      alt={`View ${idx + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                    {selectedImage === img && (
                      <div className="absolute inset-0 bg-black/10" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* JEWELLERY DETAILS TABBED SECTION - Moved to center below product area */}
          <div className="min-h-[280px] lg:h-[520px] w-full bg-white rounded-2xl lg:rounded-[2rem] border border-gray-100 p-4 md:p-10 shadow-sm relative flex flex-col">
            <div
              {...detailsScroll.events}
              ref={detailsScroll.ref}
              className={`flex-1 flex flex-col justify-start pt-2 md:pt-4 overflow-y-auto custom-scrollbar ${detailsScroll.isDragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
            >
              <h2 className="text-base md:text-xl font-bold text-center text-gray-900 mb-3 md:mb-6 tracking-tight">
                Jewellery Details
              </h2>

              {/* Tab Switcher */}
              <div className="bg-white border border-gray-100 rounded-full p-0.5 md:p-1 grid grid-cols-2 mb-4 md:mb-10 max-w-[540px] mx-auto shadow-md">
                <button
                  onClick={() => setActiveDetailTab("details")}
                  className={`py-2 md:py-3 rounded-full text-[11px] md:text-[13px] font-medium transition-all duration-500 whitespace-nowrap px-4 md:px-10 ${activeDetailTab === "details" ? "bg-[#8E2B45] text-white shadow-lg" : "text-gray-900 hover:text-[#8E2B45]"}`}
                >
                  Product Details
                </button>
                <button
                  onClick={() => setActiveDetailTab("price")}
                  className={`py-2 md:py-3 rounded-full text-[11px] md:text-[13px] font-medium transition-all duration-500 whitespace-nowrap px-4 md:px-10 ${activeDetailTab === "price" ? "bg-[#8E2B45] text-white shadow-lg" : "text-gray-900 hover:text-[#8E2B45]"}`}
                >
                  Price Breakup
                </button>
              </div>

              {/* Tab Content */}
              {/* Tab Content with Swipe Gesture */}
              <motion.div
                key={activeDetailTab}
                initial={{
                  opacity: 0,
                  x: activeDetailTab === "details" ? -20 : 20,
                }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = offset.x;
                  if (swipe < -50 && activeDetailTab === "details") {
                    setActiveDetailTab("price");
                  } else if (swipe > 50 && activeDetailTab === "price") {
                    setActiveDetailTab("details");
                  }
                }}
                className="animate-in fade-in slide-in-from-bottom-4 duration-700 cursor-grab active:cursor-grabbing touch-pan-y"
              >
                {activeDetailTab === "details" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                    {hasDiamonds && (
                      <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 border border-[#8E2B45]/10 shadow-[0_4px_20px_-4px_rgba(142,43,69,0.05)] flex flex-col items-center text-center">
                        <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#8E2B45] to-[#5B1E26] flex items-center justify-center mb-4 md:mb-8 shadow-lg transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                          <Sparkles className="w-5 h-5 md:w-7 md:h-7 text-white" />
                        </div>
                        <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-[#8E2B45] mb-4 md:mb-10 border-b border-[#8E2B45]/10 pb-2">
                          Diamond Intelligence
                        </h4>
                        <div className="grid grid-cols-3 gap-y-4 md:gap-y-10 gap-x-3 md:gap-x-6 w-full">
                          <div className="group transition-all duration-300">
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-2 md:mb-3 group-hover:bg-[#8E2B45]/5 transition-colors">
                              <Layers className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 group-hover:text-[#8E2B45]" />
                            </div>
                            <span className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5 md:mb-1">
                              Type
                            </span>
                            <span className="text-[11px] md:text-[13px] font-bold text-gray-900 block capitalize">
                              {String(diamondType).replace("_", " ")}
                            </span>
                          </div>
                          <div className="group transition-all duration-300">
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-2 md:mb-3 group-hover:bg-[#8E2B45]/5 transition-colors">
                              <Scale className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 group-hover:text-[#8E2B45]" />
                            </div>
                            <span className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5 md:mb-1">
                              Weight
                            </span>
                            <span className="text-[11px] md:text-[13px] font-bold text-gray-900 block">
                              {currentVariant?.diamondSpecs?.carat ||
                                product.diamondWeight ||
                                currentVariant?.diamondWeight ||
                                "---"}
                              <span className="text-[9px] md:text-[10px] ml-0.5">
                                Ct
                              </span>
                            </span>
                          </div>
                          <div className="group transition-all duration-300">
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-2 md:mb-3 group-hover:bg-[#8E2B45]/5 transition-colors">
                              <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 group-hover:text-[#8E2B45]" />
                            </div>
                            <span className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5 md:mb-1">
                              Clarity
                            </span>
                            <span className="text-[11px] md:text-[13px] font-bold text-gray-900 block">
                              {currentVariant?.diamondSpecs?.clarity ||
                                product.diamondClarity ||
                                currentVariant?.diamondClarity ||
                                "---"}
                            </span>
                          </div>
                          <div className="group transition-all duration-300">
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-2 md:mb-3 group-hover:bg-[#8E2B45]/5 transition-colors">
                              <Droplets className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 group-hover:text-[#8E2B45]" />
                            </div>
                            <span className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5 md:mb-1">
                              Color
                            </span>
                            <span className="text-[11px] md:text-[13px] font-bold text-gray-900 block">
                              {currentVariant?.diamondSpecs?.color || "---"}
                            </span>
                          </div>
                          <div className="group transition-all duration-300">
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-2 md:mb-3 group-hover:bg-[#8E2B45]/5 transition-colors">
                              <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 group-hover:text-[#8E2B45]" />
                            </div>
                            <span className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5 md:mb-1">
                              Cut / Shape
                            </span>
                            <span className="text-[11px] md:text-[13px] font-bold text-gray-900 block">
                              {currentVariant?.diamondSpecs?.cut || "---"}
                              <span className="mx-1 text-gray-200">/</span>
                              {currentVariant?.diamondSpecs?.shape || "---"}
                            </span>
                          </div>
                          <div className="group transition-all duration-300">
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-2 md:mb-3 group-hover:bg-[#8E2B45]/5 transition-colors">
                              <Box className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 group-hover:text-[#8E2B45]" />
                            </div>
                            <span className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5 md:mb-1">
                              Count
                            </span>
                            <span className="text-[11px] md:text-[13px] font-bold text-gray-900 block">
                              {currentVariant?.diamondSpecs?.diamondCount ||
                                product.diamondCount ||
                                currentVariant?.diamondCount ||
                                "---"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div
                      className={`${hasDiamonds ? "" : "md:col-span-2 max-w-lg mx-auto w-full"} bg-gray-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-100 flex flex-col items-center text-center`}
                    >
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#9C5B61]/10 flex items-center justify-center mb-3 md:mb-6">
                        <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-[#9C5B61]" />
                      </div>
                      <h4 className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-4 md:mb-8">
                        Metal & Authentication
                      </h4>
                      <div className="grid grid-cols-2 gap-y-3 md:gap-y-6 gap-x-6 md:gap-x-8 w-full">
                        <div className="space-y-0.5 md:space-y-1">
                          <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                            Metal
                          </span>
                          <span className="text-[11px] md:text-xs font-semibold text-gray-900 block">
                            {product.material || product.metal || "925 Silver"}
                          </span>
                        </div>
                        <div 
                          onClick={() => setShowAuthPopup(true)}
                          className="space-y-0.5 md:space-y-1 cursor-pointer group/purity hover:opacity-90 transition-all duration-300 flex flex-col items-center"
                        >
                          <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest block group-hover/purity:text-[#8E2B45] transition-colors">
                            Purity
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-[11px] md:text-xs font-semibold text-gray-900 underline decoration-dashed decoration-gray-300 hover:decoration-[#8E2B45] group-hover/purity:text-[#8E2B45] transition-all">
                            {product.silverCategory || product.purity || "---"}
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8E2B45] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8E2B45]"></span>
                            </span>
                          </span>
                        </div>
                        {!is925SterlingSilver && (
                          <div className="space-y-0.5 md:space-y-1">
                            <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                              Weight
                            </span>
                            <span className="text-[11px] md:text-xs font-semibold text-gray-900 block">
                              {selectedVariantWeight || product.weight || "---"}{" "}
                              {selectedVariantWeightUnit ||
                                product.weightUnit ||
                                "g"}
                            </span>
                          </div>
                        )}
                        {selectedVariant?.size && (
                          <div className="space-y-0.5 md:space-y-1">
                            <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                              Size
                            </span>
                            <span className="text-[11px] md:text-xs font-semibold text-gray-900 block">
                              {selectedVariant.size}
                            </span>
                          </div>
                        )}
                        <div className="space-y-0.5 md:space-y-1">
                          <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                            HUID
                          </span>
                          <span className="text-[11px] md:text-xs font-semibold text-emerald-700 block uppercase tracking-tighter">
                            {product.huid || "SANDS-AUTH"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div
                      {...tableScroll.events}
                      ref={tableScroll.ref}
                      className={`bg-gray-50/50 rounded-xl md:rounded-2xl border border-gray-100 overflow-x-auto custom-scrollbar shadow-sm ${tableScroll.isDragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
                    >
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="px-3 md:px-6 py-2.5 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400">
                              Component
                            </th>
                            <th className="px-3 md:px-6 py-2.5 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                              Rate/Qty
                            </th>
                            <th className="px-3 md:px-6 py-2.5 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                              Value
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {[
                            {
                              label: "Metal (925 Silver)",
                              rate: is925SterlingSilver
                                ? "-"
                                : `${selectedVariantWeight || product.weight || "---"} g`,
                              value: pricingBreakdown.metalPrice,
                            },
                            {
                              label: "Making Charges",
                              rate: "-",
                              value: pricingBreakdown.makingCharge,
                            },
                            {
                              label: "Diamond / Stones",
                              rate: "-",
                              value: pricingBreakdown.diamondPrice,
                            },
                            {
                              label: `GST (${gstPercent}%)`,
                              rate: "-",
                              value: pricingBreakdown.gst,
                            },
                          ].map((item, idx) => (
                            <tr
                              key={idx}
                              className="hover:bg-white transition-colors"
                            >
                              <td className="px-3 md:px-6 py-2.5 md:py-4 text-[10px] md:text-[11px] font-bold text-gray-700 uppercase tracking-tight">
                                {item.label}
                              </td>
                              <td className="px-3 md:px-6 py-2.5 md:py-4 text-[10px] md:text-[11px] font-semibold text-gray-500 text-right">
                                {item.rate}
                              </td>
                              <td className="px-3 md:px-6 py-2.5 md:py-4 text-[10px] md:text-[11px] font-bold text-gray-900 text-right">
                                {formatCurrency(item.value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-[#8E2B45]/5 border-t border-[#8E2B45]/10">
                            <td
                              colSpan="2"
                              className="px-3 md:px-6 py-3 md:py-5 text-[10px] md:text-[11px] font-black text-[#8E2B45] uppercase tracking-[0.2em]"
                            >
                              Total Price
                            </td>
                            <td className="px-3 md:px-6 py-3 md:py-5 text-base md:text-lg font-black text-[#8E2B45] text-right">
                              {formatCurrency(
                                pricingBreakdown.finalPrice ||
                                  variantPrice ||
                                  0,
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <p className="mt-3 md:mt-4 text-[8px] md:text-[9px] text-gray-400 text-center font-bold uppercase tracking-widest italic">
                      * Final price includes all applicable taxes and insured
                      shipping.
                    </p>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Product Info */}
      <div className="w-full mt-8 mb-12 px-0">
        <div className="bg-white border-y border-gray-100 p-6 md:p-12 flex flex-col items-center text-center">
          {/* Header: Title & Rating */}
          <div className="max-w-4xl mx-auto mb-6">
            <h1 className="text-2xl md:text-4xl font-sans font-bold text-black mb-4 tracking-tight uppercase">
              {product.name}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="flex items-center text-[#D39A9F] bg-[#FDF5F6] px-3 py-1 rounded-full border border-[#EBCDD0]/20">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${i < Math.round(averageRating) ? "fill-current" : "text-gray-200"} `}
                    />
                  ))}
                </div>
                <span className="ml-2 text-[9px] font-bold uppercase tracking-widest text-gray-500">
                  {hasReviews
                    ? `${reviewCount} Reviews`
                    : "Authentic Collection"}
                </span>
              </div>

              {supplierName && (
                <div className="text-[9px] uppercase tracking-[0.2em] text-gray-400 font-bold">
                  By <span className="text-gray-900">{supplierName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Section - Compact */}
          <div className="mb-8">
            <div className="flex items-baseline justify-center gap-3">
              <span className="text-3xl md:text-5xl font-bold text-black tracking-tighter">
                {formatCurrency(variantPrice)}
              </span>
              {variantMrp > variantPrice && (
                <div className="flex items-center gap-2">
                  <span className="text-base md:text-lg text-gray-300 line-through font-medium">
                    {formatCurrency(variantMrp)}
                  </span>
                  <span className="text-[9px] font-bold text-[#9C5B61] uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded">
                    -{variantDiscount}%
                  </span>
                </div>
              )}
            </div>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">
              Inclusive of all taxes & shipping
            </p>
          </div>

          {/* Variant & Action Section - Tightened */}
          <div className="w-full max-w-xl space-y-8">
            {product.variants && product.variants.length > 1 && (
              <div className="space-y-3">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] block text-center mb-1">
                  Select Size / Option:
                </span>
                <div className="flex flex-wrap justify-center gap-2">
                  {product.variants.map((variant) => {
                    const variantId = variant.id || variant._id;
                    const isSelected =
                      String(variantId) === String(selectedVariantId);
                    return (
                      <button
                        key={variantId}
                        type="button"
                        onClick={() => setSelectedVariantId(variantId)}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all duration-300 ${
                          isSelected
                            ? "border-[#8E2B45] bg-[#8E2B45] text-white shadow-md"
                            : "border-gray-100 text-gray-400 hover:border-gray-300 bg-gray-50/30"
                        }`}
                      >
                        {variant.name}
                        {variant.size ? ` (Size: ${variant.size})` : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DESKTOP ACTION BUTTONS */}
            <div className="hidden md:flex flex-col items-center gap-4">
              <button
                onClick={handleAddToCart}
                disabled={!canAddToCart}
                className={`w-full max-w-md py-5 rounded-xl font-bold uppercase tracking-[0.2em] text-[11px] transition-all duration-500 relative overflow-hidden group ${
                  canAddToCart
                    ? "bg-[#8E2B45] text-white hover:bg-[#5B1E26] shadow-lg hover:-translate-y-0.5"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {canAddToCart ? (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      Add to Bag
                    </>
                  ) : (
                    "Out of Stock"
                  )}
                </span>
              </button>

              <div className="flex items-center justify-center gap-6 mt-2">
                <button
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="text-[9px] font-black text-[#8E2B45] uppercase tracking-[0.2em] hover:underline flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Ruler size={12} /> Find Your Size
                </button>
                <div className="h-3 w-[1px] bg-gray-100" />
                <button
                  onClick={() => navigate("/shipping-policy")}
                  className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-[#8E2B45] transition-all"
                >
                  Shipping Policy
                </button>
              </div>
            </div>

            {/* Trust Ribbon - Premium Highlight */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full pt-8 border-t border-gray-50">
              {[
                {
                  icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
                  title: "BIS Hallmark",
                  desc: "100% Pure & Certified",
                },
                {
                  icon: <RotateCcw className="w-5 h-5 text-amber-600" />,
                  title: settings.returnPolicy || "7-Day Returns",
                  desc: "Easy & Hassle Free",
                },
                {
                  icon: <RefreshCw className="w-5 h-5 text-blue-600" />,
                  title: settings.exchangePolicy || "10 Days Exchange",
                  desc: "Exchange Guarantee",
                },
                {
                  icon: <Lock className="w-5 h-5 text-gray-600" />,
                  title: settings.codPolicy || "Cash On Delivery",
                  desc: "Secure Payment",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center gap-2 group cursor-default"
                >
                  <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center transition-all group-hover:bg-white group-hover:shadow-md border border-transparent group-hover:border-gray-100">
                    {item.icon}
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black text-gray-900 uppercase tracking-widest">
                      {item.title}
                    </p>
                    <p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5 opacity-0 group-hover:opacity-100 transition-all">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stock & Codes */}
            <div className="flex flex-col items-center gap-3 pt-4 border-t border-gray-50">
              <div
                className={`flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest ${canAddToCart ? "text-emerald-600" : "text-rose-600"}`}
              >
                <div
                  className={`w-1 h-1 rounded-full ${canAddToCart ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}
                />
                {canAddToCart ? "Ready to Ship" : "Sold Out"}
              </div>

              <div className="flex gap-4 opacity-30">
                {product?.huid && (
                  <span className="text-[8px] font-bold uppercase tracking-widest text-gray-500">
                    HUID {product.huid}
                  </span>
                )}
                {selectedVariant?.variantCode && (
                  <span className="text-[8px] font-bold uppercase tracking-widest text-gray-500">
                    REF {selectedVariant.variantCode}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lab Grown Diamond Info Link - Integrated more smoothly */}
      {isLabGrown && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setIsLabGrownModalOpen(true)}
            className="group flex items-center gap-4 bg-emerald-50/30 border border-emerald-100/50 hover:bg-emerald-50 hover:border-emerald-200 transition-all px-8 py-4 rounded-2xl"
          >
            <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-[0.15em] border-b border-emerald-200 pb-0.5">
              Conscious Luxury: Lab Grown Diamond Guide
            </span>
          </button>
        </div>
      )}

      {/* Mobile Sticky Bottom Action Bar - Always functional */}
      {!isAtBottom && (
      <div className="fixed bottom-[90px] left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-2.5 z-[150] md:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-500">
        <button
          onClick={handleAddToCart}
          disabled={!canAddToCart}
          className={`w-full rounded-xl h-10 font-bold uppercase tracking-[0.15em] text-[11px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg ${
            canAddToCart
              ? "bg-[#8E2B45] text-white shadow-[#8E2B45]/20 hover:bg-[#5B1E26]"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {canAddToCart ? (
            <>
              <ShoppingBag className="w-4 h-4" />
              Add to Bag
            </>
          ) : (
            "Out of Stock"
          )}
        </button>
      </div>
      )}

      <style>
        {`
                    @keyframes shimmer {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(100%); }
                    }
                    .animate-shimmer {
                        animation: shimmer 2s infinite;
                    }
                    @media (max-width: 768px) {
                        .floating-contact-stack {
                            bottom: 140px !important;
                        }
                    }
                `}
      </style>

      {/* CHECK AVAILABILITY SECTION - Ultra Compact */}
      <div className="container mx-auto px-4 mt-4 mb-10 max-w-4xl">
        <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col md:flex-row items-center gap-4 shadow-sm relative overflow-hidden group">
          {/* Progress Bar (Purely Aesthetic) */}
          <div className="absolute top-0 left-0 h-[2px] bg-[#8E2B45]/10 w-full" />
          <div className="absolute top-0 left-0 h-[2px] bg-[#8E2B45] w-0 group-hover:w-full transition-all duration-1000" />

          <div className="flex items-center gap-2 pl-2">
            <Truck className="w-4 h-4 text-[#8E2B45]" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 hidden lg:block whitespace-nowrap">
              {settings.productHeader || "Deliver To"}
            </span>
          </div>

          <div className="flex w-full md:max-w-xs gap-1.5 bg-gray-50 rounded-lg p-1 border border-transparent focus-within:border-[#8E2B45]/20 focus-within:bg-white transition-all">
            <input
              type="text"
              placeholder="Enter Pincode"
              value={localPincode}
              onChange={(e) =>
                setLocalPincode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="flex-1 bg-transparent border-none px-3 py-1 text-xs focus:ring-0 transition-all placeholder:text-gray-300 font-bold"
            />
            <button
              onClick={() => {
                if (localPincode.length === 6 && /^[1-9][0-9]{5}$/.test(localPincode)) {
                  updatePincode(localPincode);
                  toast.success("Checking availability...");
                } else {
                  toast.error("Please enter a valid 6-digit pincode");
                }
              }}
              className="bg-[#8E2B45] text-white px-4 py-1.5 rounded-md font-black text-[9px] uppercase tracking-wider hover:bg-[#5B1E26] transition-all shadow-sm active:scale-95"
            >
              Check
            </button>
          </div>

          {pincode && /^[1-9][0-9]{5}$/.test(pincode) ? (
            <div className="flex flex-col md:flex-row items-center gap-3 md:ml-auto md:border-l md:border-gray-100 md:pl-6 animate-in fade-in slide-in-from-left-2 duration-500">
              <div className="flex items-center gap-2 text-emerald-600">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Available
                </span>
              </div>
              <div className="h-4 w-[1px] bg-gray-100 hidden md:block" />
              <p className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">
                Get it by{" "}
                <span className="text-[#8E2B45]">
                  {(() => {
                    const days = product?.logistics?.estimatedShippingDays || 3;
                    const date = new Date();
                    date.setDate(date.getDate() + days + 2); // 2 days buffer for delivery
                    return date.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      weekday: "short",
                    });
                  })()}
                </span>
              </p>
            </div>
          ) : pincode ? (
            <div className="flex flex-col md:flex-row items-center gap-3 md:ml-auto md:border-l md:border-gray-100 md:pl-6 text-rose-600 animate-in fade-in duration-300">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Not Serviceable
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-6 md:ml-auto md:border-l md:border-gray-100 md:pl-6 pr-2 opacity-60">
              {[
                { icon: <Truck className="w-3.5 h-3.5" />, label: "Express" },
                {
                  icon: <ShieldCheck className="w-3.5 h-3.5" />,
                  label: "Insured",
                },
                { icon: <Gift className="w-3.5 h-3.5" />, label: "Luxury Box" },
              ].map((badge, i) => (
                <div key={i} className="flex items-center gap-2 text-gray-400">
                  {badge.icon}
                  <span className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                    {badge.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ================= LOWER CONTENT SECTION (ACCORDIONS) ================= */}
      <div className="w-full mt-24 border-y border-gray-100 bg-white">
        <div className="max-w-[1440px] mx-auto py-20 px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            {/* Left: Product Badges / USP - Clean & Modern */}
            <div className="lg:col-span-4 space-y-10">
              <div>
                <h3 className="text-2xl font-sans font-bold text-black mb-2 flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-[#9C5B61]" />
                  The Sands Promise
                </h3>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">
                  Our commitment to excellence
                </p>
              </div>

              <div className="space-y-8">
                {(
                  settings.sandsPromise || [
                    {
                      title: "Authentic 925 Silver",
                      desc: "Certified 925 Sterling Silver with official hallmarking on every single piece.",
                      icon: "ShieldCheck",
                    },
                    {
                      title: "Skin Safe Luxury",
                      desc: "Hypoallergenic, Nickel and Lead-free materials designed for sensitive skin.",
                      icon: "Smile",
                    },
                    {
                      title: "Signature Packaging",
                      desc: "Arrives in our signature velvet-lined box, perfect for gifting and safekeeping.",
                      icon: "Gift",
                    },
                  ]
                ).map((promise, index) => {
                  const IconComp =
                    LucideIcons[promise.icon] || LucideIcons.ShieldCheck;
                  return (
                    <div key={index} className="flex items-start gap-5 group">
                      <div className="w-12 h-12 rounded-full bg-gray-50 flex-shrink-0 flex items-center justify-center border border-gray-100 transition-colors group-hover:bg-[#FDF5F6] group-hover:border-[#EBCDD0]/30">
                        <IconComp className="w-6 h-6 text-[#9C5B61]" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-bold uppercase tracking-widest text-black mb-1">
                          {promise.title}
                        </h4>
                        <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                          {promise.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Trust Badge */}
              <div className="pt-8 border-t border-gray-50">
                <div className="bg-[#F8F9FA] rounded-2xl p-6 flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-4">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-900 mb-1">
                    Secure Purchase
                  </span>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                    100% Insured Shipping
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Detailed Product Info Accordion - Professional & Minimal */}
            <div className="lg:col-span-8">
              <div className="divide-y divide-gray-100">
                <AccordionItem
                  title="Product Story"
                  isOpen={openSection === "description"}
                  onClick={() => toggleSection("description")}
                >
                  <div className="py-2">
                    {product.description ? (
                      <div
                        className="prose prose-sm max-w-none text-gray-600 font-medium leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: product.description,
                        }}
                      />
                    ) : (
                      <div className="text-gray-600 font-medium leading-relaxed space-y-4">
                        <p>
                          Elegance meets craftsmanship in this stunning{" "}
                          {product.name}. Handcrafted with precision from 925
                          Sterling Silver, this piece is designed to be a
                          timeless addition to your collection.
                        </p>
                        <p>
                          Whether you're dressing up for a special occasion or
                          adding a touch of sparkle to your daily look, this
                          piece is versatile enough to complement any style.
                        </p>
                      </div>
                    )}
                  </div>
                </AccordionItem>

                <AccordionItem
                  title="Full Specifications"
                  isOpen={openSection === "specifications"}
                  onClick={() => toggleSection("specifications")}
                >
                  <div className="space-y-8 py-4">
                    {/* Diamond Section */}
                    {(hasDiamonds ||
                      product.diamondWeight ||
                      product.diamondCount) && (
                      <div className="bg-gray-50/50 rounded-2xl p-8 border border-gray-100">
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9C5B61] mb-8 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#9C5B61]" />
                          Diamond & Setting
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-10 gap-x-8">
                          {[
                            {
                              label: "Type",
                              value:
                                String(diamondType)
                                  .replace("_", " ")
                                  .split(" ")
                                  .map(
                                    (w) =>
                                      w.charAt(0).toUpperCase() + w.slice(1),
                                  )
                                  .join(" ") || "Natural",
                            },
                            {
                              label: "Carat Weight",
                              value: dSpecs?.carat
                                ? `${dSpecs.carat} cts`
                                : product.diamondWeight ||
                                  currentVariant?.diamondWeight ||
                                  "---",
                            },
                            {
                              label: "Count",
                              value:
                                dSpecs?.diamondCount ||
                                product.diamondCount ||
                                currentVariant?.diamondCount ||
                                "---",
                            },
                            {
                              label: "Shape",
                              value:
                                dSpecs?.shape ||
                                product.diamondShape ||
                                currentVariant?.diamondShape ||
                                "Round",
                            },
                            { label: "Color", value: dSpecs?.color || "---" },
                            {
                              label: "Clarity",
                              value:
                                dSpecs?.clarity ||
                                product.diamondClarity ||
                                currentVariant?.diamondClarity ||
                                "---",
                            },
                            { label: "Cut", value: dSpecs?.cut || "---" },
                            {
                              label: "Setting",
                              value:
                                product.diamondSetting ||
                                currentVariant?.diamondSetting ||
                                "Prong",
                            },
                          ]
                            .filter((s) => s.value && s.value !== "---")
                            .map((spec, i) => (
                              <div 
                                key={i} 
                                className={`space-y-1.5 ${spec.clickable ? "cursor-pointer group/spec" : ""}`}
                                onClick={spec.onClick}
                              >
                                <span className={`text-[9px] font-bold text-gray-400 uppercase tracking-widest block ${spec.clickable ? "group-hover/spec:text-[#8E2B45] transition-colors" : ""}`}>
                                  {spec.label}
                                </span>
                                <span className={`inline-flex items-center justify-center gap-1.5 text-sm font-bold text-gray-900 w-full ${spec.clickable ? "underline decoration-dashed decoration-gray-300 group-hover/spec:text-[#8E2B45] transition-all" : ""}`}>
                                  {spec.value}
                                  {spec.clickable && (
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8E2B45] opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8E2B45]"></span>
                                    </span>
                                  )}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Metal Section */}
                    <div className="bg-gray-50/50 rounded-2xl p-8 border border-gray-100">
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9C5B61] mb-8 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#9C5B61]" />
                        Material & Authenticity
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-y-10 gap-x-8">
                        {[
                          {
                            label: "Metal",
                            value:
                              product.material || product.metal || "925 Silver",
                          },
                          {
                            label: "Purity",
                            value:
                              product.silverCategory ||
                              product.goldCategory ||
                              product.purity ||
                              "---",
                            onClick: () => setShowAuthPopup(true),
                            clickable: true,
                          },
                          !is925SterlingSilver && {
                            label: "Weight",
                            value: `${selectedVariantWeight || product.weight || "---"} ${selectedVariantWeightUnit || product.weightUnit || "g"}`,
                          },
                          {
                            label: "Certificate",
                            value: product.logistics?.certificateUrl ? (
                              <a
                                href={product.logistics.certificateUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#8E2B45] hover:underline flex items-center gap-1 transition-all"
                              >
                                View Certificate <ExternalLink size={10} />
                              </a>
                            ) : (
                              product.certificate || "Sands Authenticated"
                            ),
                          },
                          { label: "HUID", value: product.huid || "---" },
                          selectedVariant?.size && {
                            label: "Size",
                            value: selectedVariant.size,
                          },
                          {
                            label: "Reference",
                            value: selectedVariant?.variantCode || "---",
                          },
                        ]
                          .filter(Boolean)
                          .map((spec, i) => (
                            <div key={i} className="space-y-1.5">
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                                {spec.label}
                              </span>
                              <div className="text-sm font-bold text-gray-900 block">
                                {spec.value}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {product.specifications && (
                      <div
                        className="mt-6 p-6 bg-gray-50/30 rounded-2xl border border-gray-100 prose prose-sm max-w-none text-gray-600 font-medium"
                        dangerouslySetInnerHTML={{
                          __html: product.specifications,
                        }}
                      />
                    )}
                  </div>
                </AccordionItem>

                <AccordionItem
                  title="Price Breakup"
                  isOpen={openSection === "priceBreakup"}
                  onClick={() => toggleSection("priceBreakup")}
                >
                  <div className="py-6 space-y-6">
                    <div className="bg-[#FDFBF7] rounded-2xl p-6 border border-[#F5E6D3]/30">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs font-medium text-gray-600">
                          <span>
                            Metal Price{" "}
                            {is925SterlingSilver
                              ? ""
                              : `(${currentVariant?.weight || product.weight || "0"} {currentVariant?.weightUnit || product.weightUnit || 'g'})`}
                          </span>
                          <span className="font-bold text-gray-900">
                            {formatCurrency(currentVariant?.metalPrice || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-medium text-gray-600">
                          <span>Making Charges</span>
                          <span className="font-bold text-gray-900">
                            {formatCurrency(pricingBreakdown.makingCharge)}
                          </span>
                        </div>
                        {pricingBreakdown.diamondPrice > 0 && (
                          <div className="flex justify-between items-center text-xs font-medium text-gray-600">
                            <span>Diamond / Stones</span>
                            <span className="font-bold text-gray-900">
                              {formatCurrency(pricingBreakdown.diamondPrice)}
                            </span>
                          </div>
                        )}
                        <div className="pt-4 border-t border-[#F5E6D3]/50 flex justify-between items-center">
                          <span className="text-xs font-black text-[#8E2B45] uppercase tracking-widest">
                            Subtotal (Pre-Tax)
                          </span>
                          <span className="text-sm font-black text-[#8E2B45]">
                            {formatCurrency(pricingSubtotal)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          <span>GST ({gstPercent}%)</span>
                          <span>{formatCurrency(pricingBreakdown.gst)}</span>
                        </div>
                        <div className="pt-4 border-t-2 border-dashed border-[#F5E6D3] flex justify-between items-center">
                          <span className="text-sm font-black text-black uppercase tracking-widest">
                            Grand Total
                          </span>
                          <span className="text-xl font-black text-black">
                            {formatCurrency(
                              pricingBreakdown.finalPrice || variantPrice,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-center text-gray-400 font-medium italic">
                      * Prices are subject to change based on daily metal rates
                      and final weight of the piece.
                    </p>
                  </div>
                </AccordionItem>

                <AccordionItem
                  title="Styling & Tips"
                  isOpen={openSection === "styling"}
                  onClick={() => toggleSection("styling")}
                >
                  <div className="py-4">
                    {product.stylingTips ? (
                      <div
                        className="prose prose-sm max-w-none text-gray-600 font-medium"
                        dangerouslySetInnerHTML={{
                          __html: product.stylingTips,
                        }}
                      />
                    ) : (
                      <p className="text-gray-600 font-medium leading-relaxed">
                        Pair this versatile {product.category || "jewellery"}{" "}
                        with both western and ethnic wear to elevate your look.
                        It's designed to be lightweight enough for daily wear
                        yet sophisticated enough for evening gala events.
                      </p>
                    )}
                  </div>
                </AccordionItem>

                <AccordionItem
                  title="Care Instructions"
                  isOpen={openSection === "care"}
                  onClick={() => toggleSection("care")}
                >
                  <div className="py-4">
                    {product.careTips ? (
                      <div
                        className="prose prose-sm max-w-none text-gray-600 font-medium"
                        dangerouslySetInnerHTML={{
                          __html: product.careTips,
                        }}
                      />
                    ) : (
                      <div className="space-y-6">
                        <p className="text-gray-500 font-medium">
                          To maintain the brilliance of your silver jewellery,
                          we recommend:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {[
                            {
                              icon: <Droplets className="w-4 h-4" />,
                              title: "Stay Dry",
                              desc: "Remove before showering or swimming",
                            },
                            {
                              icon: <Sparkles className="w-4 h-4" />,
                              title: "Apply First",
                              desc: "Wear after lotions and perfumes",
                            },
                            {
                              icon: <ShieldCheck className="w-4 h-4" />,
                              title: "Safe Box",
                              desc: "Store in an airtight container",
                            },
                            {
                              icon: <Smile className="w-4 h-4" />,
                              title: "Polish",
                              desc: "Use a soft micro-fibre cloth",
                            },
                          ].map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-4 p-4 rounded-xl border border-gray-50 bg-gray-50/30 hover:bg-white hover:shadow-sm transition-all"
                            >
                              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#9C5B61] border border-gray-100">
                                {item.icon}
                              </div>
                              <div>
                                <h5 className="text-[10px] font-bold text-black uppercase tracking-widest">
                                  {item.title}
                                </h5>
                                <p className="text-[10px] text-gray-400 font-medium">
                                  {item.desc}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionItem>

                <AccordionItem
                  title="Shipping & Returns"
                  isOpen={openSection === "faqs"}
                  onClick={() => toggleSection("faqs")}
                >
                  <div className="py-4 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-black uppercase tracking-widest flex items-center gap-2">
                          <Truck className="w-4 h-4 text-[#9C5B61]" />
                          Free Shipping
                        </h4>
                        <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                          We offer complimentary express shipping worldwide.
                          Domestic orders arrive within 3-5 business days.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-black uppercase tracking-widest flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-500" />
                          Returns
                        </h4>
                        <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                          {settings?.returnPolicy || "7-day Returns"} on all
                          unused and authentic products. See our returns policy
                          for details.
                        </p>
                      </div>
                    </div>

                    {product.faqs && product.faqs.length > 0 && (
                      <div className="pt-6 border-t border-gray-50 space-y-4">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                          Common Questions
                        </h4>
                        {product.faqs.map((faq, idx) => (
                          <div key={idx} className="space-y-1">
                            <p className="font-bold text-xs text-gray-900">
                              {faq.question}
                            </p>
                            <p className="text-[11px] text-gray-500 leading-relaxed">
                              {faq.answer}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </AccordionItem>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STYLE GALLERY - Refined to show always with fallbacks */}
      {galleryImages.length > 0 && (
        <div className="mt-12 mb-20 px-4 max-w-6xl mx-auto">
          <div className="flex flex-col items-center mb-10">
            <span className="text-[9px] font-bold text-[#D39A9F] uppercase tracking-[0.4em] mb-2">
              Style Showcase
            </span>
            <h2 className="text-2xl font-display font-bold text-black tracking-tight">
              Capturing the Brilliance
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 4 }).map((_, idx) => {
              const img = galleryImages[idx] || galleryImages[0];
              return (
                <div
                  key={idx}
                  className="aspect-square rounded-[2rem] overflow-hidden border border-gray-100 group cursor-pointer shadow-md hover:shadow-xl transition-all duration-700 relative bg-white"
                  onClick={() => setSelectedImage(img)}
                >
                  <img
                    src={img}
                    alt={`Style Detail ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />

                  {/* Subtle Overlay on Hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[2px]">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-500">
                      <Sparkles className="w-5 h-5 text-[#D39A9F]" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= REORDERED SECTIONS ================= */}

      <div className="mt-4 md:mt-8">
        {/* Exclusive Care Guide Section */}
        <div className="mt-8 mb-12 animate-in fade-in slide-in-from-bottom-10 duration-1000">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#FDF5F6] to-white border border-[#EBCDD0]/30 shadow-sm p-8 md:p-12">
            {/* Design Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#EBCDD0]/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#D39A9F]/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl opacity-50" />

            <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto space-y-6">
              <div className="bg-[#D39A9F] text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] shadow-sm">
                Care Guide
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-black tracking-tight leading-tight">
                Preserve the radiance of your{" "}
                <span className="text-[#D39A9F]">{product.name}</span>
              </h2>
              <p className="text-gray-600 text-sm md:text-base leading-relaxed font-sans">
                {settings.careGuideIntro ||
                  "Our jewelry is crafted with pure 925 sterling silver and premium plating. Follow these simple steps to ensure your pieces remain as stunning as the day you first wore them."}
              </p>
            </div>

            <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 relative z-10">
              {(
                settings.careGuide || [
                  {
                    icon: "Droplets",
                    title: "Stay Dry",
                    desc: "Remove before bathing or swimming to prevent tarnishing.",
                  },
                  {
                    icon: "Sparkles",
                    title: "Last Step",
                    desc: "Avoid contact with perfumes, makeup, and hairsprays.",
                  },
                  {
                    icon: "ShieldCheck",
                    title: "Safe Haven",
                    desc: "Store in individual airtight bags to minimize oxidation.",
                  },
                  {
                    icon: "Smile",
                    title: "Gentle Clean",
                    desc: "Regularly wipe with a soft cloth to restore its natural glow.",
                  },
                ]
              ).map((card, i) => {
                const IconComp = LucideIcons[card.icon] || LucideIcons.Droplets;
                return (
                  <div
                    key={i}
                    className="group bg-white/80 backdrop-blur-sm p-6 rounded-[1.5rem] border border-white shadow hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#FDF5F6] flex items-center justify-center text-[#D39A9F] mb-4 group-hover:bg-[#D39A9F] group-hover:text-white transition-colors">
                      <IconComp className="w-5 h-5 md:w-6 h-6" />
                    </div>
                    <h4 className="text-xs font-bold text-black uppercase tracking-wider mb-2 font-display">
                      {card.title}
                    </h4>
                    <p className="text-[10px] md:text-xs text-gray-500 font-medium leading-relaxed font-sans">
                      {card.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* TABBED EXPLORE SECTION (Related & Recent) */}
        <div className="flex gap-4 md:gap-10 border-b border-gray-100 mb-8 overflow-x-auto no-scrollbar">
          <button
            className={`pb-4 text-xs md:text-base font-bold uppercase tracking-[0.2em] transition-all relative whitespace-nowrap px-1 ${activeTab === "related" ? "text-black" : "text-gray-400 hover:text-gray-600"}`}
            onClick={() => setActiveTab("related")}
          >
            Related pieces
            {activeTab === "related" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-black animate-in fade-in slide-in-from-left-2 duration-300"></span>
            )}
          </button>
          <button
            className={`pb-4 text-xs md:text-base font-bold uppercase tracking-[0.2em] transition-all relative whitespace-nowrap px-1 ${activeTab === "recent" ? "text-black" : "text-gray-400 hover:text-gray-600"}`}
            onClick={() => setActiveTab("recent")}
          >
            More to explore
            {activeTab === "recent" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-black animate-in fade-in slide-in-from-left-2 duration-300"></span>
            )}
          </button>
        </div>

        {(() => {
          const categoryId =
            typeof product.category === "object"
              ? product.category?._id
              : product.category;
          const fallbackRelatedList = products
            .filter((p) => {
              const pCatId =
                typeof p.category === "object" ? p.category?._id : p.category;
              return pCatId && pCatId === categoryId && p.id !== product.id;
            })
            .slice(0, 8);

          const relatedList =
            relatedProducts.length > 0 ? relatedProducts : fallbackRelatedList;
          const recentList = products
            .filter((p) => p.id !== product.id)
            .reverse()
            .slice(0, 8);
          const displayList =
            activeTab === "related" ? relatedList : recentList;

          if (displayList.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-gray-400 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm">
                  <ShoppingBag className="w-8 h-8 opacity-30" />
                </div>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-widest">
                  No {activeTab} pieces found
                </p>
                <p className="text-[11px] text-gray-400 mt-1 max-w-xs text-center">
                  We're updating our collection daily. Check back soon for more
                  exquisite designs.
                </p>
              </div>
            );
          }

          return (
            <div className="flex overflow-x-auto gap-3 md:gap-6 pb-6 snap-x no-scrollbar">
              {displayList.map((product) => (
                <div
                  key={product.id}
                  className="min-w-[160px] w-[160px] md:min-w-[280px] md:w-[280px] snap-center"
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          );
        })()}
      </div>


      {/* Write Review Modal Overlay */}
      {isWriteReviewOpen && (
        <div className="fixed inset-0 bg-black/50 z-[120] flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-t-2xl md:rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
              <h3 className="font-display font-bold text-lg text-black">
                Write a Review
              </h3>
              <button
                onClick={() => setIsWriteReviewOpen(false)}
                className="text-gray-400 hover:text-black bg-white rounded-full p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 md:p-6">
              <div className="mb-6 rounded-xl border border-[#EBCDD0] bg-[#FDF7F8] px-4 py-3 text-xs md:text-sm text-gray-600">
                Reviews can be submitted only for delivered purchases and will
                appear after approval.
              </div>
              {/* Step Indicators */}
              <div className="flex justify-center gap-2 mb-6 md:mb-8">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${reviewStep >= step ? "bg-black" : "bg-gray-200"}`}
                  />
                ))}
              </div>

              {reviewStep === 1 && (
                <div className="text-center space-y-6">
                  <h4 className="text-lg md:text-xl font-medium text-gray-800">
                    How would you rate this product?
                  </h4>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="transition-transform hover:scale-110 focus:outline-none"
                      >
                        <Star
                          className={`w-8 h-8 md:w-10 md:h-10 ${star <= rating ? "fill-[#D39A9F] text-[#D39A9F]" : "text-gray-300"}`}
                        />
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setReviewStep(2)}
                    className="w-full bg-black text-white py-3.5 rounded-lg font-bold tracking-widest uppercase text-xs md:text-sm hover:bg-[#D39A9F] transition-all mt-4 active:scale-95 shadow-lg shadow-black/5"
                  >
                    Next
                  </button>
                </div>
              )}

              {reviewStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h4 className="text-lg font-medium text-gray-800 mb-2">
                      Show us your style!
                    </h4>
                    <p className="text-sm text-gray-500">
                      Upload photos of the product (Optional)
                    </p>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 md:p-8 flex flex-col items-center justify-center text-gray-400 hover:border-[#8D6E63] hover:text-[#8D6E63] transition-colors cursor-pointer bg-gray-50">
                    <Camera className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">
                      Click to upload photos
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setReviewStep(1)}
                      className="flex-1 px-4 py-3.5 border border-gray-300 rounded-lg text-gray-600 font-bold tracking-widest uppercase text-xs transition-all hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setReviewStep(3)}
                      className="flex-1 bg-black text-white px-4 py-3.5 rounded-lg font-bold tracking-widest uppercase text-xs md:text-sm hover:bg-[#D39A9F] transition-all active:scale-95 shadow-lg shadow-black/5"
                    >
                      Next
                    </button>
                  </div>
                  <button
                    onClick={() => setReviewStep(3)}
                    className="w-full text-center text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] hover:text-[#5D4037] mt-3 transition-colors"
                  >
                    Skip this step
                  </button>
                </div>
              )}

              {reviewStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                      Review Title
                    </label>
                    <input
                      type="text"
                      value={reviewTitle}
                      onChange={(e) => setReviewTitle(e.target.value)}
                      placeholder="Summary of your experience"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm md:text-base focus:ring-[#8D6E63] focus:border-[#8D6E63] transition-all bg-gray-50/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                      Your Review
                    </label>
                    <textarea
                      rows="4"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Tell us what you liked or disliked..."
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm md:text-base focus:ring-[#8D6E63] focus:border-[#8D6E63] resize-none transition-all bg-gray-50/30"
                    ></textarea>
                    <p className="text-[10px] text-gray-400 mt-2 italic px-1">
                      * At least one field (Rating, Title, or Comment) must be
                      provided.
                    </p>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setReviewStep(2)}
                      className="flex-1 px-4 py-3.5 border border-gray-300 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleReviewSubmit}
                      disabled={
                        !reviewTitle.trim() &&
                        !reviewComment.trim() &&
                        rating === 0
                      }
                      className={`flex-1 text-white px-4 py-3.5 rounded-lg transition-all font-bold tracking-widest uppercase text-xs md:text-sm ${!reviewTitle.trim() && !reviewComment.trim() && rating === 0 ? "bg-gray-300 cursor-not-allowed shadow-none" : "bg-black hover:bg-[#D39A9F] shadow-lg shadow-black/10"}`}
                    >
                      Submit
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Lab Grown Diamond Information Modal */}
      {isLabGrownModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 bg-[#FEF9F0] border-b border-[#F5E6CC] flex items-center justify-between sticky top-0 z-10">
              <div className="flex flex-col">
                <h3 className="font-display font-black text-xl text-[#5D4037] uppercase tracking-tight">
                  All about Lab grown diamonds
                </h3>
              </div>
              <button
                onClick={() => setIsLabGrownModalOpen(false)}
                className="bg-white/80 hover:bg-white text-gray-500 hover:text-black rounded-full p-2 shadow-sm transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto space-y-10 custom-scrollbar">
              {/* Definition Section */}
              <div className="space-y-4">
                <h4 className="text-2xl font-bold text-gray-900 leading-tight">
                  What are Lab grown diamonds?
                </h4>
                <p className="text-gray-600 leading-relaxed text-base font-sans">
                  <strong className="text-gray-900">Lab grown diamonds</strong>,
                  also known as cultured diamonds, are{" "}
                  <strong className="text-gray-900">real diamonds</strong>{" "}
                  created in a controlled laboratory environment. They are
                  identical to mined diamonds and share the same physical,
                  chemical, and optical attributes.
                </p>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#D39A9F]/20 flex items-center justify-center mt-0.5 shrink-0">
                    <Check className="w-3 h-3 text-[#D39A9F]" />
                  </div>
                  <p className="text-[13px] text-gray-500 font-medium">
                    Same chemical, physical, and optical attributes as mined
                    diamonds.
                  </p>
                </div>
              </div>

              {/* Why Choose Section */}
              <div className="space-y-6">
                <h4 className="text-2xl font-bold text-gray-900 leading-tight">
                  Why Choose Sands Lab-Grown Diamonds?
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      icon: <Droplets className="w-6 h-6" />,
                      title: "Saves Water",
                      value: "408 litres",
                      color: "bg-blue-50 text-blue-500",
                    },
                    {
                      icon: <Globe className="w-6 h-6" />,
                      title: "Saves Environment",
                      value: "100% Conflict Free",
                      color: "bg-emerald-50 text-emerald-500",
                    },
                    {
                      icon: <Zap className="w-6 h-6" />,
                      title: "Saves Energy",
                      value: "288 MJ",
                      color: "bg-amber-50 text-amber-500",
                    },
                    {
                      icon: <Users className="w-6 h-6" />,
                      title: "Saves Human life",
                      value: "Ethically Sourced",
                      color: "bg-rose-50 text-rose-500",
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col items-center text-center p-4 rounded-2xl bg-white border border-gray-100 shadow-sm transition-transform hover:-translate-y-1"
                    >
                      <div
                        className={`w-14 h-14 rounded-full ${item.color} flex items-center justify-center mb-4 shadow-inner`}
                      >
                        {item.icon}
                      </div>
                      <h5 className="text-[11px] font-black text-gray-900 uppercase tracking-wider mb-1 leading-tight">
                        {item.title}
                      </h5>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Final Assurance */}
              <div className="bg-[#FDF5F6] rounded-2xl p-6 border border-[#EBCDD0]/30 flex flex-col md:flex-row items-center gap-6">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0 border border-[#EBCDD0]/20">
                  <Sparkles className="w-10 h-10 text-[#D39A9F]" />
                </div>
                <div className="space-y-2">
                  <h5 className="font-bold text-gray-900">
                    Brilliance without compromise.
                  </h5>
                  <p className="text-[13px] text-gray-600 leading-relaxed font-sans">
                    Choosing lab-grown doesn't mean compromising on quality. It
                    means choosing a future that is sustainable, ethical, and
                    equally brilliant.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 bg-white">
              <button
                onClick={() => setIsLabGrownModalOpen(false)}
                className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#8E2424] transition-all active:scale-95"
              >
                Close & Continue
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Recently Viewed Section */}
      <RecentlyViewed />
      {/* 2. Reviews Section (Second) - With Filters & Modal */}
      <div className="mt-8 border-t border-gray-200 pt-10 animate-in fade-in slide-in-from-bottom-8 duration-700 relative pb-8 md:pb-0 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-center md:justify-between mb-8 md:mb-12 gap-6">
          <div className="flex items-center gap-3">
            <div className="flex text-[#D39A9F]">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 fill-current" />
              ))}
            </div>
            <span className="text-xl font-bold text-black flex items-center gap-1">
              {hasReviews ? `${reviewCount} Reviews` : "No reviews yet"}
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </span>
          </div>
          <div className="flex gap-3 relative w-full md:w-auto">
            <button
              onClick={() => {
                if (!user) {
                  const redirectPath = `${window.location.pathname}${window.location.search}`;
                  toast.error("Please login to write a review");
                  navigate(
                    `/login?redirect=${encodeURIComponent(redirectPath)}`,
                  );
                  return;
                }
                setIsWriteReviewOpen(true);
                setReviewStep(1);
              }}
              className="flex-1 md:flex-none bg-white border border-black px-8 py-4 rounded-xl text-xs font-bold uppercase tracking-[0.2em] text-black hover:bg-black hover:text-white transition-all duration-300 shadow-sm active:scale-95"
            >
              Write a review
            </button>
            <button
              onClick={() => setIsReviewFilterOpen(!isReviewFilterOpen)}
              className={`border border-gray-200 p-4 rounded-xl text-black hover:border-black transition-all duration-300 ${isReviewFilterOpen ? "bg-black text-white" : "bg-white shadow-sm"}`}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>

            {/* Filter Dropdown */}
            {isReviewFilterOpen && (
              <div className="absolute right-0 top-full mt-3 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl z-30 p-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-4 py-3 border-b border-gray-50 mb-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Sort Reviews By
                  </span>
                </div>
                <div className="space-y-1">
                  {[
                    "Featured",
                    "Newest",
                    "Highest Ratings",
                    "Lowest Ratings",
                  ].map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setSortBy(option);
                        setIsReviewFilterOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm rounded-xl flex justify-between items-center transition-colors ${sortBy === option ? "bg-[#FDF5F6] text-[#9C5B61] font-bold" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      {option}
                      {sortBy === option && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {sortedReviews.map((review, idx) => (
            <div
              key={idx}
              className="bg-[#FDFBF7]/30 p-6 md:p-8 rounded-[2rem] border border-gray-100/50 shadow-sm hover:shadow-md transition-all duration-500"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-gray-900 font-display">
                    {review.name}
                  </h4>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    {review.date}
                  </span>
                </div>
                <div className="flex text-[#D39A9F]">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < review.rating ? "fill-current" : "text-gray-200"} `}
                    />
                  ))}
                </div>
              </div>
              <h5 className="font-bold text-sm text-gray-800 mt-4 leading-tight">
                {review.title}
              </h5>
              <p className="text-gray-600 text-sm mt-2 leading-relaxed font-sans">
                {review.comment}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Complete the Look / Pairs Well With (Cross-selling) */}
      {relatedProducts.length > 0 && (
        <div className="bg-[#FDFBF7] border-t border-gray-100 py-20 mt-10 relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#8E2B45]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#D39A9F]/5 rounded-full blur-3xl" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-[#8E2B45] uppercase tracking-[0.4em] mb-3">
                  Elevate Your Set
                </span>
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">
                  Pairs Well With
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-[1px] w-12 md:w-24 bg-gray-200" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                  Handpicked for you
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
              {relatedProducts.slice(0, 4).map((relProduct) => (
                <div key={relProduct._id || relProduct.id} className="group">
                  <div
                    onClick={() => {
                      navigate(`/product/${relProduct._id || relProduct.id}`);
                      window.scrollTo(0, 0);
                    }}
                    className="aspect-[4/5] rounded-[2rem] overflow-hidden bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer relative"
                  >
                    <img
                      src={relProduct.images?.[0] || relProduct.primaryImage}
                      alt={relProduct.name}
                      className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />

                    {/* Quick Tag */}
                    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full shadow-sm border border-gray-50">
                      <span className="text-[8px] font-black text-gray-800 uppercase tracking-widest">
                        Matching Set
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between items-start">
                    <div className="min-w-0 flex-1 pr-2">
                      <h3 className="text-[10px] font-bold text-gray-800 uppercase tracking-widest line-clamp-1">
                        {relProduct.name}
                      </h3>
                      <p className="text-[10px] font-black text-[#8E2B45] mt-1">
                        {formatCurrency(getProductPrice(relProduct))}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          relProduct.variants &&
                          relProduct.variants.length > 0
                        ) {
                          addToCart({
                            ...relProduct,
                            selectedVariant: relProduct.variants[0],
                          });
                          toast.success(`${relProduct.name} added to bag!`);
                        } else {
                          toast.error(
                            "This product is currently out of stock.",
                          );
                        }
                      }}
                      className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-black hover:text-white hover:border-black transition-all active:scale-95 flex-shrink-0"
                      title="Add to Bag"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Size Guide Modal */}
      {isSizeGuideOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-[#8E2B45] p-8 text-white relative">
              <div className="flex items-center gap-3 mb-2">
                <Ruler className="w-6 h-6 text-amber-400" />
                <h2 className="text-2xl font-black uppercase tracking-tight">
                  Jewellery Size Guide
                </h2>
              </div>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">
                Find your perfect fit with Sands Jewels
              </p>
              <button
                onClick={() => setIsSizeGuideOpen(false)}
                className="absolute top-8 right-8 p-2 hover:bg-white/10 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto max-h-[70vh]">
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2">
                      Ring Size Chart
                    </h4>
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                      <table className="w-full text-[10px] text-left border-collapse">
                        <thead className="bg-gray-100/50 border-b border-gray-100">
                          <tr>
                            <th className="px-4 py-2 font-bold uppercase tracking-widest text-[9px]">
                              Size
                            </th>
                            <th className="px-4 py-2 font-bold uppercase tracking-widest text-[9px]">
                              Dia (mm)
                            </th>
                            <th className="px-4 py-2 font-bold uppercase tracking-widest text-[9px]">
                              Circ (mm)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {[
                            { s: "6", d: "16.5", c: "51.9" },
                            { s: "7", d: "17.3", c: "54.4" },
                            { s: "8", d: "18.1", c: "57.0" },
                            { s: "9", d: "18.9", c: "59.5" },
                            { s: "10", d: "19.8", c: "62.1" },
                            { s: "11", d: "20.6", c: "64.7" },
                            { s: "12", d: "21.4", c: "67.2" },
                          ].map((row, i) => (
                            <tr key={i} className="hover:bg-white">
                              <td className="px-4 py-2 font-black text-[#8E2B45]">
                                {row.s}
                              </td>
                              <td className="px-4 py-2 font-bold text-gray-600">
                                {row.d}
                              </td>
                              <td className="px-4 py-2 font-bold text-gray-600">
                                {row.c}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2">
                      How to measure?
                    </h4>
                    <div className="space-y-4">
                      {[
                        {
                          step: "01",
                          text: "Take a piece of string or a strip of paper.",
                        },
                        {
                          step: "02",
                          text: "Wrap it around the base of the finger.",
                        },
                        {
                          step: "03",
                          text: "Mark the point where the ends meet.",
                        },
                        {
                          step: "04",
                          text: "Measure the length in mm to find circumference.",
                        },
                      ].map((item, i) => (
                        <div
                          key={i}
                          className="flex gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                        >
                          <span className="text-sm font-black text-[#8E2B45]/10 group-hover:text-[#8E2B45]/30 transition-colors">
                            {item.step}
                          </span>
                          <p className="text-[11px] font-bold text-gray-500 leading-relaxed uppercase tracking-tight">
                            {item.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex gap-4 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-inner">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                  </div>
                  <p className="text-[10px] font-black text-amber-800 uppercase leading-relaxed tracking-[0.05em]">
                    Pro Tip: Always measure your fingers at the end of the day
                    when they are at their largest. If between sizes, choose the
                    larger one.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <ImageLightbox
        images={galleryImages}
        currentIndex={lightboxIndex}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        onPrev={handleLightboxPrev}
        onNext={handleLightboxNext}
      />

      {/* Dynamic Authenticity Popup */}
      <AnimatePresence>
        {showAuthPopup && metalType && (
          <div 
            onClick={() => setShowAuthPopup(false)}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1A1A1A]/95 text-white w-full max-w-sm rounded-[2rem] p-8 relative border border-white/10 shadow-2xl flex flex-col items-center text-center"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowAuthPopup(false)}
                className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              {/* Badge Icon */}
              {metalType === "silver" ? (
                <div className="w-14 h-14 rounded-full bg-[#8E2B45] flex items-center justify-center border border-white/20 mb-4 shadow-lg">
                  <div className="w-11 h-11 rounded-full border border-dashed border-white/40 flex flex-col items-center justify-center">
                    <span className="text-[12px] font-black tracking-tight leading-none text-white font-sans">925</span>
                  </div>
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-amber-600 flex items-center justify-center border border-white/20 mb-4 shadow-lg">
                  <div className="w-11 h-11 rounded-full border border-dashed border-white/40 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-black tracking-wider leading-none text-white font-sans">BIS</span>
                  </div>
                </div>
              )}

              {/* Title */}
              <h3 className="text-base font-bold tracking-wide uppercase mb-2 font-sans">
                {metalType === "silver" ? "Fine 925 Silver" : "BIS Hallmarked Gold"}
              </h3>

              {/* Description */}
              <p className="text-white/80 text-[11px] font-medium leading-relaxed tracking-wide font-sans">
                {metalType === "silver" 
                  ? "Get an assured 925 silver authenticity certificate with every piece of our silver jewellery."
                  : "Get government-certified BIS Hallmarked gold with complete purity assurance."}
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductDetails;
