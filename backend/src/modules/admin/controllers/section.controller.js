const HomepageSection = require("../../../models/HomepageSection");
const { success, error } = require("../../../utils/apiResponse");

const ALLOWED_PAGE_KEYS = new Set(["home", "shop-men", "shop-women", "shop-family", "gold-collection"]);
const ALLOWED_SECTION_TYPES = new Set([
  "banner",
  "category-grid",
  "product-collection",
  "product-carousel",
  "promo-grid",
  "faq",
  "testimonial",
  "nav-links",
  "rich-content"
]);

const normalizePageKey = (value) => {
  const candidate = String(value || "home").trim().toLowerCase();
  return ALLOWED_PAGE_KEYS.has(candidate) ? candidate : "home";
};

const normalizeSectionType = (value) => {
  const candidate = String(value || "rich-content").trim().toLowerCase();
  return ALLOWED_SECTION_TYPES.has(candidate) ? candidate : "rich-content";
};

const buildSectionId = (pageKey, sectionKey) => (
  pageKey === "home" ? sectionKey : `${pageKey}:${sectionKey}`
);

const normalizeSectionIdentity = (id, payload = {}, query = {}) => {
  const payloadPageKey = payload.pageKey || query.pageKey;
  const pageKey = normalizePageKey(payloadPageKey);

  if (payload.sectionKey) {
    const sectionKey = String(payload.sectionKey).trim();
    return {
      pageKey,
      sectionKey,
      sectionId: buildSectionId(pageKey, sectionKey)
    };
  }

  const rawId = String(id || payload.sectionId || "").trim();
  if (rawId.includes(":")) {
    const [rawPageKey, ...sectionKeyParts] = rawId.split(":");
    const parsedPageKey = normalizePageKey(rawPageKey);
    const sectionKey = sectionKeyParts.join(":");
    return {
      pageKey: parsedPageKey,
      sectionKey,
      sectionId: buildSectionId(parsedPageKey, sectionKey)
    };
  }

  const sectionKey = rawId;
  return {
    pageKey,
    sectionKey,
    sectionId: buildSectionId(pageKey, sectionKey)
  };
};

const buildSectionLookup = ({ pageKey, sectionKey, sectionId }) => {
  if (!sectionKey) {
    return sectionId ? { $or: [{ sectionId }, { _id: sectionId }] } : null;
  }

  return {
    $or: [
      { pageKey, sectionKey },
      { sectionId },
      ...(pageKey === "home" ? [{ sectionId: sectionKey }] : [])
    ]
  };
};

const slugifyLabel = (value = "") => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/['"]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const parsePositiveNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const cleaned = String(value).replace(/[^0-9]/g, "");
  if (!cleaned) return null;
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const isObjectIdLike = (value) => /^[a-f\d]{24}$/i.test(String(value || "").trim());

const parseCategoryFromPath = (path = "") => {
  const raw = String(path || "").trim();
  if (!raw) return "";
  try {
    const query = raw.includes("?") ? raw.split("?")[1] : "";
    const params = new URLSearchParams(query);
    return String(params.get("category") || "").trim();
  } catch {
    return "";
  }
};

const buildCategoryPath = (categoryId, currentPath) => {
  if (categoryId) return `/shop?category=${categoryId}`;
  return currentPath || "/shop";
};

const buildCelebrateMenPath = (celebrateKey, currentPath) => {
  if (celebrateKey) return `/shop?source=men&filter=${encodeURIComponent(celebrateKey)}`;
  return currentPath || "/shop?source=men&filter=men";
};

const buildMenCuratedCollectionPath = (categoryId, currentPath) => {
  if (categoryId) {
    return `/shop?source=men&filter=men&category=${encodeURIComponent(categoryId)}`;
  }
  return currentPath || "/shop?source=men&filter=men";
};

const buildPriceRangePath = (priceMax, currentPath) => {
  if (priceMax) return `/shop?price_max=${priceMax}`;
  return currentPath || "/shop";
};

const buildWomenCategoryPath = (categoryKey, currentPath) => {
  const normalized = String(categoryKey || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (normalized) {
    return `/shop?source=women&category=${encodeURIComponent(normalized)}`;
  }

  return currentPath || "/shop?source=women";
};

const buildWomenCategoryIdPath = (categoryId, currentPath) => {
  const normalized = String(categoryId || "").trim();
  if (normalized) {
    return `/shop?source=women&filter=womens&category=${encodeURIComponent(normalized)}`;
  }
  return currentPath || "/shop?source=women&filter=womens";
};

const buildWomenPriceRangePath = (priceMax, currentPath) => {
  if (priceMax) return `/shop?source=women&filter=womens&price_max=${priceMax}`;
  return currentPath || "/shop?source=women&filter=womens";
};

const buildFamilyCategoryIdPath = (categoryId, currentPath) => {
  const normalized = String(categoryId || "").trim();
  if (normalized) {
    return `/shop?source=family&filter=family&category=${encodeURIComponent(normalized)}`;
  }
  return currentPath || "/shop?source=family&filter=family";
};

const buildGoldCategoryIdPath = (categoryId, currentPath) => {
  const normalized = String(categoryId || "").trim();
  if (normalized) {
    return `/shop?metal=gold&category=${encodeURIComponent(normalized)}`;
  }
  const source = String(currentPath || "").trim();
  if (!source || !source.startsWith("/shop")) return "/shop?metal=gold";
  try {
    const query = source.includes("?") ? source.split("?")[1] : "";
    const params = new URLSearchParams(query);
    params.set("metal", "gold");
    const normalizedQuery = params.toString();
    return `/shop${normalizedQuery ? `?${normalizedQuery}` : ""}`;
  } catch {
    return "/shop?metal=gold";
  }
};

const buildGoldPriceRangePath = (priceMax, categoryId, currentPath) => {
  const source = String(currentPath || "").trim();
  const query = source.startsWith("/shop") && source.includes("?") ? source.split("?")[1] : "";
  const params = new URLSearchParams(query);

  params.set("metal", "gold");

  if (priceMax) params.set("price_max", String(priceMax));
  else params.delete("price_max");

  const normalizedCategory = String(categoryId || "").trim();
  if (normalizedCategory) params.set("category", normalizedCategory);
  else params.delete("category");

  const normalizedQuery = params.toString();
  return `/shop${normalizedQuery ? `?${normalizedQuery}` : "?metal=gold"}`;
};

const TRUST_ICON_NAME_LOOKUP = {
  shieldcheck: "ShieldCheck",
  shield: "ShieldCheck",
  gem: "ShieldCheck",
  refreshcw: "RefreshCw",
  "refresh-cw": "RefreshCw",
  "rotate-ccw": "RefreshCw",
  rotateccw: "RotateCcw",
  star: "Star",
  truck: "Truck",
  filetext: "FileText",
  "file-text": "FileText"
};

const normalizeTrustIconName = (value, fallback = "ShieldCheck") => {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  const key = raw.replace(/[^a-zA-Z]/g, "").toLowerCase();
  return TRUST_ICON_NAME_LOOKUP[key] || TRUST_ICON_NAME_LOOKUP[String(raw).toLowerCase()] || raw;
};

const buildCategoryLimitPath = (categoryId, limit, sort, currentPath) => {
  if (categoryId && limit) return `/shop?category=${categoryId}&limit=${limit}&sort=${sort}`;
  return currentPath || `/shop?sort=${sort}`;
};

const normalizeObjectIdList = (values = []) => (
  Array.isArray(values)
    ? values.map((value) => {
        if (!value) return "";
        if (typeof value === "string") return value.trim();
        if (typeof value === "object") {
          const candidate = value._id || value.id || "";
          return String(candidate || "").trim();
        }
        return String(value || "").trim();
      }).filter((value) => Boolean(value) && value !== "[object Object]")
    : []
);

const buildProductsPath = (productIds, currentPath) => {
  const ids = normalizeObjectIdList(productIds);
  if (ids.length > 0) return `/shop?products=${encodeURIComponent(ids.join(","))}`;
  return currentPath || "/shop?status=coming-soon";
};

const buildRandomizedProductsPath = (productIds, limit, currentPath) => {
  const ids = normalizeObjectIdList(productIds);
  if (ids.length > 0) {
    const safeLimit = parsePositiveNumber(limit);
    return safeLimit
      ? `/shop?products=${encodeURIComponent(ids.join(","))}&limit=${safeLimit}&sort=random`
      : `/shop?products=${encodeURIComponent(ids.join(","))}&sort=random`;
  }
  if (limit) return `/shop?limit=${limit}&sort=random`;
  return currentPath || "/shop?limit=12&sort=random";
};

const sanitizeSectionPayload = (identity, payload = {}) => {
  const pageKey = normalizePageKey(identity?.pageKey || payload.pageKey);
  const sectionKey = String(identity?.sectionKey || payload.sectionKey || identity?.sectionId || payload.sectionId || "").trim();
  const sectionId = identity?.sectionId || buildSectionId(pageKey, sectionKey);

  const cleaned = {
    pageKey,
    sectionKey,
    sectionId,
    sectionType: normalizeSectionType(payload.sectionType),
    label: payload.label,
    isActive: payload.isActive !== undefined ? payload.isActive : true,
    sortOrder: payload.sortOrder ?? 0,
    settings: payload.settings && typeof payload.settings === "object" && !Array.isArray(payload.settings)
      ? payload.settings
      : {},
    items: Array.isArray(payload.items) ? payload.items.map((item, idx) => ({
      itemId: item.itemId || item.id || item._id || `${Date.now()}_${idx}`,
      type: item.type || (item.productId ? "product" : "manual"),
      productId: item.productId || null,
      productIds: Array.isArray(item.productIds) ? item.productIds : undefined,
      categoryId: item.categoryId || null,
      limit: item.limit ?? undefined,
      name: item.name,
      label: item.label,
      subtitle: item.subtitle,
      step: item.step,
      buttonText: item.buttonText,
      line1: item.line1,
      line2: item.line2,
      description: item.description,
      image: item.image,
      mobileImage: item.mobileImage,
      hoverImage: item.hoverImage,
      relationKey: item.relationKey || undefined,
      recipient: item.recipient || undefined,
      bondKey: item.bondKey || undefined,
      celebrateKey: item.celebrateKey,
      path: item.path,
      tag: item.tag,
      location: item.location,
      rating: item.rating ?? undefined,
      price: item.price,
      ctaLabel: item.ctaLabel,
      priceMax: item.priceMax ?? undefined,
      extraImages: Array.isArray(item.extraImages) ? item.extraImages : undefined,
      sortOrder: item.sortOrder ?? idx
    })) : []
  };

  if (sectionKey === "category-showcase") {
    cleaned.items = cleaned.items
      .map((item, idx) => {
        const categoryId = item.categoryId || null;
        const label = item.name || item.label || "";
        if (!categoryId) {
          return {
            ...item,
            name: label,
            label,
            sortOrder: item.sortOrder ?? idx
          };
        }

        return {
          ...item,
          categoryId,
          name: label,
          label: label || item.label,
          hoverImage: item.hoverImage,
          path: buildCategoryPath(categoryId, item.path),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter((item) => Boolean(item.categoryId));
  }

  if (sectionKey === "celebrate-men") {
    cleaned.items = cleaned.items
      .map((item, idx) => {
        const celebrateKey = String(item.celebrateKey || "").trim();
        const label = item.name || item.label || "";

        if (!celebrateKey) {
          return {
            ...item,
            name: label,
            label,
            sortOrder: item.sortOrder ?? idx
          };
        }

        return {
          ...item,
          celebrateKey,
          name: label,
          label: item.label || label,
          path: buildCelebrateMenPath(celebrateKey, item.path),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter((item) => Boolean(item.celebrateKey));
  }

  if (sectionKey === "price-range-showcase" || sectionKey === "luxury-within-reach") {
    cleaned.items = cleaned.items
      .map((item, idx) => {
        const priceMax = parsePositiveNumber(item.priceMax ?? item.price ?? item.name);
        if (!priceMax) {
          return {
            ...item,
            sortOrder: item.sortOrder ?? idx
          };
        }

        const name = item.name && String(item.name).trim()
          ? item.name
          : `Under INR ${priceMax}`;

        return {
          ...item,
          priceMax,
          price: String(priceMax),
          name,
          label: item.label || name,
          path: pageKey === "shop-women"
            ? buildWomenPriceRangePath(priceMax, item.path)
            : buildPriceRangePath(priceMax, item.path),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter((item) => Boolean(item.priceMax));
  }

  if (sectionKey === "gold-luxury-within-reach" && pageKey === "gold-collection") {
    cleaned.items = cleaned.items
      .map((item, idx) => {
        const priceMax = parsePositiveNumber(item.priceMax ?? item.price ?? item.name);
        if (!priceMax) return null;

        const rawCategory = String(item.categoryId || "").trim()
          || parseCategoryFromPath(item.path)
          || "";
        const categoryId = isObjectIdLike(rawCategory) ? rawCategory : null;
        const pathCategory = categoryId || rawCategory;

        const label = String(item.name || item.label || "").trim() || `Under INR ${priceMax}`;

        return {
          ...item,
          priceMax,
          price: String(priceMax),
          categoryId: categoryId || undefined,
          name: label,
          label: item.label || label,
          path: buildGoldPriceRangePath(priceMax, pathCategory, item.path),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter(Boolean)
      .slice(0, 4);
  }

  if (sectionKey === "product-categories" && pageKey === "shop-women") {
    cleaned.items = cleaned.items
      .map((item, idx) => {
        const label = String(item.name || item.label || "").trim();
        if (!label || !item.image) {
          return null;
        }

        return {
          ...item,
          name: label,
          label: item.label || label,
          path: item.path || buildWomenCategoryPath(label, item.path),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter(Boolean);
  }

  if (sectionKey === "categories-grid" && pageKey === "shop-women") {
    cleaned.items = cleaned.items
      .map((item, idx) => {
        const rawCategory = String(item.categoryId || "").trim()
          || parseCategoryFromPath(item.path)
          || slugifyLabel(item.name || item.label || "");
        const categoryId = isObjectIdLike(rawCategory) ? rawCategory : null;
        const pathCategory = categoryId || rawCategory;
        const label = String(item.name || item.label || "").trim();
        if (!pathCategory || !item.image) return null;
        return {
          ...item,
          categoryId: categoryId || undefined,
          name: label || `Collection ${idx + 1}`,
          label: item.label || label || `Collection ${idx + 1}`,
          path: buildWomenCategoryIdPath(pathCategory, item.path),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter(Boolean)
      .slice(0, 4);
  }

  if (sectionKey === "curated-collections" && pageKey === "shop-women") {
    cleaned.items = cleaned.items
      .map((item, idx) => {
        const rawCategory = String(item.categoryId || "").trim()
          || parseCategoryFromPath(item.path)
          || slugifyLabel(item.name || item.label || "");
        const categoryId = isObjectIdLike(rawCategory) ? rawCategory : null;
        const pathCategory = categoryId || rawCategory;
        const label = String(item.name || item.label || "").trim();
        if (!pathCategory || !item.image) return null;
        return {
          ...item,
          categoryId: categoryId || undefined,
          name: label || `Collection ${idx + 1}`,
          label: item.label || label || `Collection ${idx + 1}`,
          path: buildWomenCategoryIdPath(pathCategory, item.path),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter(Boolean);
  }

  if (sectionKey === "occasion-carousel" && pageKey === "shop-women") {
    cleaned.items = cleaned.items
      .map((item, idx) => {
        const rawCategory = String(item.categoryId || "").trim()
          || parseCategoryFromPath(item.path)
          || slugifyLabel(item.name || item.label || "");
        const categoryId = isObjectIdLike(rawCategory) ? rawCategory : null;
        const pathCategory = categoryId || rawCategory;
        const label = String(item.name || item.label || "").trim();
        if (!pathCategory || !item.image || !label) return null;
        return {
          ...item,
          categoryId: categoryId || undefined,
          name: label,
          label: item.label || label,
          path: buildWomenCategoryIdPath(pathCategory, item.path),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter(Boolean);
  }

  if (sectionKey === "personalized-banner" && pageKey === "shop-women") {
    const sourceItem = cleaned.items[0];
    const rawCategory = String(sourceItem?.categoryId || "").trim()
      || parseCategoryFromPath(sourceItem?.path || "")
      || "personalised";
    const categoryId = isObjectIdLike(rawCategory) ? rawCategory : null;
    const pathCategory = categoryId || rawCategory;

    cleaned.items = sourceItem
      ? [{
          ...sourceItem,
          categoryId: categoryId || undefined,
          name: String(sourceItem.name || sourceItem.tag || "Exclusive Edit").trim() || "Exclusive Edit",
          label: String(sourceItem.label || sourceItem.name || "Personalised").trim() || "Personalised",
          subtitle: sourceItem.subtitle || sourceItem.description || "Silver that feels like you",
          description: sourceItem.description || sourceItem.subtitle || "Silver that feels like you",
          ctaLabel: sourceItem.ctaLabel || "Explore",
          path: buildWomenCategoryIdPath(pathCategory, sourceItem.path),
          sortOrder: 0
        }].filter((item) => Boolean(item.image))
      : [];
  }

  if (sectionKey === "discover-hue" && pageKey === "shop-women") {
    cleaned.items = cleaned.items
      .map((item, idx) => {
        const rawCategory = String(item.categoryId || "").trim()
          || parseCategoryFromPath(item.path)
          || slugifyLabel(item.name || item.label || "");
        const categoryId = isObjectIdLike(rawCategory) ? rawCategory : null;
        const pathCategory = categoryId || rawCategory;
        const label = String(item.name || item.label || "").trim() || `Hue ${idx + 1}`;
        if (!item.image) return null;
        return {
          ...item,
          categoryId: categoryId || undefined,
          name: label,
          label: item.label || label,
          tag: String(item.tag || "").trim(),
          path: pathCategory ? buildWomenCategoryIdPath(pathCategory, item.path) : (item.path || "/shop?source=women&filter=womens"),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter(Boolean)
      .slice(0, 4);
  }

  if (sectionKey === "promo-banners" && pageKey === "shop-women") {
    cleaned.items = cleaned.items
      .map((item, idx) => {
        const label = String(item.name || item.label || "").trim();
        const subtitle = String(item.subtitle || item.description || "").trim();
        const rawCategory = String(item.categoryId || "").trim()
          || parseCategoryFromPath(item.path)
          || slugifyLabel(label);
        const categoryId = isObjectIdLike(rawCategory) ? rawCategory : null;
        const pathCategory = categoryId || rawCategory;

        if (!label || !subtitle || !item.image) return null;

        return {
          ...item,
          categoryId: categoryId || undefined,
          name: label,
          label: item.label || label,
          subtitle,
          description: item.description || subtitle,
          tag: item.tag || "Exclusive",
          ctaLabel: item.ctaLabel || "Shop Now",
          path: pathCategory ? buildWomenCategoryIdPath(pathCategory, item.path) : (item.path || "/shop?source=women&filter=womens"),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter(Boolean)
      .slice(0, 2);
  }

  if (sectionKey === "gold-category-grid" && pageKey === "gold-collection") {
    cleaned.items = cleaned.items
      .map((item, idx) => {
        const rawCategory = String(item.categoryId || "").trim()
          || parseCategoryFromPath(item.path)
          || slugifyLabel(item.name || item.label || "");
        const categoryId = isObjectIdLike(rawCategory) ? rawCategory : null;
        const pathCategory = categoryId || rawCategory;
        const label = String(item.name || item.label || "").trim();
        if (!pathCategory || !item.image) return null;
        return {
          ...item,
          categoryId: categoryId || undefined,
          name: label || `Category ${idx + 1}`,
          label: item.label || label || `Category ${idx + 1}`,
          path: buildGoldCategoryIdPath(pathCategory, item.path),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter(Boolean);
  }

  if (sectionKey === "gold-trust-markers" && pageKey === "gold-collection") {
    const defaults = [
      { id: "trust-1", name: "100% Certified Lab", subtitle: "Grown Diamonds", iconName: "ShieldCheck" },
      { id: "trust-2", name: "Lifetime Exchange", subtitle: "& Buyback", iconName: "RefreshCw" },
      { id: "trust-3", name: "Easy 30", subtitle: "Days Return", iconName: "RotateCcw" },
      { id: "trust-4", name: "B I S", subtitle: "Hallmark", iconName: "Star" }
    ];
    const sourceItems = Array.isArray(cleaned.items) && cleaned.items.length > 0 ? cleaned.items : defaults;

    cleaned.items = defaults.map((fallback, idx) => {
      const item = sourceItems[idx] || {};
      const name = String(item.name || item.label || fallback.name).trim();
      const subtitle = String(item.subtitle || item.description || fallback.subtitle).trim();
      const iconName = normalizeTrustIconName(item.iconName || item.iconKey, fallback.iconName);

      return {
        ...item,
        itemId: item.itemId || item.id || fallback.id,
        name: name || fallback.name,
        label: item.label || name || fallback.name,
        subtitle: subtitle || fallback.subtitle,
        description: item.description || subtitle || fallback.subtitle,
        iconName,
        iconKey: item.iconKey || iconName,
        sortOrder: idx
      };
    });
  }

  if (sectionKey === "best-styles" || sectionKey === "featured-gifts") {
    const productLimit = parsePositiveNumber(cleaned.settings?.productLimit) || 6;
    const title = String(cleaned.settings?.title || "Best styles, now for less!").trim() || "Best styles, now for less!";
    const ctaLabel = String(cleaned.settings?.ctaLabel || "View All Collection").trim() || "View All Collection";

    cleaned.settings = {
      ...cleaned.settings,
      title,
      subtitle: String(cleaned.settings?.subtitle || "").trim(),
      ctaLabel,
      ctaPath: pageKey === "gold-collection" ? "/shop?metal=gold" : "/shop",
      productLimit
    };
  }

  if (sectionKey === "gold-new-launch-banner" && pageKey === "gold-collection") {
    cleaned.items = cleaned.items
      .map((item, idx) => {
        const rawCategory = String(item.categoryId || "").trim()
          || parseCategoryFromPath(item.path)
          || slugifyLabel(item.name || item.label || "");
        const categoryId = isObjectIdLike(rawCategory) ? rawCategory : null;
        const pathCategory = categoryId || rawCategory;
        const label = String(item.name || item.label || "").trim();
        if (!label || !item.image || !pathCategory) return null;
        return {
          ...item,
          categoryId: categoryId || undefined,
          name: label,
          label: item.label || label,
          path: buildGoldCategoryIdPath(pathCategory, item.path),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter(Boolean)
      .slice(0, 3);
  }

  if (sectionKey === "gold-exclusive-launch" && pageKey === "gold-collection") {
    cleaned.items = cleaned.items
      .map((item, idx) => {
        const rawCategory = String(item.categoryId || "").trim()
          || parseCategoryFromPath(item.path)
          || slugifyLabel(item.name || item.label || "");
        const categoryId = isObjectIdLike(rawCategory) ? rawCategory : null;
        const pathCategory = categoryId || rawCategory;
        const title = String(item.name || item.label || "").trim();
        const subtitle = String(item.subtitle || item.description || "").trim();
        if (!title || !subtitle || !item.image || !pathCategory) return null;
        return {
          ...item,
          categoryId: categoryId || undefined,
          name: title,
          label: item.label || title,
          subtitle,
          description: item.description || subtitle,
          path: buildGoldCategoryIdPath(pathCategory, item.path),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter(Boolean)
      .slice(0, 2);
  }

  if (sectionKey === "gold-ring-carousel" && pageKey === "gold-collection") {
    cleaned.items = cleaned.items
      .map((item, idx) => {
        const rawCategory = String(item.categoryId || "").trim()
          || parseCategoryFromPath(item.path)
          || slugifyLabel(item.name || item.label || "");
        const categoryId = isObjectIdLike(rawCategory) ? rawCategory : null;
        const pathCategory = categoryId || rawCategory;
        const label = String(item.name || item.label || "").trim();
        if (!label || !item.image || !pathCategory) return null;
        return {
          ...item,
          categoryId: categoryId || undefined,
          name: label,
          label: item.label || label,
          path: buildGoldCategoryIdPath(pathCategory, item.path),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter(Boolean)
      .slice(0, 6);
  }

  if (sectionKey === "gold-shop-by-colour" && pageKey === "gold-collection") {
    cleaned.items = cleaned.items
      .map((item, idx) => {
        const rawCategory = String(item.categoryId || "").trim()
          || parseCategoryFromPath(item.path)
          || slugifyLabel(item.name || item.label || "");
        const categoryId = isObjectIdLike(rawCategory) ? rawCategory : null;
        const pathCategory = categoryId || rawCategory;
        const label = String(item.name || item.label || "").trim();
        if (!pathCategory || !item.image) return null;
        return {
          ...item,
          categoryId: categoryId || undefined,
          name: label || `Colour ${idx + 1}`,
          label: item.label || label || `Colour ${idx + 1}`,
          path: buildGoldCategoryIdPath(pathCategory, item.path),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter(Boolean)
      .slice(0, 4);
  }

  if (sectionKey === "gold-curated-bond" && pageKey === "gold-collection") {
    cleaned.items = cleaned.items
      .map((item, idx) => {
        const rawCategory = String(item.categoryId || "").trim()
          || parseCategoryFromPath(item.path)
          || slugifyLabel(item.name || item.label || "");
        const categoryId = isObjectIdLike(rawCategory) ? rawCategory : null;
        const pathCategory = categoryId || rawCategory;
        const label = String(item.name || item.label || "").trim();
        if (!pathCategory || !item.image) return null;
        return {
          ...item,
          categoryId: categoryId || undefined,
          name: label || `Bond ${idx + 1}`,
          label: item.label || label || `Bond ${idx + 1}`,
          path: buildGoldCategoryIdPath(pathCategory, item.path),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter(Boolean)
      .slice(0, 4);
  }

  if (sectionKey === "gold-explore-collections" && pageKey === "gold-collection") {
    cleaned.items = cleaned.items
      .map((item, idx) => {
        const rawCategory = String(item.categoryId || "").trim()
          || parseCategoryFromPath(item.path)
          || slugifyLabel(item.name || item.label || "");
        const categoryId = isObjectIdLike(rawCategory) ? rawCategory : null;
        const pathCategory = categoryId || rawCategory;
        const title = String(item.name || item.label || "").trim();
        if (!pathCategory || !item.image || !title) return null;
        return {
          ...item,
          categoryId: categoryId || undefined,
          name: title,
          label: item.label || title,
          subtitle: String(item.subtitle || item.description || "").trim(),
          description: String(item.description || item.subtitle || "").trim(),
          path: buildGoldCategoryIdPath(pathCategory, item.path),
          extraImages: Array.isArray(item.extraImages)
            ? item.extraImages.filter(Boolean).slice(0, 3)
            : [],
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter(Boolean);
  }

  if (sectionKey === "gold-curated-showcase" && pageKey === "gold-collection") {
    cleaned.items = cleaned.items
      .map((item, idx) => {
        const rawCategory = String(item.categoryId || "").trim()
          || parseCategoryFromPath(item.path)
          || slugifyLabel(item.name || item.label || "");
        const categoryId = isObjectIdLike(rawCategory) ? rawCategory : null;
        const pathCategory = categoryId || rawCategory;
        const title = String(item.name || item.label || "").trim();
        if (!pathCategory || !item.image || !title) return null;
        return {
          ...item,
          categoryId: categoryId || undefined,
          name: title,
          label: item.label || title,
          path: buildGoldCategoryIdPath(pathCategory, item.path),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter(Boolean);
  }

  if (sectionKey === "gold-lifestyle-grid" && pageKey === "gold-collection") {
    cleaned.items = cleaned.items
      .map((item, idx) => {
        const rawCategory = String(item.categoryId || "").trim()
          || parseCategoryFromPath(item.path)
          || slugifyLabel(item.name || item.label || "");
        const categoryId = isObjectIdLike(rawCategory) ? rawCategory : null;
        const pathCategory = categoryId || rawCategory;
        const title = String(item.name || item.label || "").trim();
        if (!pathCategory || !item.image || !title) return null;
        return {
          ...item,
          categoryId: categoryId || undefined,
          name: title,
          label: item.label || title,
          path: buildGoldCategoryIdPath(pathCategory, item.path),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter(Boolean)
      .slice(0, 8);
  }

  if (sectionKey === "products-listing" && pageKey === "shop-women") {
    const sourceModeCandidate = String(cleaned.settings?.sourceMode || "").trim().toLowerCase();
    const sourceMode = sourceModeCandidate === "manual" ? "manual" : "category";
    const productLimit = parsePositiveNumber(cleaned.settings?.productLimit) || 8;
    const categoryId = String(cleaned.settings?.categoryId || "").trim() || null;

    const manualProductIds = normalizeObjectIdList(
      cleaned.items.flatMap((item) => [
        item.productId,
        ...(Array.isArray(item.productIds) ? item.productIds : [])
      ])
    );

    cleaned.settings = {
      ...cleaned.settings,
      title: String(cleaned.settings?.title || "Women's Exclusives").trim() || "Women's Exclusives",
      productLimit,
      sourceMode,
      categoryId: sourceMode === "category" ? categoryId : null,
      ctaLabel: String(cleaned.settings?.ctaLabel || "Explore All Women's Jewellery").trim()
        || "Explore All Women's Jewellery"
    };

    cleaned.items = sourceMode === "manual"
      ? manualProductIds.map((productId, idx) => ({
          itemId: `women-featured-${idx + 1}`,
          type: "product",
          productId,
          path: "/shop?source=women&filter=womens",
          sortOrder: idx
        }))
      : [];
  }

  if (sectionKey === "products-listing" && pageKey === "shop-family") {
    const legacyGlobalLimit = parsePositiveNumber(cleaned.settings?.productLimit) || 8;
    const rawTabConfigs = cleaned.settings?.tabConfigs && typeof cleaned.settings.tabConfigs === "object"
      ? cleaned.settings.tabConfigs
      : {};
    const tabKeys = ["all", "mother", "father", "brother", "sister", "husband", "wife"];
    const defaultLabels = {
      all: "All Family Collections",
      mother: "Mother Collections",
      father: "Father Collections",
      brother: "Brother Collections",
      sister: "Sister Collections",
      husband: "Husband Collections",
      wife: "Wife Collections"
    };

    const manualIdsByTabFromItems = {};
    cleaned.items.forEach((item) => {
      const tabKey = String(item.recipient || item.relationKey || "all").trim().toLowerCase();
      if (!tabKeys.includes(tabKey)) return;
      const ids = normalizeObjectIdList([
        item.productId,
        ...(Array.isArray(item.productIds) ? item.productIds : [])
      ]);
      if (ids.length === 0) return;
      manualIdsByTabFromItems[tabKey] = [
        ...(manualIdsByTabFromItems[tabKey] || []),
        ...ids
      ];
    });

    const normalizedTabConfigs = tabKeys.reduce((acc, tabKey) => {
      const source = rawTabConfigs[tabKey] && typeof rawTabConfigs[tabKey] === "object"
        ? rawTabConfigs[tabKey]
        : {};
      const sourceMode = String(source.sourceMode || "").trim().toLowerCase() === "manual" ? "manual" : "category";
      const categoryId = String(source.categoryId || "").trim();
      const tabLabel = String(source.tabLabel || defaultLabels[tabKey]).trim() || defaultLabels[tabKey];
      const productLimit = parsePositiveNumber(source.productLimit) || legacyGlobalLimit;
      const productIds = normalizeObjectIdList([
        ...(Array.isArray(source.productIds) ? source.productIds : []),
        ...(manualIdsByTabFromItems[tabKey] || [])
      ]);

      acc[tabKey] = {
        tabLabel,
        productLimit,
        sourceMode,
        categoryId: sourceMode === "category" ? categoryId : "",
        productIds: sourceMode === "manual" ? productIds : []
      };
      return acc;
    }, {});

    cleaned.settings = {
      ...cleaned.settings,
      title: String(cleaned.settings?.title || "All Family Collections").trim() || "All Family Collections",
      highlightWord: String(cleaned.settings?.highlightWord || "Edit").trim() || "Edit",
      subtitle: String(cleaned.settings?.subtitle || '"Curated boutique jewellery picks for every family member."').trim()
        || '"Curated boutique jewellery picks for every family member."',
      ctaLabel: String(cleaned.settings?.ctaLabel || "View All Collections").trim() || "View All Collections",
      tabConfigs: normalizedTabConfigs
    };

    cleaned.items = tabKeys.flatMap((tabKey) => {
      const tab = normalizedTabConfigs[tabKey];
      if (tab.sourceMode !== "manual") return [];
      return tab.productIds.map((productId, idx) => ({
        itemId: `family-featured-${tabKey}-${idx + 1}`,
        type: "product",
        productId,
        recipient: tabKey,
        sortOrder: idx
      }));
    });
  }

  if (sectionKey === "gold-products-listing" && pageKey === "gold-collection") {
    const sourceModeCandidate = String(cleaned.settings?.sourceMode || "").trim().toLowerCase();
    const sourceMode = sourceModeCandidate === "manual" ? "manual" : "category";
    const productLimit = parsePositiveNumber(cleaned.settings?.productLimit) || 4;
    const categoryId = String(
      cleaned.settings?.categoryId
      || parseCategoryFromPath(cleaned.items?.[0]?.path)
      || ""
    ).trim() || null;

    const manualProductIds = normalizeObjectIdList(
      cleaned.items.flatMap((item) => [
        item.productId,
        ...(Array.isArray(item.productIds) ? item.productIds : [])
      ])
    );

    cleaned.settings = {
      ...cleaned.settings,
      title: String(cleaned.settings?.title || "All Jewellery").trim() || "All Jewellery",
      eyebrow: String(cleaned.settings?.eyebrow || "Our Collection").trim() || "Our Collection",
      productLimit,
      sourceMode,
      categoryId: sourceMode === "category" ? categoryId : null
    };

    cleaned.items = sourceMode === "manual"
      ? manualProductIds.map((productId, idx) => ({
          itemId: `gold-featured-${idx + 1}`,
          type: "product",
          productId,
          path: "/shop?metal=gold",
          sortOrder: idx
        }))
      : [];
  }

  if ((sectionKey === "trending-near-you" || sectionKey === "gifts-to-remember") && pageKey === "shop-family") {
    cleaned.items = cleaned.items
      .map((item, idx) => {
        const rawCategory = String(item.categoryId || "").trim()
          || parseCategoryFromPath(item.path)
          || "";
        const categoryId = isObjectIdLike(rawCategory) ? rawCategory : null;
        const pathCategory = categoryId || rawCategory;
        const label = String(item.name || item.label || "").trim();
        if (!label || !item.image || !pathCategory) return null;
        return {
          ...item,
          categoryId: categoryId || undefined,
          name: label,
          label: item.label || label,
          path: buildFamilyCategoryIdPath(pathCategory, item.path),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter(Boolean)
      .slice(0, 12);
  }

  if (sectionKey === "family-promo-banner" && pageKey === "shop-family") {
    const sourceItem = cleaned.items[0];
    const rawCategory = String(sourceItem?.categoryId || "").trim()
      || parseCategoryFromPath(sourceItem?.path || "");
    const categoryId = isObjectIdLike(rawCategory) ? rawCategory : null;
    const pathCategory = categoryId || rawCategory;

    cleaned.items = sourceItem
      ? [{
          ...sourceItem,
          categoryId: categoryId || undefined,
          name: String(sourceItem.name || sourceItem.tag || "Exclusive Collection").trim() || "Exclusive Collection",
          label: String(sourceItem.label || sourceItem.name || "Gifts for Family").trim() || "Gifts for Family",
          subtitle: sourceItem.subtitle || sourceItem.description || "Choose the bonds that last a lifetime with our curated masterpiece collection.",
          description: sourceItem.description || sourceItem.subtitle || "Choose the bonds that last a lifetime with our curated masterpiece collection.",
          ctaLabel: sourceItem.ctaLabel || "Explore Now",
          path: buildFamilyCategoryIdPath(pathCategory, sourceItem.path),
          sortOrder: 0
        }].filter((item) => Boolean(item.image && pathCategory))
      : [];
  }

  if (sectionKey === "latest-drop" || sectionKey === "most-gifted") {
    const sort = sectionKey === "most-gifted" ? "most-sold" : "latest";
    cleaned.items = cleaned.items
      .map((item, idx) => {
        if (sectionKey === "most-gifted" && item.type === "hero") {
          const label = item.label || item.name || "Most Gifted Items";
          return {
            ...item,
            type: "hero",
            name: item.name || label,
            label,
            tag: item.tag || "Collection Focus",
            ctaLabel: item.ctaLabel || "Explore Collection",
            path: item.path || "/shop?sort=most-sold",
            sortOrder: item.sortOrder ?? idx
          };
        }

        const categoryId = item.categoryId || null;
        const limit = parsePositiveNumber(item.limit);
        if (sectionKey === "most-gifted") {
          const label = item.name || item.label || "";
          if (!categoryId) {
            return {
              ...item,
              name: label,
              label,
              sortOrder: item.sortOrder ?? idx
            };
          }

          return {
            ...item,
            categoryId,
            limit: undefined,
            name: label,
            label: item.label || label,
            path: `/shop?category=${categoryId}&sort=most-sold`,
            sortOrder: item.sortOrder ?? idx
          };
        }

        if (!categoryId || !limit) {
          return {
            ...item,
            limit: limit || undefined,
            sortOrder: item.sortOrder ?? idx
          };
        }

        const label = item.name || item.label || "";

        return {
          ...item,
          categoryId,
          limit,
          name: label,
          label: item.label || label,
          path: buildCategoryLimitPath(categoryId, limit, sort, item.path),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter((item) => item.type === "hero" || (sectionKey === "most-gifted" ? Boolean(item.categoryId) : Boolean(item.categoryId && item.limit)));
  }

  if (sectionKey === "proposal-rings") {
    const sourceItem = cleaned.items.find((item) => Boolean(item.categoryId)) || cleaned.items[0];
    cleaned.items = sourceItem
      ? [
          {
            ...sourceItem,
            categoryId: sourceItem.categoryId || null,
            limit: undefined,
            name: sourceItem.name || sourceItem.label || "Proposal Rings",
            label: sourceItem.label || sourceItem.name || "Proposal Rings",
            path: sourceItem.categoryId ? `/shop?category=${sourceItem.categoryId}` : (sourceItem.path || "/shop"),
            sortOrder: 0
          }
        ].filter((item) => Boolean(item.categoryId))
      : [];
  }

  if (sectionKey === "perfect-gift") {
    cleaned.items = cleaned.items.map((item, idx) => {
      const productIds = normalizeObjectIdList(item.productIds);
      const label = item.name || item.label || "";
      return {
        ...item,
        productIds,
        name: label,
        label: item.label || label,
        path: buildProductsPath(productIds, item.path),
        sortOrder: item.sortOrder ?? idx
      };
    });
  }

  if (sectionKey === "new-launch") {
    cleaned.items = cleaned.items
      .map((item, idx) => {
        const categoryId = item.categoryId || null;
        const label = item.name || item.label || "";

        if (!categoryId) {
          return {
            ...item,
            name: label,
            label,
            sortOrder: item.sortOrder ?? idx
          };
        }

        return {
          ...item,
          categoryId,
          productIds: undefined,
          name: label,
          label: item.label || label,
          path: buildCategoryPath(categoryId, item.path),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter((item) => Boolean(item.categoryId));
  }

  if (sectionKey === "curated-collections" && pageKey === "shop-men") {
    cleaned.items = cleaned.items
      .map((item, idx) => {
        const categoryId = item.categoryId || null;
        const label = item.name || item.label || "";

        if (!label || !item.image || (!categoryId && !item.path)) {
          return null;
        }

        return {
          ...item,
          categoryId,
          name: label,
          label: item.label || label,
          tag: item.tag || "",
          path: buildMenCuratedCollectionPath(categoryId, item.path),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter(Boolean);
  }

  if (sectionKey === "explore-collections" && pageKey === "shop-men") {
    cleaned.items = cleaned.items
      .map((item, idx) => {
        const categoryId = item.categoryId || null;
        const label = item.name || item.label || "";
        const subtitle = item.subtitle || item.description || "";

        if (!label || !subtitle || !item.image || (!categoryId && !item.path)) {
          return null;
        }

        return {
          ...item,
          categoryId,
          name: label,
          label: item.label || label,
          subtitle,
          description: item.description || subtitle,
          path: buildMenCuratedCollectionPath(categoryId, item.path),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter(Boolean);
  }

  if (sectionKey === "personalized-banner" && pageKey === "shop-men") {
    const sourceItem = cleaned.items[0];
    cleaned.items = sourceItem
      ? [{
          ...sourceItem,
          name: sourceItem.name || sourceItem.label || "Personalised",
          label: sourceItem.label || sourceItem.name || "Personalised",
          subtitle: sourceItem.subtitle || sourceItem.description || "",
          description: sourceItem.description || sourceItem.subtitle || "",
          ctaLabel: sourceItem.ctaLabel || "Customise Now",
          categoryId: sourceItem.categoryId || null,
          path: buildMenCuratedCollectionPath(sourceItem.categoryId || null, sourceItem.path),
          sortOrder: 0
        }].filter((item) => Boolean(item.image && item.categoryId))
      : [];
  }

  if (sectionKey === "pick-your-glam" && pageKey === "shop-men") {
    cleaned.items = cleaned.items
      .map((item, idx) => {
        const categoryId = item.categoryId || null;
        const label = item.name || item.label || "";
        if (!label || !item.image || !categoryId) return null;
        return {
          ...item,
          name: label,
          label: item.label || label,
          categoryId,
          path: buildMenCuratedCollectionPath(categoryId, item.path),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter(Boolean);
  }

  if (sectionKey === "style-guide" && pageKey === "shop-men") {
    cleaned.items = cleaned.items
      .slice(0, 3)
      .map((item, idx) => {
        const categoryId = item.categoryId || null;
        const label = item.name || item.label || "";
        const step = item.step || `${idx + 1}. Step`;
        const buttonText = item.buttonText || item.ctaLabel || "Explore";
        if (!label || !step || !buttonText || !item.image || !categoryId) return null;
        return {
          ...item,
          name: label,
          label: item.label || label,
          step,
          buttonText,
          ctaLabel: buttonText,
          categoryId,
          path: buildMenCuratedCollectionPath(categoryId, item.path),
          sortOrder: idx
        };
      })
      .filter(Boolean);
  }

  if (sectionKey === "style-trends" && pageKey === "shop-men") {
    cleaned.items = cleaned.items
      .slice(0, 4)
      .map((item, idx) => {
        const categoryId = item.categoryId || null;
        const line1 = item.line1 || "";
        const line2 = item.line2 || "";
        const label = item.name || item.label || `${line1} ${line2}`.trim();
        if (!line1 || !line2 || !item.image || !categoryId) return null;
        return {
          ...item,
          name: label,
          label: item.label || label,
          line1,
          line2,
          categoryId,
          path: buildMenCuratedCollectionPath(categoryId, item.path),
          sortOrder: item.sortOrder ?? idx
        };
      })
      .filter(Boolean);
  }

  if (sectionKey === "products-listing" && pageKey === "shop-men") {
    const sourceModeCandidate = String(cleaned.settings?.sourceMode || "").trim().toLowerCase();
    const sourceMode = sourceModeCandidate === "manual" ? "manual" : "category";
    const productLimit = parsePositiveNumber(cleaned.settings?.productLimit) || 8;
    const categoryId = String(cleaned.settings?.categoryId || "").trim() || null;

    const manualProductIds = normalizeObjectIdList(
      cleaned.items.flatMap((item) => [
        item.productId,
        ...(Array.isArray(item.productIds) ? item.productIds : [])
      ])
    );

    cleaned.settings = {
      ...cleaned.settings,
      title: String(cleaned.settings?.title || "Men's Exclusive").trim() || "Men's Exclusive",
      productLimit,
      sourceMode,
      categoryId: sourceMode === "category" ? categoryId : null,
      ctaLabel: "View All Collection"
    };

    cleaned.items = sourceMode === "manual"
      ? manualProductIds.map((productId, idx) => ({
          itemId: `men-featured-${idx + 1}`,
          type: "product",
          productId,
          path: "/shop?source=men&filter=men",
          sortOrder: idx
        }))
      : [];
  }

  if (sectionKey === "curated-for-you" || sectionKey === "style-it-your-way") {
    cleaned.items = cleaned.items.map((item, idx) => {
      const productIds = normalizeObjectIdList(item.productIds);
      const limit = parsePositiveNumber(item.limit) || 12;
      const label = item.name || item.label || "";
      return {
        ...item,
        productIds,
        limit,
        name: label,
        label: item.label || label,
        extraImages: Array.isArray(item.extraImages)
          ? item.extraImages.map((img) => String(img || "").trim())
          : undefined,
        path: buildRandomizedProductsPath(productIds, limit, item.path),
        sortOrder: item.sortOrder ?? idx
      };
    });
  }

  return cleaned;
};

exports.getSections = async (req, res) => {
  try {
    const pageKey = req.query.pageKey ? normalizePageKey(req.query.pageKey) : null;
    const filter = pageKey ? { pageKey } : {};
    const sections = await HomepageSection.find(filter).sort({ sortOrder: 1, createdAt: 1 });
    return success(res, { sections }, "Homepage sections retrieved");
  } catch (err) { return error(res, err.message); }
};

exports.getSectionDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const identity = normalizeSectionIdentity(id, {}, req.query);
    const lookup = buildSectionLookup(identity);
    const section = lookup
      ? await HomepageSection.findOne(lookup) || await HomepageSection.findById(id)
      : null;
    if (!section) return error(res, "Section not found", 404);
    return success(res, { section }, "Homepage section retrieved");
  } catch (err) { return error(res, err.message); }
};

exports.upsertSection = async (req, res) => {
  try {
    const { id } = req.params;
    const identity = normalizeSectionIdentity(id, req.body, req.query);
    const payload = sanitizeSectionPayload(identity, req.body);
    if (!payload.label) return error(res, "Section label is required", 400);

    const lookup = buildSectionLookup(identity);
    const section = await HomepageSection.findOneAndUpdate(
      lookup,
      { $set: payload },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return success(res, { section }, "Homepage section saved");
  } catch (err) { return error(res, err.message); }
};

exports.bulkUpsertSections = async (req, res) => {
  try {
    const sections = Array.isArray(req.body.sections) ? req.body.sections : [];
    if (sections.length === 0) return error(res, "No sections provided", 400);
    const fallbackPageKey = normalizePageKey(req.body.pageKey);

    const ops = sections.map((section) => {
      if (!section.sectionId && !section.sectionKey) return null;
      const identity = normalizeSectionIdentity(section.sectionId || section.sectionKey, { ...section, pageKey: section.pageKey || fallbackPageKey });
      const payload = sanitizeSectionPayload(identity, { ...section, pageKey: identity.pageKey });
      return HomepageSection.updateOne(
        buildSectionLookup(identity),
        { $set: payload },
        { upsert: true }
      );
    }).filter(Boolean);

    await Promise.all(ops);

    const requestedPageKeys = [...new Set(sections.map((section) => normalizePageKey(section.pageKey || fallbackPageKey)))];
    const requestedSectionKeys = sections
      .map((section) => normalizeSectionIdentity(section.sectionId || section.sectionKey, { ...section, pageKey: section.pageKey || fallbackPageKey }).sectionKey)
      .filter(Boolean);

    const savedSections = await HomepageSection.find({
      pageKey: { $in: requestedPageKeys },
      sectionKey: { $in: requestedSectionKeys }
    })
      .sort({ sortOrder: 1, createdAt: 1 });

    return success(res, { sections: savedSections }, "Homepage sections saved");
  } catch (err) { return error(res, err.message); }
};

exports.uploadSectionImage = async (req, res) => {
  try {
    if (!req.file) return error(res, "Image file is required", 400);
    const url = req.file.path || req.file.secure_url || req.file.url || null;
    if (!url) return error(res, "Image upload succeeded but no file URL was returned", 500);
    return success(res, { url }, "Image uploaded");
  } catch (err) { return error(res, err.message); }
};
