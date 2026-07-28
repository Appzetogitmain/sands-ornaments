import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useShop } from "../../../context/ShopContext";
import ProductCard from "../components/ProductCard";
import { getProductPrice, formatCurrency } from "../utils/price";
import ProductSkeleton from "../components/ProductSkeleton";
import Loader from "../../shared/components/Loader";
import api from "../../../services/api";
import { usePublicProductsQuery } from "../hooks/usePublicProductsQuery";
import CategoryHeroBanner from "../components/CategoryHeroBanner";
import {
  Filter,
  ChevronDown,
  ShoppingBag,
  SlidersHorizontal,
  ArrowLeft,
  ArrowUpDown,
} from "lucide-react";
import HorizontalFilters from "../components/HorizontalFilters";
import { useRef } from "react";

const useDragScroll = () => {
  const ref = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const onMouseDown = (e) => {
    if (!ref.current) return;
    if (
      e.target.tagName === "BUTTON" ||
      e.target.tagName === "INPUT" ||
      e.target.tagName === "SELECT" ||
      e.target.closest("button")
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
    const walkX = (x - startX) * 1.5;
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

// Local currency utility removed in favor of centralized price utility

const stableKeyFromParams = (params) => {
  const entries = Object.entries(params || {})
    .filter(([, v]) => v !== undefined && v !== null && String(v) !== "")
    .map(([k, v]) => [k, String(v)]);
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  return entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
};

const Shop = () => {
  const { products, categories, isLoading } = useShop();
  const visibleCategories = categories.filter(
    (cat) => cat.isActive !== false && cat.showInCollection !== false,
  );
  const location = useLocation();
  const navigate = useNavigate();
  const { category } = useParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [filterNewArrivals, setFilterNewArrivals] = useState(false);
  const [filterTrending, setFilterTrending] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isWebSortOpen, setIsWebSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState("Newest");
  const [priceRange, setPriceRange] = useState(50000);
  const [filteredProducts, setFilteredProducts] = useState(products || []);
  const [pageTitle, setPageTitle] = useState("All Jewellery");
  const sidebarScroll = useDragScroll();
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY <= 50) {
        setIsNavVisible(true);
      } else if (currentScrollY > lastScrollY.current) {
        setIsNavVisible(false);
      } else {
        setIsNavVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
  const queryParams = new URLSearchParams(location.search);
  const isComingSoonQuery = queryParams.get("status") === "coming-soon";
  const sourceQuery = queryParams.get("source");
  const priceMaxQuery = queryParams.get("price_max"); // upper bound â€” e.g. price_max=3000
  const priceMinQuery = queryParams.get("price_min"); // lower bound â€” e.g. price_min=1500
  const productsQuery = queryParams.get("products");
  const limitQuery = queryParams.get("limit");
  const sortQuery = queryParams.get("sort");
  const searchQuery = queryParams.get("search");
  const karatQuery = queryParams.get("karat");
  const silverTypeQuery = queryParams.get("silver_type");
  // Backwards compatibility for older links (e.g. All Type mega menu used `purity`)
  const purityQuery = queryParams.get("purity");
  const diamondTypeQuery = queryParams.get("diamondType");
  const isMenFlow = sourceQuery === "men";
  const isWomenFlow = sourceQuery === "women";

  const normalizeCategoryToken = (value) => {
    // Accept ids, slugs, or legacy values like "/category/rings" and normalize to "rings".
    let token = String(value || "").trim();
    if (!token) return "";
    token = token.replace(/^\/+/, "");
    if (token.toLowerCase().startsWith("category/")) {
      token = token.slice("category/".length);
    }
    // Don't decode object ids or plain slugs; just return the cleaned token.
    return token;
  };

  const [pinnedProducts, setPinnedProducts] = useState([]);
  const [isPinnedLoading, setIsPinnedLoading] = useState(false);

  const activeCategoryHint = useMemo(() => {
    const qp = new URLSearchParams(location.search);
    const fromQuery = normalizeCategoryToken(qp.get("category") || "");
    if (fromQuery) return fromQuery;

    const categorySlugParam = String(category || "").trim();
    const isAudienceSlug = ["men", "women", "family"].includes(
      categorySlugParam.toLowerCase(),
    );
    if (!isAudienceSlug && categorySlugParam)
      return normalizeCategoryToken(categorySlugParam);

    return "";
  }, [location.search, category]);

  const activeCategory = useMemo(() => {
    if (!activeCategoryHint) return null;
    if (!Array.isArray(categories) || categories.length === 0) return null;

    const raw = String(activeCategoryHint).trim();
    const byId = categories.find((c) => String(c?._id) === raw);
    if (byId) return byId;
    const lowered = raw.toLowerCase();
    const bySlug = categories.find(
      (c) => String(c?.slug || "").toLowerCase() === lowered,
    );
    if (bySlug) return bySlug;
    const byName = categories.find(
      (c) => String(c?.name || "").toLowerCase() === lowered,
    );
    return byName || null;
  }, [activeCategoryHint, categories]);

  const requestedPinnedIds = useMemo(() => {
    if (!productsQuery) return [];
    return String(productsQuery)
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }, [productsQuery]);

  useEffect(() => {
    const loadPinned = async () => {
      if (!productsQuery) {
        setPinnedProducts([]);
        return;
      }

      const validIds = requestedPinnedIds.filter((id) =>
        /^[a-f\\d]{24}$/i.test(id),
      );
      if (validIds.length === 0) {
        setPinnedProducts([]);
        return;
      }

      setIsPinnedLoading(true);
      try {
        const res = await api.get("public/products/by-ids", {
          params: {
            ids: validIds.join(","),
            // Pinned CMS should not silently disappear if stock is 0.
            inStockOnly: false,
          },
        });
        const list = res?.data?.data?.products || [];
        setPinnedProducts(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Failed to fetch pinned products:", err);
        setPinnedProducts([]);
      } finally {
        setIsPinnedLoading(false);
      }
    };

    loadPinned();
  }, [productsQuery, requestedPinnedIds]);

  const serverQueryParams = useMemo(() => {
    if (productsQuery) return null; // pinned-products mode uses /by-ids

    const qp = new URLSearchParams(location.search);
    const metal = qp.get("metal");
    const effectiveKarat = karatQuery || purityQuery || "";
    const effectiveCategory = normalizeCategoryToken(qp.get("category") || "");

    const categorySlugParam = String(category || "").trim();
    const isAudienceSlug = ["men", "women", "family"].includes(
      categorySlugParam.toLowerCase(),
    );
    const categoryParam =
      effectiveCategory ||
      (!isAudienceSlug ? normalizeCategoryToken(categorySlugParam) : "");

    const isNewArrivalsRoute = location.pathname.includes("/new-arrivals");
    const isTrendingRoute = location.pathname.includes("/trending");
    const explicitTags = qp.get("tags");
    const resolvedTags =
      explicitTags ||
      (isNewArrivalsRoute ? "isNewArrival" : "") ||
      (isTrendingRoute ? "isTrending" : "");

    const audienceParam = ["men", "women", "family"].includes(
      String(sourceQuery || "").toLowerCase(),
    )
      ? String(sourceQuery || "").toLowerCase()
      : "";

    const sortParam = sortQuery || "";

    const priceMin =
      priceMinQuery || qp.get("minPrice") || qp.get("priceMin") || "";
    const priceMax =
      priceMaxQuery || qp.get("maxPrice") || qp.get("priceMax") || "";

    const resolvedLimit =
      Number(String(limitQuery || "").replace(/[^0-9]/g, "")) || 60;
    const resolvedPage =
      Number(String(qp.get("page") || "").replace(/[^0-9]/g, "")) || 1;

    return {
      ...(searchQuery ? { search: searchQuery } : {}),
      ...(categoryParam ? { category: categoryParam } : {}),
      ...(metal ? { metal } : {}),
      ...(effectiveKarat ? { karat: effectiveKarat } : {}),
      ...(silverTypeQuery ? { silver_type: silverTypeQuery } : {}),
      ...(resolvedTags ? { tags: resolvedTags } : {}),
      ...(audienceParam ? { audience: audienceParam } : {}),
      ...(priceMin ? { price_min: priceMin } : {}),
      ...(priceMax ? { price_max: priceMax } : {}),
      ...(sortParam ? { sort: sortParam } : {}),
      ...(diamondTypeQuery ? { diamondType: diamondTypeQuery } : {}),
      inStockOnly: true,
      page: resolvedPage,
      limit: resolvedLimit,
    };
  }, [
    productsQuery,
    location.search,
    category,
    karatQuery,
    purityQuery,
    silverTypeQuery,
    sourceQuery,
    sortQuery,
    searchQuery,
    priceMinQuery,
    priceMaxQuery,
    limitQuery,
    location.pathname,
    diamondTypeQuery,
  ]);

  const {
    data: serverProductsPayload,
    isLoading: isServerProductsLoading,
    isError: isServerProductsError,
    error: serverProductsError,
    refetch: refetchServerProducts,
  } = usePublicProductsQuery(serverQueryParams || {}, {
    enabled: Boolean(serverQueryParams),
  });

  const serverProducts = serverProductsPayload?.products || [];
  const canUseServerProducts =
    Boolean(serverQueryParams) &&
    !isServerProductsLoading &&
    !isServerProductsError;
  const serverPagination = serverProductsPayload?.pagination || null;
  const serverModeEnabled = Boolean(serverQueryParams) && !productsQuery;
  const currentServerPage =
    Number(String(queryParams.get("page") || "1").replace(/[^0-9]/g, "")) || 1;
  const [serverAccumulatedProducts, setServerAccumulatedProducts] = useState(
    [],
  );

  const serverFilterKey = useMemo(() => {
    if (!serverQueryParams) return "";
    const { page: _page, ...rest } = serverQueryParams;
    return stableKeyFromParams(rest);
  }, [serverQueryParams]);

  useEffect(() => {
    if (!serverModeEnabled) return;
    setServerAccumulatedProducts([]);
    if (currentServerPage !== 1) {
      updateShopQuery({ page: 1 });
    }
    // Intentionally ignore updateShopQuery in deps to avoid loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverFilterKey, serverModeEnabled]);

  useEffect(() => {
    if (!serverModeEnabled) return;
    if (!canUseServerProducts) return;

    setServerAccumulatedProducts((prev) => {
      const incoming = Array.isArray(serverProducts) ? serverProducts : [];
      if (currentServerPage <= 1) return incoming;

      const map = new Map(
        (prev || []).map((p) => [String(p?.id || p?._id), p]),
      );
      incoming.forEach((p) => {
        const key = String(p?.id || p?._id);
        if (key && !map.has(key)) map.set(key, p);
      });
      return Array.from(map.values());
    });
  }, [
    serverModeEnabled,
    canUseServerProducts,
    serverProducts,
    currentServerPage,
  ]);

  const productsToRender = useMemo(() => {
    if (productsQuery) return pinnedProducts;
    if (serverModeEnabled) {
      if (serverAccumulatedProducts.length > 0)
        return serverAccumulatedProducts;
      return serverProducts;
    }
    return filteredProducts;
  }, [
    productsQuery,
    pinnedProducts,
    serverModeEnabled,
    serverAccumulatedProducts,
    serverProducts,
    filteredProducts,
  ]);

  useEffect(() => {
    // Use a local flag to avoid multiple updates in the same cycle
    let isCancelled = false;

    const categoryQuery = queryParams.get("category");
    const parsedPrice = Number(
      String(priceMaxQuery || "").replace(/[^0-9]/g, ""),
    );

    if (categoryQuery) {
      const categoryFromQuery = categories.find(
        (c) =>
          c._id === categoryQuery ||
          c.id === categoryQuery ||
          c.slug === categoryQuery ||
          c.path === categoryQuery ||
          c.name === categoryQuery,
      );
      if (categoryFromQuery && selectedCategory !== categoryFromQuery.name) {
        if (!isCancelled) setSelectedCategory(categoryFromQuery.name);
      }
    } else if (selectedCategory !== "All") {
      if (!isCancelled) setSelectedCategory("All");
    }

    const isNewArrivals = location.pathname === "/new-arrivals";
    if (filterNewArrivals !== isNewArrivals) {
      if (!isCancelled) setFilterNewArrivals(isNewArrivals);
    }

    const isTrending = location.pathname === "/trending";
    if (filterTrending !== isTrending) {
      if (!isCancelled) setFilterTrending(isTrending);
    }

    if (sortQuery === "most-sold" && sortBy !== "Best Selling") {
      if (!isCancelled) setSortBy("Best Selling");
    } else if (sortQuery === "latest" && sortBy !== "Newest") {
      if (!isCancelled) setSortBy("Newest");
    } else if (sortQuery === "price-asc" && sortBy !== "Price: Low to High") {
      if (!isCancelled) setSortBy("Price: Low to High");
    } else if (sortQuery === "price-desc" && sortBy !== "Price: High to Low") {
      if (!isCancelled) setSortBy("Price: High to Low");
    }

    if (Number.isFinite(parsedPrice) && parsedPrice > 0) {
      if (priceRange !== parsedPrice) {
        if (!isCancelled) setPriceRange(parsedPrice);
      }
    } else if (priceRange !== 50000) {
      if (!isCancelled) setPriceRange(50000);
    }

    return () => {
      isCancelled = true;
    };
  }, [
    location.search,
    location.pathname,
    categories,
    selectedCategory,
    filterNewArrivals,
    filterTrending,
    sortBy,
    priceRange,
  ]);

  useEffect(() => {
    if (isFilterOpen || isSortOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isFilterOpen, isSortOpen]);

  const normalizeAudience = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();
  const getProductAudience = (product) => {
    const list = Array.isArray(product?.audience) ? product.audience : [];
    if (list.length === 0) return ["unisex"];
    return list.map(normalizeAudience).filter(Boolean);
  };
  const matchesAudienceScope = (product) => {
    if (!isMenFlow && !isWomenFlow) return true;
    const audience = getProductAudience(product);
    if (audience.includes("unisex")) return true;
    if (isMenFlow) return audience.includes("men");
    if (isWomenFlow) return audience.includes("women");
    return true;
  };

  const updateShopQuery = (updates = {}, pathOverride = location.pathname) => {
    const params = new URLSearchParams(location.search);

    Object.entries(updates).forEach(([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        value === "" ||
        value === false ||
        value === "All"
      ) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    const nextSearch = params.toString();
    navigate(`${pathOverride}${nextSearch ? `?${nextSearch}` : ""}`, {
      replace: true,
    });
  };

  // Effect to handle URL-based Logic + Local Category Filter
  useEffect(() => {
    const path = location.pathname;
    const categoryQuery = queryParams.get("category");
    const metalQuery = queryParams.get("metal");

    let baseProducts = products;
    let title = "All Jewellery";

    // Use centralized price utility
    const getProductCreatedAt = (product) => {
      const ts = product?.createdAt || product?.updatedAt || "";
      const date = ts ? new Date(ts).getTime() : 0;
      if (date) return date;
      const id = String(product?._id || product?.id || "");
      return id ? parseInt(id.substring(0, 8), 16) || 0 : 0;
    };
    const getProductSold = (product) => {
      if (!product) return 0;
      if (Number.isFinite(product.sold)) return product.sold;
      const variantSold = (product.variants || []).reduce(
        (sum, v) => sum + (v.sold || 0),
        0,
      );
      return Number.isFinite(variantSold) ? variantSold : 0;
    };
    const shuffleArray = (arr) => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const categoryQueryObj = categoryQuery
      ? categories.find(
          (c) =>
            c._id === categoryQuery ||
            c.id === categoryQuery ||
            c.name === categoryQuery ||
            c.slug === categoryQuery ||
            c.path === categoryQuery,
        ) || null
      : null;

    const matchesCategory = (product, value, cat) => {
      if (!value && !cat) return true;
      const valueStr = value ? String(value) : "";
      const valueLower = valueStr.toLowerCase();
      const productCategory = product.category || "";
      const productCategorySlug = product.categorySlug || "";
      const productCategoryId = product.categoryId || product.category_id || "";
      const catId = cat?._id || cat?.id || "";
      const catName = cat?.name || "";
      const catSlug = cat?.path || cat?.slug || "";
      const navCategoryIds = (product.navShopByCategory || []).map((id) =>
        String(id),
      );

      if (
        productCategoryId &&
        valueStr &&
        String(productCategoryId) === valueStr
      )
        return true;
      if (
        productCategoryId &&
        catId &&
        String(productCategoryId) === String(catId)
      )
        return true;
      if (valueStr && navCategoryIds.includes(valueStr)) return true;
      if (catId && navCategoryIds.includes(String(catId))) return true;
      if (
        productCategory &&
        valueLower &&
        productCategory.toLowerCase() === valueLower
      )
        return true;
      if (
        productCategorySlug &&
        valueLower &&
        productCategorySlug.toLowerCase() === valueLower
      )
        return true;
      if (productCategory && catName && productCategory === catName)
        return true;
      if (
        productCategory &&
        catSlug &&
        productCategory.toLowerCase() === catSlug.toLowerCase()
      )
        return true;
      if (
        productCategorySlug &&
        catSlug &&
        productCategorySlug.toLowerCase() === catSlug.toLowerCase()
      )
        return true;

      return false;
    };
    const getProductMetal = (product) => {
      const material = String(product?.material || "").trim();
      if (material) return material;
      return product.metal;
    };
    const normalizeSilverTier = (value) => {
      const normalized = String(value || "")
        .trim()
        .toLowerCase();
      if (!normalized) return null;
      if (
        normalized === "925" ||
        normalized.startsWith("925 ") ||
        normalized.includes("sterling")
      )
        return "sterling";
      if (normalized.includes("fine")) return "fine";
      // Treat all other silver categories (800/835/958/970/990/999 etc) as fine for filtering.
      return "fine";
    };
    const normalizeGoldKarat = (value) => {
      const normalized = String(value || "")
        .trim()
        .toLowerCase();
      if (!normalized) return null;
      // Accept: "24", "24k", "24 k", etc.
      const digits = normalized.replace(/[^0-9]/g, "");
      return digits || null;
    };

    const effectiveKarat = normalizeGoldKarat(
      karatQuery ||
        (purityQuery && String(purityQuery).toLowerCase().includes("k")
          ? purityQuery
          : ""),
    );
    const effectiveSilverType = (() => {
      if (silverTypeQuery) return normalizeSilverTier(silverTypeQuery);
      if (!purityQuery) return null;
      const normalized = String(purityQuery).trim().toLowerCase();
      if (normalized === "925" || normalized.includes("sterling"))
        return "sterling";
      if (normalized.includes("fine")) return "fine";
      return null;
    })();

    const matchesPurityTier = (product) => {
      if (metalQuery?.toLowerCase() === "gold" && effectiveKarat) {
        return String(product.goldCategory || "") === String(effectiveKarat);
      }
      if (metalQuery?.toLowerCase() === "silver" && effectiveSilverType) {
        const productTier =
          normalizeSilverTier(product.silverCategory) || "fine";
        if (effectiveSilverType === "sterling")
          return productTier === "sterling";
        if (effectiveSilverType === "fine") return productTier !== "sterling";
        return true;
      }
      return true;
    };

    // 1. Determine Base Products & Title from URL
    if (path === "/new-arrivals") {
      title = "New Arrivals";
      baseProducts = products.filter((p) => p.isNew);
    } else if (path === "/trending") {
      title = "Trending Now";
      baseProducts = products.filter((p) => p.rating >= 4.5);
    } else if (metalQuery) {
      title = `${metalQuery.charAt(0).toUpperCase() + metalQuery.slice(1)} Collection`;
      baseProducts = products.filter((p) => {
        const metal = getProductMetal(p);
        return metal?.toLowerCase() === metalQuery.toLowerCase();
      });
      if (metalQuery?.toLowerCase() === "gold" && effectiveKarat) {
        title = `${effectiveKarat}K Gold`;
      } else if (
        metalQuery?.toLowerCase() === "silver" &&
        effectiveSilverType
      ) {
        title =
          metalQuery.toLowerCase() === "silver"
            ? effectiveSilverType === "sterling"
              ? "925 Sterling Silver"
              : "Fine Silver"
            : title;
      }
    } else if (category) {
      const currentCat = categories.find(
        (c) => c.path === category || c.slug === category,
      );
      title = currentCat
        ? currentCat.name
        : category.charAt(0).toUpperCase() + category.slice(1);
      baseProducts = products.filter((p) =>
        matchesCategory(p, category, currentCat),
      );
    }

    if (metalQuery && (effectiveKarat || effectiveSilverType)) {
      baseProducts = baseProducts.filter(matchesPurityTier);
    }

    if (categoryQuery) {
      baseProducts = baseProducts.filter((p) =>
        matchesCategory(p, categoryQuery, categoryQueryObj),
      );
      if (!title || title === "All Jewellery" || title === "Men's Jewellery" || title === "Women's Jewellery") {
        let prefix = "";
        if (isMenFlow) prefix = "Men's ";
        else if (isWomenFlow) prefix = "Women's ";
        const catName = categoryQueryObj ? categoryQueryObj.name : categoryQuery.charAt(0).toUpperCase() + categoryQuery.slice(1);
        title = `${prefix}${catName}`;
      }
    }

    if (priceMaxQuery && priceMinQuery) {
      const parsedMin = Number(String(priceMinQuery).replace(/[^0-9]/g, ""));
      const parsedMax = Number(String(priceMaxQuery).replace(/[^0-9]/g, ""));
      title = `₹${parsedMin.toLocaleString("en-IN")} – ₹${parsedMax.toLocaleString("en-IN")}`;
    } else if (priceMaxQuery) {
      const parsedPrice = Number(String(priceMaxQuery).replace(/[^0-9]/g, ""));
      title = `Under ₹${parsedPrice.toLocaleString("en-IN")}`;
    } else if (priceMinQuery) {
      const parsedMin = Number(String(priceMinQuery).replace(/[^0-9]/g, ""));
      title = `Above ₹${parsedMin.toLocaleString("en-IN")}`;
    }
    if (productsQuery) {
      if (pinnedProducts.length > 0) {
        baseProducts = pinnedProducts;
        title = "Perfect Gift";
      } else {
        const ids = String(productsQuery)
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
        if (ids.length > 0) {
          baseProducts = baseProducts.filter((p) =>
            ids.includes(String(p._id || p.id)),
          );
          title = "Perfect Gift";
        }
      }
    }
    if (sortQuery === "latest") {
      title = selectedCategory !== "All" ? selectedCategory : "Latest Drop";
    }
    if (sortQuery === "most-sold") {
      title = selectedCategory !== "All" ? selectedCategory : "Most Gifted";
    }
    if (sortQuery === "random") {
      title = selectedCategory !== "All" ? selectedCategory : "Curated For You";
    }
    if (searchQuery) {
      title = `Search: ${searchQuery}`;
    }

    // Apply Title overrides from Local Filters
    if (selectedCategory !== "All") {
      title = selectedCategory;
    } else if (filterNewArrivals && path === "/shop") {
      title = "Just Arrived";
    } else if (filterTrending && path === "/shop") {
      title = "Trending Now";
    }

    if (pageTitle !== title) {
      setPageTitle(title);
    }

    if (canUseServerProducts) {
      // Only update if the length or first item changed (simple stability check)
      if (
        filteredProducts.length !== serverProducts.length ||
        filteredProducts[0]?.id !== serverProducts[0]?.id
      ) {
        setFilteredProducts(serverProducts);
      }
      return;
    }

    let result = baseProducts;

    // Enforce men/women audience scope when coming from those landing pages.
    result = result.filter(matchesAudienceScope);

    // 2. Apply Local Category Filter (if selected)
    if (selectedCategory !== "All") {
      const selectedCat = categories.find(
        (c) =>
          c.name === selectedCategory ||
          c.slug === selectedCategory ||
          c.path === selectedCategory,
      );
      result = result.filter((p) =>
        matchesCategory(p, selectedCategory, selectedCat),
      );
    }

    if (searchQuery) {
      const normalizedSearch = String(searchQuery).trim().toLowerCase();
      result = result.filter((product) => {
        const haystack = [
          product.name,
          product.description,
          product.shortDescription,
          product.category,
          product.categorySlug,
          ...(product.tags || []),
          ...(product.variants || []).map((variant) => variant.name),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      });
    }

    // 2.2 Apply Collection Filters
    if (filterNewArrivals) {
      result = result.filter((p) => p.isNew);
    }
    if (filterTrending) {
      result = result.filter((p) => p.rating >= 4.5);
    }

    // 3. Apply Price Filter
    // URL-driven range filters (price_min / price_max) take priority over slider
    const urlPriceMax = priceMaxQuery
      ? Number(String(priceMaxQuery).replace(/[^0-9]/g, ""))
      : null;
    const urlPriceMin = priceMinQuery
      ? Number(String(priceMinQuery).replace(/[^0-9]/g, ""))
      : null;

    if (urlPriceMax && Number.isFinite(urlPriceMax) && urlPriceMax > 0) {
      result = result.filter((p) => getProductPrice(p) <= urlPriceMax);
    } else {
      // Fall back to local slider state
      result = result.filter((p) => getProductPrice(p) <= priceRange);
    }
    if (urlPriceMin && Number.isFinite(urlPriceMin) && urlPriceMin > 0) {
      result = result.filter((p) => getProductPrice(p) >= urlPriceMin);
    }

    // 4. Apply Sorting
    if (sortQuery === "latest") {
      result.sort((a, b) => getProductCreatedAt(b) - getProductCreatedAt(a));
    } else if (sortQuery === "most-sold") {
      result.sort((a, b) => getProductSold(b) - getProductSold(a));
    } else if (sortQuery === "random") {
      result = shuffleArray(result);
    } else if (sortBy === "Price: Low to High") {
      result.sort((a, b) => getProductPrice(a) - getProductPrice(b));
    } else if (sortBy === "Price: High to Low") {
      result.sort((a, b) => getProductPrice(b) - getProductPrice(a));
    } else if (sortBy === "Best Selling") {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "Newest") {
      result.sort((a, b) => {
        const dateDiff = getProductCreatedAt(b) - getProductCreatedAt(a);
        if (dateDiff !== 0) return dateDiff;
        if (Boolean(b.isNew) !== Boolean(a.isNew)) return b.isNew ? 1 : -1;
        return 0;
      });
    }

    // 5. Apply Limit (query)
    if (limitQuery) {
      const parsedLimit = Number(String(limitQuery).replace(/[^0-9]/g, ""));
      if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
        result = result.slice(0, parsedLimit);
      }
    }

    // Only update filteredProducts if the results have actually changed
    const hasChanged =
      result.length !== filteredProducts.length ||
      (result.length > 0 && result[0]?.id !== filteredProducts[0]?.id);

    if (hasChanged) {
      setFilteredProducts(result);
    }
  }, [
    location,
    category,
    selectedCategory,
    priceRange,
    filterNewArrivals,
    filterTrending,
    sortBy,
    categories,
    products,
    canUseServerProducts,
    serverProducts,
    productsQuery,
  ]);

  useEffect(() => {
    const metal = String(queryParams.get("metal") || "")
      .trim()
      .toLowerCase();
    const suffix =
      metal === "gold"
        ? "Gold Jewellery"
        : metal === "silver"
          ? "Silver Jewellery"
          : "Jewellery";
    document.title = `${pageTitle} | Sands Jewels - ${suffix}`;
  }, [pageTitle]);

  // Handle Category Change
  const handleCategoryChange = (val) => {
    setSelectedCategory(val);
    const selectedCat = categories.find((cat) => cat.name === val);
    const normalizedFromCat = normalizeCategoryToken(
      selectedCat?.slug || selectedCat?.path || "",
    );
    const nextCategoryValue =
      selectedCat?._id ||
      selectedCat?.id ||
      normalizedFromCat ||
      normalizeCategoryToken(val);
    updateShopQuery({
      category: val === "All" ? null : nextCategoryValue,
    });
  };

  const handleSortChange = (option) => {
    setSortBy(option);
    const sortMap = {
      Newest: "latest",
      "Best Selling": "most-sold",
      "Price: Low to High": "priceLtoH",
      "Price: High to Low": "priceHtoL",
    };
    updateShopQuery({ sort: sortMap[option] || null });
  };

  const handlePriceRangeChange = (value) => {
    const nextValue = Number(value);
    setPriceRange(nextValue);
    updateShopQuery({ price_max: nextValue >= 50000 ? null : nextValue });
  };

  const handleCollectionToggle = (type, checked) => {
    if (type === "new-arrivals") {
      if (checked) {
        setFilterNewArrivals(true);
        setFilterTrending(false);
        navigate(`/new-arrivals${location.search || ""}`, { replace: true });
      } else {
        setFilterNewArrivals(false);
        navigate(`/shop${location.search || ""}`, { replace: true });
      }
      return;
    }

    if (type === "trending") {
      if (checked) {
        setFilterTrending(true);
        setFilterNewArrivals(false);
        navigate(`/trending${location.search || ""}`, { replace: true });
      } else {
        setFilterTrending(false);
        navigate(`/shop${location.search || ""}`, { replace: true });
      }
    }
  };

  const handleAudienceChange = (val) => {
    updateShopQuery({ source: val === "all" ? null : val });
  };

  const handleMetalChange = (val) => {
    updateShopQuery({
      metal: val === "All" ? null : val.toLowerCase(),
      karat: null,
      silver_type: null,
      purity: null,
    });
  };

  const handleDiamondTypeChange = (val) => {
    updateShopQuery({ diamondType: val === "All" ? null : val });
  };

  const handleTagsChange = (val) => {
    const currentTags =
      queryParams.get("tags")?.split(",").filter(Boolean) || [];
    let nextTags;
    if (currentTags.includes(val)) {
      nextTags = currentTags.filter((t) => t !== val);
    } else {
      nextTags = [...currentTags, val];
    }
    updateShopQuery({ tags: nextTags.length > 0 ? nextTags.join(",") : null });
  };

  const clearAllFilters = () => {
    setSelectedCategory("All");
    setFilterNewArrivals(false);
    setFilterTrending(false);
    setPriceRange(50000);
    setSortBy("Newest");
    navigate("/shop");
  };

  return (
    <div className="bg-white min-h-screen relative">
      {!productsQuery && isServerProductsError && (
        <div className="mx-auto max-w-[1450px] px-4 pt-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="font-bold">
                Product list is using cached fallback data.
              </span>{" "}
              <span className="opacity-80">
                {serverProductsError?.response?.data?.message ||
                  serverProductsError?.message ||
                  ""}
              </span>
            </div>
            <button
              type="button"
              onClick={() => refetchServerProducts()}
              className="shrink-0 rounded-lg bg-[#3E2723] px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white hover:opacity-95"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      <div className="container mx-auto px-4 md:px-6 pb-32 md:pb-8">
        {activeCategory && <CategoryHeroBanner category={activeCategory} />}
        {/* Sticky Header & Filters Container */}
        <div
          className={`sticky z-[100] bg-white transition-all duration-300 ${isNavVisible ? "top-[50px] md:top-[141px]" : "top-0"}`}
        >
          {/* Header Section - Back Left, Title Center, Items Right */}
          <div className="py-2 md:py-3 flex flex-row justify-between items-center gap-2 md:gap-4 border-b border-[#EBCDD0] px-4 md:px-0">
            {/* Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-black hover:text-[#9C3D5E] transition-all group font-bold uppercase tracking-wide text-[10px] md:text-xs shrink-0 min-w-[50px]"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              Back
            </button>

            {/* Title - Center */}
            <div className="text-center flex-1 mx-1 overflow-hidden">
              <h1 className="text-base md:text-xl font-sans font-bold text-gray-800 leading-tight truncate">
                {pageTitle}
              </h1>
            </div>


            {/* Mobile Actions */}
            <div className="flex md:hidden items-center gap-1.5 shrink-0">
              <button
                onClick={() => setIsSortOpen(true)}
                className="p-1 border border-[#EBCDD0] rounded-md text-black hover:bg-[#EBCDD0] transition-all"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsFilterOpen(true)}
                className="flex items-center gap-1 bg-[#9C3D5E] text-white px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider"
              >
                <Filter className="w-3 h-3" />
                Filter
              </button>
            </div>
          </div>

          {/* Horizontal Desktop Filters - SANDS Premium Style */}
          <HorizontalFilters
            categories={visibleCategories}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            priceRange={priceRange}
            onPriceChange={handlePriceRangeChange}
            audience={queryParams.get("source") || "All"}
            onAudienceChange={handleAudienceChange}
            metal={
              queryParams.get("metal")?.charAt(0).toUpperCase() +
                queryParams.get("metal")?.slice(1) || "All"
            }
            onMetalChange={handleMetalChange}
            diamondType={diamondTypeQuery || "All"}
            onDiamondTypeChange={handleDiamondTypeChange}
            tags={queryParams.get("tags")?.split(",").filter(Boolean) || []}
            onTagsChange={handleTagsChange}
            sortBy={sortBy}
            onSortChange={handleSortChange}
            clearAll={clearAllFilters}
          />
        </div>

        {/* Product Grid */}
        {isLoading ||
        isPinnedLoading ||
        (!productsQuery &&
          isServerProductsLoading &&
          productsToRender.length === 0) ? (
          <div className="flex items-center justify-center py-20">
            <Loader fullPage={false} />
          </div>
        ) : (
          (() => {
            const isComingSoon = isComingSoonQuery;

            if (isComingSoon) {
              return (
                <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in zoom-in duration-500">
                  <div className="w-20 h-20 bg-[#D39A9F]/10 rounded-full flex items-center justify-center mb-6">
                    <ShoppingBag className="w-10 h-10 text-[#D39A9F]" />
                  </div>
                  <h3 className="text-3xl font-serif text-black mb-3 italic">
                    Coming Soon
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto mb-8">
                    We're currently handcrafting new exquisite designs for{" "}
                    <span className="text-black font-semibold">
                      {selectedCategory}
                    </span>
                    . Stay tuned!
                  </p>
                  <button
                    onClick={clearAllFilters}
                    className="bg-black text-white px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#D39A9F] transition-all shadow-lg"
                  >
                    Explore Other Collections
                  </button>
                </div>
              );
            }

            if (productsToRender.length > 0) {
              return (
                <div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-8 gap-y-8 md:gap-y-12">
                    {productsToRender.map((product) => (
                      <ProductCard
                        key={product.id || product._id}
                        product={product}
                      />
                    ))}
                  </div>

                  {serverModeEnabled &&
                    serverPagination &&
                    Number(serverPagination.page) <
                      Number(serverPagination.pages) && (
                      <div className="mt-10 flex justify-center">
                        <button
                          type="button"
                          onClick={() =>
                            updateShopQuery({ page: currentServerPage + 1 })
                          }
                          disabled={isServerProductsLoading}
                          className="rounded-full bg-black text-white px-8 py-3 text-xs font-black uppercase tracking-widest hover:bg-[#D39A9F] transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isServerProductsLoading ? "Loading..." : "Load More"}
                        </button>
                      </div>
                    )}
                </div>
              );
            }

            return (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <h3 className="text-2xl font-serif text-black mb-2">
                  No products found
                </h3>
                <p className="text-gray-500">
                  Try adjusting your filters to find your perfect match.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#D39A9F] hover:underline"
                >
                  <SlidersHorizontal className="w-4 h-4" /> Clear all filters
                </button>
              </div>
            );
          })()
        )}
      </div>

      {/* Mobile Bottom Action Bar (Nykaa Style) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md z-[70] border-t border-[#EBCDD0] flex h-16 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] pb-safe transition-all duration-300">
        {/* Sort Button (Custom Sheet Trigger) */}
        <div
          onClick={() => setIsSortOpen(true)}
          className="flex-1 border-r border-[#EBCDD0]/50 relative flex flex-col items-center justify-center active:bg-[#FDF5F6] cursor-pointer py-2"
        >
          <span className="text-black font-black text-[11px] uppercase tracking-widest flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#8E2B45]" /> Sort by
          </span>
          <span className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-tighter">
            {sortBy}
          </span>
        </div>

        {/* Filter Button */}
        <button
          onClick={() => setIsFilterOpen(true)}
          className="flex-1 flex flex-col items-center justify-center active:bg-[#FDF5F6] py-2 transition-colors"
        >
          <span className="text-black font-black text-[11px] uppercase tracking-widest flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#8E2B45]" /> Filter
          </span>
          <span className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-tighter">
            {selectedCategory !== "All" ||
            filterNewArrivals ||
            filterTrending ||
            priceRange < 50000 ||
            !!searchQuery
              ? "Filters applied"
              : "No filter applied"}
          </span>
        </button>
      </div>

      {/* Filter Sidebar Drawer */}
      {/* Overlay */}
      {isFilterOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[200] backdrop-blur-sm transition-opacity"
          onClick={() => setIsFilterOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-[320px] bg-white z-[210] shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-[#EBCDD0] ${isFilterOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#EBCDD0]">
            <h3 className="text-xl font-serif text-black">Filters</h3>
            <button
              onClick={() => setIsFilterOpen(false)}
              className="text-gray-400 hover:text-black"
            >
              <ChevronDown className="w-6 h-6 rotate-90" />{" "}
              {/* Using Chevron as Close Icon approximation or could import X */}
            </button>
          </div>

          <div
            {...sidebarScroll.events}
            ref={sidebarScroll.ref}
            className={`p-6 flex-1 overflow-y-auto space-y-10 custom-scrollbar overscroll-contain ${sidebarScroll.isDragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
          >
            {/* 1. Category Filter */}
            <section>
              <h4 className="font-bold text-black text-[11px] uppercase tracking-[0.2em] mb-5">
                Category
              </h4>
              <div className="flex flex-col gap-3">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="category"
                    value="All"
                    checked={selectedCategory === "All"}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="form-radio text-black focus:ring-[#D39A9F] h-4 w-4 border-gray-300"
                  />
                  <span
                    className={`text-[13px] transition-all ${selectedCategory === "All" ? "text-black font-bold underline underline-offset-4 decoration-[#D39A9F]" : "text-gray-500 group-hover:text-black"}`}
                  >
                    All Jewellery
                  </span>
                </label>
                {visibleCategories.map((cat) => (
                  <label
                    key={cat.id}
                    className="flex items-center space-x-3 cursor-pointer group"
                  >
                    <input
                      type="radio"
                      name="category"
                      value={cat.name}
                      checked={selectedCategory === cat.name}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="form-radio text-black focus:ring-[#D39A9F] h-4 w-4 border-gray-300"
                    />
                    <span
                      className={`text-[13px] transition-all ${selectedCategory === cat.name ? "text-black font-bold underline underline-offset-4 decoration-[#D39A9F]" : "text-gray-500 group-hover:text-black"}`}
                    >
                      {cat.name}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {/* 2. Price Range Filter */}
            <section className="pt-8 border-t border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h4 className="font-bold text-black text-[11px] uppercase tracking-[0.2em]">
                  Price Range
                </h4>
                <span className="text-[10px] font-black text-[#8E2B45] bg-[#8E2B45]/5 px-2 py-0.5 rounded uppercase tracking-widest">
                  {priceRange >= 50000
                    ? "Any Price"
                    : `Under ${formatCurrency(priceRange)}`}
                </span>
              </div>
              <div className="px-1">
                <input
                  type="range"
                  min="1000"
                  max="50000"
                  step="1000"
                  value={priceRange}
                  onChange={(e) => handlePriceRangeChange(e.target.value)}
                  className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#8E2B45]"
                />
                <div className="flex justify-between mt-4">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                    ₹1,000
                  </span>
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                    ₹50,000+
                  </span>
                </div>
              </div>
            </section>

            {/* 3. Metal Type Filter */}
            <section className="pt-8 border-t border-gray-100">
              <h4 className="font-bold text-black text-[11px] uppercase tracking-[0.2em] mb-5">
                Metal Type
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "silver", label: "Silver" },
                  { id: "gold", label: "Gold" },
                ].map((m) => {
                  const isActive = queryParams.get("metal") === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() =>
                        updateShopQuery({ metal: isActive ? null : m.id })
                      }
                      className={`px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] border transition-all rounded-lg ${isActive ? "bg-black text-white border-black shadow-md scale-[1.02]" : "bg-white text-gray-500 border-gray-100 hover:border-black"}`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 4. Purity / Karat Filter */}
            <section className="pt-8 border-t border-gray-100 pb-4">
              <h4 className="font-bold text-black text-[11px] uppercase tracking-[0.2em] mb-5">
                Purity / Karat
              </h4>
              <div className="flex flex-wrap gap-2.5">
                {["925", "14k", "18k", "22k"].map((k) => {
                  const currentK =
                    queryParams.get("karat") || queryParams.get("purity");
                  const isActive = currentK === k;
                  return (
                    <button
                      key={k}
                      onClick={() =>
                        updateShopQuery({
                          karat: isActive ? null : k,
                          purity: null,
                        })
                      }
                      className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest border transition-all rounded-full ${isActive ? "bg-[#8E2B45] text-white border-[#8E2B45] shadow-sm" : "bg-gray-50 text-gray-400 border-transparent hover:border-[#8E2B45]"}`}
                    >
                      {k}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Sidebar Footer */}
          <div className="p-6 border-t border-gray-100 bg-white">
            <div className="flex gap-3">
              <button
                onClick={clearAllFilters}
                className="flex-1 py-3.5 border border-gray-200 text-black font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-gray-50 transition-all"
              >
                Reset
              </button>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="flex-[2] py-3.5 bg-[#8E2B45] text-white font-bold uppercase tracking-widest text-[10px] rounded-xl shadow-lg hover:bg-[#5B1E26] transition-all"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sort Bottom Sheet */}
      {isSortOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[200] backdrop-blur-sm transition-opacity"
            onClick={() => setIsSortOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white z-[210] rounded-t-2xl p-6 pb-8 animate-in slide-in-from-bottom duration-300 safe-bottom">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 opacity-50" />
            <h3 className="text-lg font-serif font-bold text-black mb-6">
              Sort By
            </h3>
            <div className="space-y-4">
              {[
                "Newest",
                "Best Selling",
              ].map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    handleSortChange(option);
                    setIsSortOpen(false);
                  }}
                  className="w-full flex items-center justify-between text-left py-2 group"
                >
                  <span
                    className={`text-sm transition-colors ${sortBy === option ? "font-bold text-black" : "text-gray-600 group-hover:text-black"}`}
                  >
                    {option}
                  </span>
                  {sortBy === option ? (
                    <div className="w-5 h-5 rounded-full bg-[#D39A9F] flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-gray-300 group-hover:border-[#D39A9F]" />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
                <h3 className="text-lg font-serif font-bold text-black mb-6">
                  Filter by Price
                </h3>
                <div className="px-2">
                  <input
                    type="range"
                    min="1000"
                    max="50000"
                    step="1000"
                    value={priceRange}
                    onChange={(e) => handlePriceRangeChange(e.target.value)}
                    className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#8E2B45]"
                  />
                  <div className="flex justify-between mt-4">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                      ₹1,000
                    </span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                      ₹{priceRange.toLocaleString()}{priceRange >= 50000 ? '+' : ''}
                    </span>
                  </div>
                </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Shop;
