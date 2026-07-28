import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";
import { analytics } from "../services/analytics";
import { adminService } from "../modules/admin/services/adminService";

// ─── Helpers (shared with ShopContext aggregator) ─────────────────────────────
export const normalizeVariantForCart = (
  variant = {},
  fallbackProduct = {},
) => ({
  ...variant,
  id: variant.id || variant._id,
  _id: variant._id || variant.id,
  price: Number(variant.price ?? variant.finalPrice) || 0,
  mrp: Number(variant.mrp ?? variant.finalPrice ?? variant.price) || 0,
  finalPrice: Number(variant.finalPrice ?? variant.price) || 0,
  image:
    variant.image ||
    variant.variantImages?.[0] ||
    fallbackProduct.image ||
    fallbackProduct.images?.[0] ||
    "",
  weight: variant.weight ?? fallbackProduct.weight ?? 0,
  weightUnit: variant.weightUnit || fallbackProduct.weightUnit || "Grams",
});

export const normalizeProductForCart = (
  product = {},
  selectedVariant = null,
) => {
  const normalizedVariant = selectedVariant
    ? normalizeVariantForCart(selectedVariant, product)
    : normalizeVariantForCart(product.variants?.[0] || {}, product);

  const allVariantImages = Array.isArray(product.variants)
    ? product.variants.flatMap((v) => v.variantImages || []).filter(Boolean)
    : [];

  const resolvedImage =
    product.image ||
    product.images?.[0] ||
    normalizedVariant.image ||
    normalizedVariant.variantImages?.[0] ||
    allVariantImages[0] ||
    "";

  return {
    ...product,
    id: product.id || product._id,
    _id: product._id || product.id,
    image: resolvedImage,
    images: product.images || (resolvedImage ? [resolvedImage] : []),
    price: normalizedVariant.price,
    originalPrice: normalizedVariant.mrp,
    gst: Number(normalizedVariant.gst ?? product.gst) || 0,
    finalPrice: normalizedVariant.finalPrice,
    selectedVariant: normalizedVariant,
    variantId: normalizedVariant.id || normalizedVariant._id || null,
    variants: Array.isArray(product.variants)
      ? product.variants.map((variant) =>
          normalizeVariantForCart(variant, product),
        )
      : [],
  };
};

export const resolveAvailableStock = (product = {}, variantId = null) => {
  const selected =
    product.selectedVariant &&
    (variantId == null ||
      String(product.selectedVariant.id || product.selectedVariant._id) ===
        String(variantId))
      ? product.selectedVariant
      : (product.variants || []).find(
          (variant) => String(variant.id || variant._id) === String(variantId),
        ) ||
        product.selectedVariant ||
        (product.variants || [])[0] ||
        null;

  const stock = Number(selected?.stock);
  if (Number.isFinite(stock) && stock >= 0) return stock;
  return null;
};

// ─── Context ──────────────────────────────────────────────────────────────────
const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user, logout: authLogout } = useAuth();
  const isUserRole = user?.role === "user";
  const hasAuthToken = () => Boolean(localStorage.getItem("sands_token"));

  // ── State ────────────────────────────────────────────────────────────────
  const [cart, setCart] = useState(() => {
    const saved =
      localStorage.getItem("guestCart") || localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : [];
  });

  const [coupons, setCoupons] = useState([]);
  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    const saved = localStorage.getItem("appliedCoupon");
    return saved ? JSON.parse(saved) : null;
  });
  const [couponDiscount, setCouponDiscount] = useState(() => {
    const saved = localStorage.getItem("couponDiscount");
    return saved ? Number(saved) : 0;
  });

  // ── Persistence Effects ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      localStorage.setItem("guestCart", JSON.stringify(cart));
      if (localStorage.getItem("cart")) localStorage.removeItem("cart");
    } else {
      if (user.role === "seller" || user.role === "admin") return;
      localStorage.setItem(
        `user_cart_${user.id || user._id}`,
        JSON.stringify(cart),
      );
      const items = cart.map((item) => ({
        productId: item.id || item._id,
        variantId: item.variantId,
        quantity: item.quantity,
        isGiftCard: Boolean(item.isGiftCard),
        price: Number(item.price) || 0,
        name: String(item.name || ""),
        image: String(item.image || ""),
        personalization: item.personalization || null,
      }));
      if (items.length > 0) {
        api.put("user/cart", { items }).catch(() => {});
      }
    }
  }, [cart, user]);

  useEffect(() => {
    if (appliedCoupon) {
      localStorage.setItem("appliedCoupon", JSON.stringify(appliedCoupon));
    } else {
      localStorage.removeItem("appliedCoupon");
    }
    localStorage.setItem("couponDiscount", String(couponDiscount || 0));
  }, [appliedCoupon, couponDiscount]);

  // ── fetchCart ────────────────────────────────────────────────────────────
  const fetchCart = useCallback(async () => {
    if (!isUserRole || !hasAuthToken()) return;
    try {
      const res = await api.get("user/cart");
      if (res.data.success) {
        const backendCart = res.data.data?.cart || [];
        const mappedCart = backendCart
          .map((item) => {
            if (item.isGiftCard) {
              return {
                id: item.productId,
                _id: item.productId,
                name: item.name || "Sands Gift Card",
                price: item.price,
                image: item.image,
                isGiftCard: true,
                personalization: item.personalization,
                quantity: item.quantity,
                qty: item.quantity,
                variantId: item.variantId || "GIFT_CARD_VAR",
                packId: item.variantId || "GIFT_CARD_VAR",
              };
            }
            const product = item.productId;
            if (!product) return null;
            const selectedVariant =
              product.variants?.find(
                (v) => String(v._id || v.id) === String(item.variantId),
              ) || product.variants?.[0];
            const normalized = normalizeProductForCart(
              product,
              selectedVariant,
            );
            return {
              ...normalized,
              quantity: item.quantity,
              image: normalized.image || item.image || "",
            };
          })
          .filter(Boolean);
        setCart(mappedCart);
      }
    } catch (err) {
      console.error("Fetch cart failed", err);
    }
  }, [isUserRole]);

  // ── syncGuestCart ────────────────────────────────────────────────────────
  const syncGuestCart = useCallback(async () => {
    if (!isUserRole || !hasAuthToken()) return;
    const guestCart = JSON.parse(localStorage.getItem("guestCart") || "[]");
    if (guestCart.length > 0) {
      try {
        await api.post("user/cart/sync", { guestItems: guestCart });
        localStorage.removeItem("guestCart");
      } catch (err) {
        console.error("Sync cart failed", err);
      }
    }
    fetchCart();
  }, [isUserRole, fetchCart]);

  // ── Load user cart when user logs in ───────────────────────────────────
  useEffect(() => {
    if (user) {
      // First, check if cart already has items (just added by user)
      setCart((prevCart) => {
        // If cart already has items, keep them
        if (prevCart.length > 0) {
          console.log("🛒 Cart has items, skipping backend fetch");
          return prevCart;
        }

        // If cart is empty, try to load from localStorage
        const userCartKey = `user_cart_${user.id || user._id}`;
        const userCart = localStorage.getItem(userCartKey);
        if (userCart) {
          try {
            const parsed = JSON.parse(userCart);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log(
                "📦 Loaded cart from localStorage:",
                parsed.length,
                "items",
              );
              return parsed;
            }
          } catch (e) {
            console.error("Failed to parse user cart:", e);
          }
        }

        // Otherwise keep empty cart (will fetch from backend if needed)
        return prevCart;
      });
    }
  }, [user?.id]);

  // ── addToCart ────────────────────────────────────────────────────────────
  const addToCart = useCallback((arg1, arg2, arg3) => {
    let productId,
      variantId,
      qty = 1,
      productData = null;

    if (typeof arg1 === "object") {
      if (arg1.isGiftCard) {
        productId = arg1.id;
        variantId = "GIFT_CARD_VAR";
        productData = arg1;
      } else {
        const selectedVariant =
          arg1.selectedVariant ||
          arg1.variants?.find(
            (v) =>
              (v.id || v._id) === (arg1.variantId || arg1.selectedVariantId),
          ) ||
          arg1.variants?.[0];
        productData = normalizeProductForCart(arg1, selectedVariant);
        productId = productData.id || productData._id;
        variantId = productData.variantId;
      }
    } else {
      productId = arg2;
      qty = arg3 || 1;
      productData = null;
    }

    if (!productId) {
      console.error("No product ID found in addToCart");
      return;
    }

    console.log("🛒 Adding to cart:", {
      productId,
      variantId,
      productName: productData?.name,
    });

    const requestedQty = Number.isFinite(Number(qty))
      ? Math.max(1, Number(qty))
      : 1;
    const maxStock = resolveAvailableStock(productData || {}, variantId);
    if (maxStock !== null && maxStock <= 0) {
      toast.error("This variant is out of stock");
      return;
    }

    analytics.track("add_to_cart", {
      productId,
      variantId,
      quantity: requestedQty,
      name: productData?.name,
    });
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.id === productId && item.variantId === variantId,
      );
      let newCart;

      if (existing) {
        const currentStock = resolveAvailableStock(existing, variantId);
        const limitStock = currentStock !== null ? currentStock : maxStock;
        const nextQuantity = existing.quantity + requestedQty;
        if (limitStock !== null && nextQuantity > limitStock) {
          toast.error(`Only ${limitStock} units available`);
          const cappedQty = Math.max(1, Math.min(limitStock, nextQuantity));
          newCart = prev.map((item) =>
            item.id === productId && item.variantId === variantId
              ? { ...item, quantity: cappedQty, qty: cappedQty }
              : item,
          );
        } else {
          newCart = prev.map((item) =>
            item.id === productId && item.variantId === variantId
              ? { ...item, quantity: nextQuantity, qty: nextQuantity }
              : item,
          );
        }
      } else {
        const itemBase = productData || {
          id: productId,
          name: "Product",
          price: 0,
          originalPrice: 0,
          image: "",
        };
        const finalQty =
          maxStock !== null ? Math.min(requestedQty, maxStock) : requestedQty;
        if (maxStock !== null && requestedQty > maxStock) {
          toast.error(`Only ${maxStock} units available`);
        }
        newCart = [
          ...prev,
          {
            ...itemBase,
            id: productId,
            variantId: variantId,
            packId: variantId || productId,
            gst: Number(itemBase.gst ?? itemBase.selectedVariant?.gst) || 0,
            quantity: finalQty,
            qty: finalQty,
            giftWrap: false,
            giftMessage: "",
          },
        ];
      }

      console.log("📦 Cart updated:", newCart);
      return newCart;
    });
    toast.success("Added to bag");
  }, []);

  // ── removeFromCart ───────────────────────────────────────────────────────
  const removeFromCart = useCallback((userId, productId) => {
    if (typeof userId === "object" && userId !== null) {
      const productIdToRemove = userId.productId || userId.id;
      const variantIdToRemove = userId.variantId || userId.packId || null;
      setCart((prev) =>
        prev.filter(
          (item) =>
            !(
              item.id === productIdToRemove &&
              (variantIdToRemove == null ||
                (item.variantId || item.packId) === variantIdToRemove)
            ),
        ),
      );
      return;
    }
    setCart((prev) =>
      prev.filter((item) => {
        if (!productId) {
          return (
            item.id !== userId &&
            item.packId !== userId &&
            item.variantId !== userId
          );
        }
        const matchesVariantScopedRemoval =
          item.id === userId && (item.variantId || item.packId) === productId;
        if (matchesVariantScopedRemoval) return false;
        const matchesLegacyRemoval =
          item.id === productId ||
          item.packId === productId ||
          item.variantId === productId;
        if (matchesLegacyRemoval) return false;
        return true;
      }),
    );
  }, []);

  // ── updateQuantity ───────────────────────────────────────────────────────
  const updateQuantity = useCallback((productId, amount, variantId) => {
    setCart((prev) =>
      prev.map((item) => {
        const itemVariantKey = item.variantId || item.packId || null;
        const targetVariantKey = variantId || null;
        if (
          item.id === productId &&
          (targetVariantKey === null || itemVariantKey === targetVariantKey)
        ) {
          const maxStock = resolveAvailableStock(item, itemVariantKey);
          const requestedQuantity = Math.max(1, item.quantity + amount);
          const newQuantity =
            maxStock !== null
              ? Math.min(requestedQuantity, maxStock)
              : requestedQuantity;
          if (maxStock !== null && requestedQuantity > maxStock) {
            toast.error(`Only ${maxStock} units available`);
          }
          return { ...item, quantity: newQuantity, qty: newQuantity };
        }
        return item;
      }),
    );
  }, []);

  // ── updateCartQty (legacy CartPage compat) ───────────────────────────────
  const updateCartQty = useCallback((userId, packId, newQty) => {
    setCart((prev) =>
      prev.map((item) => {
        if (
          item.packId === packId ||
          item.id === packId ||
          item.variantId === packId
        ) {
          const normalizedQty = Math.max(1, Number(newQty) || 1);
          const maxStock = resolveAvailableStock(
            item,
            item.variantId || item.packId || null,
          );
          const finalQty =
            maxStock !== null
              ? Math.min(normalizedQty, maxStock)
              : normalizedQty;
          if (maxStock !== null && normalizedQty > maxStock) {
            toast.error(`Only ${maxStock} units available`);
          }
          return { ...item, quantity: finalQty, qty: finalQty };
        }
        return item;
      }),
    );
  }, []);

  // ── clearCart ────────────────────────────────────────────────────────────
  const clearCart = useCallback(() => {
    setCart([]);
    clearAppliedCoupon();
  }, []);

  const getCart = useCallback(() => cart, [cart]);

  const toggleGiftWrap = useCallback((productId, variantId) => {
    setCart((prev) =>
      prev.map((item) => {
        const itemVariantKey = item.variantId || item.packId || null;
        const targetVariantKey =
          variantId === "default" ? null : variantId || null;
        const resolvedItemVariantKey =
          itemVariantKey === "default" ? null : itemVariantKey;
        if (
          item.id === productId &&
          (targetVariantKey === null ||
            resolvedItemVariantKey === targetVariantKey)
        ) {
          const isGiftWrap = !item.giftWrap;
          return {
            ...item,
            giftWrap: isGiftWrap,
            giftMessage: isGiftWrap ? item.giftMessage || "" : "",
          };
        }
        return item;
      }),
    );
  }, []);

  const updateGiftMessage = useCallback((productId, variantId, message) => {
    setCart((prev) =>
      prev.map((item) => {
        const itemVariantKey = item.variantId || item.packId || null;
        const targetVariantKey =
          variantId === "default" ? null : variantId || null;
        const resolvedItemVariantKey =
          itemVariantKey === "default" ? null : itemVariantKey;
        if (
          item.id === productId &&
          (targetVariantKey === null ||
            resolvedItemVariantKey === targetVariantKey)
        ) {
          return {
            ...item,
            giftMessage: String(message || "").slice(0, 200),
          };
        }
        return item;
      }),
    );
  }, []);

  // ── Coupon management ────────────────────────────────────────────────────
  const validateCoupon = useCallback(async (code, cartTotal, items) => {
    try {
      const formattedItems = (Array.isArray(items) ? items : []).map((item) => {
        const rawCategory =
          item.categoryId ||
          item.category?._id ||
          item.category?.id ||
          item.categories?.[0]?._id ||
          item.categories?.[0]?.id ||
          "";
        return {
          productId: item.productId || item.id || item._id,
          variantId:
            item.variantId ||
            item.selectedVariant?.id ||
            item.selectedVariant?._id ||
            item.id,
          quantity: item.qty || item.quantity || 1,
          price: Number(item.price || 0),
          categoryId: rawCategory ? String(rawCategory) : "",
        };
      });
      const res = await api.post("user/coupons/validate", {
        code,
        cartTotal,
        items: formattedItems,
      });
      if (res.data.success) {
        return {
          valid: true,
          discount: res.data.data.discount,
          coupon: {
            code: res.data.data.code,
            type: res.data.data.type,
            value: res.data.data.value,
            isFreeShipping: res.data.data.isFreeShipping,
          },
        };
      } else {
        return { valid: false, error: res.data.message };
      }
    } catch (err) {
      console.error("Coupon validation error:", err);
      return {
        valid: false,
        error: err.response?.data?.message || "Failed to validate coupon",
      };
    }
  }, []);

  const applyCoupon = useCallback(
    async (code, cartTotal, items) => {
      const result = await validateCoupon(code, cartTotal, items);
      if (!result.valid) return result;
      setAppliedCoupon(result.coupon);
      setCouponDiscount(result.discount || 0);
      return result;
    },
    [validateCoupon],
  );

  const clearAppliedCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
  }, []);

  const getActiveCoupons = useCallback(() => {
    return (coupons || []).filter((c) => c?.active !== false);
  }, [coupons]);

  const addCoupon = useCallback(async (couponData) => {
    const res = await adminService.createCoupon(couponData);
    if (res.success) {
      const allCoupons = await adminService.getCoupons();
      setCoupons(allCoupons);
      toast.success("Coupon created successfully");
    } else {
      toast.error(res.message);
    }
  }, []);

  const updateCoupon = useCallback(async (id, updatedData) => {
    const res = await adminService.updateCoupon(id, updatedData);
    if (res.success) {
      const allCoupons = await adminService.getCoupons();
      setCoupons(allCoupons);
      toast.success("Coupon updated successfully");
    } else {
      toast.error(res.message);
    }
  }, []);

  const deleteCoupon = useCallback(async (id) => {
    const ok = await adminService.deleteCoupon(id);
    if (ok) {
      const allCoupons = await adminService.getCoupons();
      setCoupons(allCoupons);
      toast.success("Coupon deleted successfully");
    } else {
      toast.error("Failed to delete coupon");
    }
  }, []);

  const toggleCoupon = useCallback(async (id) => {
    const res = await adminService.toggleCoupon(id);
    if (res.success) {
      const allCoupons = await adminService.getCoupons();
      setCoupons(allCoupons);
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  }, []);

  // ── normalizeShippingAddress ─────────────────────────────────────────────
  const normalizeShippingAddress = useCallback((address, currentUser) => {
    const raw = address || {};
    const fullName = String(raw.name || raw.fullName || "").trim();
    const firstName = String(
      raw.firstName || fullName.split(/\s+/)[0] || "",
    ).trim();
    const lastName = String(
      raw.lastName || fullName.split(/\s+/).slice(1).join(" ") || "",
    ).trim();
    const email = String(raw.email || currentUser?.email || "").trim();
    const phone = String(raw.phone || currentUser?.phone || "")
      .replace(/\D/g, "")
      .slice(-10);
    return {
      firstName,
      lastName,
      email,
      phone,
      flatNo: String(
        raw.flatNo || raw.flat || raw.houseNo || raw.streetAddress || "",
      ).trim(),
      area: String(raw.area || raw.locality || "").trim(),
      city: String(raw.city || "").trim(),
      district: String(raw.district || "").trim(),
      state: String(raw.state || "").trim(),
      pincode: String(raw.pincode || raw.zipCode || "")
        .replace(/[^\d]/g, "")
        .trim(),
    };
  }, []);

  // ── handleRazorpayPayment ────────────────────────────────────────────────
  const handleRazorpayPayment = useCallback(
    (rpOrder, orderData) => {
      return new Promise((resolve) => {
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: rpOrder.amount,
          currency: rpOrder.currency,
          name: "Sands Jewels",
          description: "Order Payment",
          order_id: rpOrder.id,
          handler: async (response) => {
            try {
              const verifyRes = await api.post("user/payments/verify", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderData: orderData,
              });
              if (verifyRes.data.success) {
                setCart([]);
                toast.success("Payment successful & Order placed!");
                resolve(verifyRes.data.data.order._id);
              } else {
                toast.error("Payment verification failed");
                resolve(null);
              }
            } catch (err) {
              toast.error("Verification error");
              resolve(null);
            }
          },
          prefill: {
            name: user?.name,
            email: user?.email,
            contact: user?.phone,
          },
          theme: { color: "#EBCDD0" },
          modal: {
            ondismiss: function () {
              toast.error("Payment cancelled");
              resolve(null);
            },
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      });
    },
    [user],
  );

  // ── placeOrder ───────────────────────────────────────────────────────────
  const placeOrder = useCallback(
    async (orderDetails) => {
      try {
        const {
          items,
          shippingAddress,
          paymentMethod,
          couponCode,
          addressId,
          giftCardCodes,
        } = orderDetails;

        // addresses is injected from OrderContext via prop — uses passed addresses for resolution
        const normalizedAddress = normalizeShippingAddress(
          shippingAddress,
          user,
        );

        if (
          !normalizedAddress.firstName ||
          !normalizedAddress.lastName ||
          !normalizedAddress.email
        ) {
          toast.error(
            "Please complete your name and email in the shipping address.",
          );
          return null;
        }
        if (!normalizedAddress.phone || normalizedAddress.phone.length !== 10) {
          toast.error("Please enter a valid 10-digit phone number.");
          return null;
        }
        if (
          !normalizedAddress.flatNo ||
          !normalizedAddress.city ||
          !normalizedAddress.state ||
          normalizedAddress.pincode.length !== 6
        ) {
          toast.error(
            "Please complete your shipping address (Address, City, State, Pincode).",
          );
          return null;
        }

        const formattedItems = (items || cart).map((item) => {
          const isGift =
            item.isGiftCard ||
            String(item.productId || item.id || "").startsWith("GIFT_CARD_");
          return {
            productId: item.productId || item.id || item._id,
            variantId: isGift
              ? "GIFT_CARD_VAR"
              : item.variantId ||
                item.packId ||
                item.selectedVariant?.id ||
                item.selectedVariant?._id ||
                item.variants?.[0]?.id ||
                item.variants?.[0]?._id,
            quantity: item.qty || item.quantity,
            isGiftCard: isGift,
            personalization: item.personalization || null,
            price: item.price,
            name: item.name,
            giftWrap: Boolean(item.giftWrap),
            giftMessage: item.giftWrap ? String(item.giftMessage || "") : "",
          };
        });

        if (formattedItems.some((it) => !it.productId || !it.variantId)) {
          toast.error("Some cart items are missing variant information.");
          return null;
        }

        // Razorpay flow
        if (paymentMethod === "razorpay" || paymentMethod === "online") {
          try {
            const initRes = await api.post("user/payments/initiate", {
              items: formattedItems,
              shippingAddress: normalizedAddress,
              couponCode,
              giftCardCodes: giftCardCodes || [],
            });
            if (!initRes.data.success) {
              toast.error(initRes.data.message || "Payment initiation failed");
              return null;
            }
            const { rpOrder, orderData, isZeroTotal, orderId } =
              initRes.data.data;
            if (isZeroTotal) {
              setCart([]);
              clearAppliedCoupon();
              toast.success(
                "Prepaid order confirmed via gift cards successfully!",
              );
              return orderId;
            }
            return await handleRazorpayPayment(rpOrder, orderData);
          } catch (err) {
            toast.error(
              err.response?.data?.message || "Payment initiation failed",
            );
            return null;
          }
        }

        // COD flow
        const res = await api.post("user/orders/place", {
          items: formattedItems,
          shippingAddress: normalizedAddress,
          paymentMethod,
          couponCode,
          giftCardCodes: giftCardCodes || [],
        });
        if (!res.data.success) {
          toast.error(res.data.message);
          return null;
        }
        const order = res.data?.data?.order;
        if (!order) {
          toast.error("Order response is incomplete.");
          return null;
        }
        setCart([]);
        toast.success("Order placed successfully!");
        return order._id;
      } catch (err) {
        toast.error(err.response?.data?.message || "Checkout failed");
        return null;
      }
    },
    [cart, user, normalizeShippingAddress, handleRazorpayPayment],
  );

  // ── clearAllOnAccountDelete ──────────────────────────────────────────────
  const clearCartOnDelete = useCallback(() => {
    setCart([]);
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCoupons([]);
    localStorage.removeItem("cart");
    localStorage.removeItem("appliedCoupon");
    localStorage.removeItem("couponDiscount");
  }, []);

  const value = {
    cart,
    setCart,
    coupons,
    setCoupons,
    appliedCoupon,
    couponDiscount,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateCartQty,
    clearCart,
    getCart,
    applyCoupon,
    clearAppliedCoupon,
    validateCoupon,
    getActiveCoupons,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCoupon,
    placeOrder,
    fetchCart,
    syncGuestCart,
    clearCartOnDelete,
    toggleGiftWrap,
    updateGiftMessage,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
};

export default CartContext;
