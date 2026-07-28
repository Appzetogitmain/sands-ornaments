import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Trash2,
  Link as LinkIcon,
  Image as ImageIcon,
  Tag,
  Search,
  CheckCircle,
  Edit2,
} from "lucide-react";
import { Input } from "../common/FormControls";
import { adminService } from "../../services/adminService";
import toast from "react-hot-toast";
import ProductBrowserModal from "./ProductBrowserModal";
import { resolveLegacyCmsAsset } from "../../../user/utils/legacyCmsAssets";

// Import default assets
import catPendant from "../../../user/assets/cat_pendant_wine.png";
import catRing from "../../../user/assets/cat_ring_wine.png";
import catEarrings from "../../../user/assets/cat_earrings_wine.png";
import catBracelet from "../../../user/assets/cat_bracelet_wine.png";
import catAnklet from "../../../user/assets/cat_anklet_wine.png";
import catChain from "../../../user/assets/cat_chain_wine.png";
import goldRingsGreen from "../../../user/assets/categories/gold_rings_green.png";
import goldEarringsGreen from "../../../user/assets/categories/gold_earrings_green.png";
import goldPendantsGreen from "../../../user/assets/categories/gold_pendants_green.png";
import goldBraceletsGreen from "../../../user/assets/categories/gold_bracelets_green.png";
import goldNosepinsGreen from "../../../user/assets/categories/gold_nosepins_green.png";
import goldMangalsutraGreen from "../../../user/assets/categories/gold_mangalsutra_green.png";
import goldBanglesGreen from "../../../user/assets/categories/gold_bangles_green.png";
import goldSetsGreen from "../../../user/assets/categories/gold_sets_green.png";
import goldNewArrivalsGreen from "../../../user/assets/categories/gold_new_arrivals_green.png";
import goldDailyWearBanner from "../../../user/assets/explore/gold_daily_wear_banner_1775911015640.png";
import goldOfficeWearBanner from "../../../user/assets/explore/gold_office_wear_banner_1775911038204.png";
import goldLuxuryRange10k from "../../../user/assets/luxury_range_10k.png";
import goldLuxuryRange15k from "../../../user/assets/luxury_range_15k.png";
import goldLuxuryRange20k from "../../../user/assets/premium_ring_product.png";
import goldLuxuryPremium from "../../../user/assets/beyond_bold_emerald_set.png";
import goldColorYellow from "../../../user/assets/gold_color_yellow.png";
import goldColorRose from "../../../user/assets/gold_color_rose.png";
import goldColorWhite from "../../../user/assets/gold_color_white.png";
import goldColorDual from "../../../user/assets/gold_color_dual.png";
import goldLifestyleCasual from "../../../user/assets/lifestyle_casual.png";
import goldLifestyleParty from "../../../user/assets/lifestyle_party.png";
import goldLifestyleTraditional from "../../../user/assets/lifestyle_traditional.png";
import goldLifestyleMinimalistic from "../../../user/assets/lifestyle_minimalistic.png";
import goldLifestyleTwinning from "../../../user/assets/lifestyle_twinning.png";
import goldLifestyleDateNight from "../../../user/assets/lifestyle_date_night.png";
import goldLifestyleGiftCard from "../../../user/assets/lifestyle_gift_card.png";
import giftWifeSilver from "../../../user/assets/gift_wife_silver.png";
import giftGfSilver from "../../../user/assets/gift_gf_silver.png";
import giftMotherSilver from "../../../user/assets/gift_mother_silver.png";
import giftSisterSilver from "../../../user/assets/gift_sister_silver.png";
import { useDraftState } from "../../hooks/useDraftState";

const CategoryShowcaseEditor = ({ sectionData, onSave, defaultItems = [] }) => {
  const navigate = useNavigate();
  const sectionId =
    sectionData?.sectionKey || sectionData?.id || "category-showcase";
  const sectionPageKey =
    sectionData?.pageKey ||
    (String(sectionData?.sectionId || "").startsWith("shop-women:")
      ? "shop-women"
      : String(sectionData?.sectionId || "").startsWith("shop-family:")
        ? "shop-family"
        : String(sectionData?.sectionId || "").startsWith("gold-collection:")
          ? "gold-collection"
          : "");
  const isShopWomenSection = sectionPageKey === "shop-women";
  const isShopFamilySection = sectionPageKey === "shop-family";
  const isGoldCollectionSection = sectionPageKey === "gold-collection";
  const isGoldCategoryGridSection =
    sectionId === "gold-category-grid" && isGoldCollectionSection;
  const isGoldShopByColourSection =
    sectionId === "gold-shop-by-colour" && isGoldCollectionSection;
  const isGoldCuratedBondSection =
    sectionId === "gold-curated-bond" && isGoldCollectionSection;
  const isGoldCuratedShowcaseSection =
    sectionId === "gold-curated-showcase" && isGoldCollectionSection;
  const isGoldLifestyleGridSection =
    sectionId === "gold-lifestyle-grid" && isGoldCollectionSection;
  const isGoldExploreCollectionsSection =
    sectionId === "gold-explore-collections" && isGoldCollectionSection;
  const isGoldNewLaunchBannerSection =
    sectionId === "gold-new-launch-banner" && isGoldCollectionSection;
  const isGoldExclusiveLaunchSection =
    sectionId === "gold-exclusive-launch" && isGoldCollectionSection;
  const isGoldRingCarouselSection =
    sectionId === "gold-ring-carousel" && isGoldCollectionSection;
  const isGoldLuxuryWithinReach =
    sectionId === "gold-luxury-within-reach" && isGoldCollectionSection;
  const isGoldCategoryLinkedSection =
    isGoldCategoryGridSection ||
    isGoldShopByColourSection ||
    isGoldCuratedBondSection ||
    isGoldCuratedShowcaseSection ||
    isGoldLifestyleGridSection ||
    isGoldRingCarouselSection;
  const isFixedWomenPriceRange =
    sectionId === "price-range-showcase" && isShopWomenSection;
  const isWomenTrendingGrid =
    sectionId === "categories-grid" && isShopWomenSection;
  const isWomenCuratedCollections =
    sectionId === "curated-collections" && isShopWomenSection;
  const isWomenOccasionCarousel =
    sectionId === "occasion-carousel" && isShopWomenSection;
  const isWomenDiscoverHue = sectionId === "discover-hue" && isShopWomenSection;
  const isWomenPromoBanners =
    sectionId === "promo-banners" && isShopWomenSection;
  const isFamilyCuratedCollections =
    sectionId === "collections" && isShopFamilySection;
  const isFamilyTrendingNearYou =
    sectionId === "trending-near-you" && isShopFamilySection;
  const isFamilyGiftsToRemember =
    sectionId === "gifts-to-remember" && isShopFamilySection;
  const isWomenCategoryLinkedSection =
    isWomenTrendingGrid || isWomenOccasionCarousel;
  const isFamilyCategoryLinkedSection =
    isFamilyTrendingNearYou || isFamilyGiftsToRemember;
  const isCategoryShowcase =
    sectionId === "category-showcase" ||
    sectionData?.sectionType === "category-showcase";
  const isCategoryGrid =
    sectionId === "category-grid" ||
    sectionData?.sectionType === "category-grid";
  const isLuxuryWithinReach =
    sectionId === "luxury-within-reach" || isGoldLuxuryWithinReach;
  const isFamilyLuxuryWithinReach = isLuxuryWithinReach && isShopFamilySection;
  const isCategoryDrivenSection =
    (isCategoryShowcase || isCategoryGrid) && !isFamilyCuratedCollections;
  const isPremiumCategoryCards = sectionId === "premium-category-cards";
  const isFixedWomenDiscoverHue = isWomenDiscoverHue;
  const isFixedWomenPromoBanners = isWomenPromoBanners;
  const defaultMostGiftedHero = defaultItems.find(
    (item) => item?.type === "hero",
  ) || {
    id: "hero",
    type: "hero",
    name: "Most Gifted Items",
    label: "Most Gifted Items",
    image: "",
    path: "/shop?sort=most-sold",
    tag: "Collection Focus",
    ctaLabel: "Explore Collection",
  };

  // Default items to show if new
  const defaultFallbackItems = isGoldCategoryGridSection
    ? [
        {
          id: "1",
          name: "Gold Rings",
          path: "/shop?metal=gold&category=rings",
          image: goldRingsGreen,
          tag: "",
        },
        {
          id: "2",
          name: "Gold Earrings",
          path: "/shop?metal=gold&category=earrings",
          image: goldEarringsGreen,
          tag: "",
        },
        {
          id: "3",
          name: "Gold Pendants",
          path: "/shop?metal=gold&category=necklaces",
          image: goldPendantsGreen,
          tag: "",
        },
        {
          id: "4",
          name: "Gold Bracelets",
          path: "/shop?metal=gold&category=bracelets",
          image: goldBraceletsGreen,
          tag: "",
        },
        {
          id: "5",
          name: "Gold Nose Pins",
          path: "/shop?metal=gold&category=nose-pins",
          image: goldNosepinsGreen,
          tag: "",
        },
        {
          id: "6",
          name: "Gold Mangalsutra",
          path: "/shop?metal=gold&category=mangalsutras",
          image: goldMangalsutraGreen,
          tag: "",
        },
        {
          id: "7",
          name: "Gold Bangles",
          path: "/shop?metal=gold&category=bangles",
          image: goldBanglesGreen,
          tag: "",
        },
        {
          id: "8",
          name: "Gold Sets",
          path: "/shop?metal=gold&category=sets",
          image: goldSetsGreen,
          tag: "",
        },
        {
          id: "9",
          name: "New Arrivals",
          path: "/shop?metal=gold&filter=new",
          image: goldNewArrivalsGreen,
          tag: "New",
        },
      ]
    : isGoldShopByColourSection
      ? [
          {
            id: "gold-colour-1",
            name: "Yellow Gold",
            label: "Yellow Gold",
            image: goldColorYellow,
            categoryId: "",
            path: "/shop?metal=gold&search=Yellow Gold",
            tag: "",
          },
          {
            id: "gold-colour-2",
            name: "Rose Gold",
            label: "Rose Gold",
            image: goldColorRose,
            categoryId: "",
            path: "/shop?metal=gold&search=Rose Gold",
            tag: "",
          },
          {
            id: "gold-colour-3",
            name: "White Gold",
            label: "White Gold",
            image: goldColorWhite,
            categoryId: "",
            path: "/shop?metal=gold&search=White Gold",
            tag: "",
          },
          {
            id: "gold-colour-4",
            name: "Dual tone Gold",
            label: "Dual tone Gold",
            image: goldColorDual,
            categoryId: "",
            path: "/shop?metal=gold&search=Dual tone Gold",
            tag: "",
          },
        ]
      : isGoldCuratedBondSection
        ? [
            {
              id: "gold-bond-1",
              name: "Wife",
              label: "Wife",
              image: giftWifeSilver,
              categoryId: "",
              path: "/shop?metal=gold&search=wife",
              tag: "",
            },
            {
              id: "gold-bond-2",
              name: "Girlfriend",
              label: "Girlfriend",
              image: giftGfSilver,
              categoryId: "",
              path: "/shop?metal=gold&search=girlfriend",
              tag: "",
            },
            {
              id: "gold-bond-3",
              name: "Mother",
              label: "Mother",
              image: giftMotherSilver,
              categoryId: "",
              path: "/shop?metal=gold&search=mother",
              tag: "",
            },
            {
              id: "gold-bond-4",
              name: "Sister",
              label: "Sister",
              image: giftSisterSilver,
              categoryId: "",
              path: "/shop?metal=gold&search=sister",
              tag: "",
            },
          ]
        : isGoldCuratedShowcaseSection
          ? [
              {
                id: "gold-curated-showcase-1",
                name: "The Gold Standards",
                label: "The Gold Standards",
                image: goldRingsGreen,
                categoryId: "",
                path: "/shop?metal=gold&category=rings",
                tag: "",
              },
              {
                id: "gold-curated-showcase-2",
                name: "Pure Green Favourites",
                label: "Pure Green Favourites",
                image: goldRingsGreen,
                categoryId: "",
                path: "/shop?metal=gold&category=rings",
                tag: "",
              },
              {
                id: "gold-curated-showcase-3",
                name: "Shubh Akshaya Tritiya",
                label: "Shubh Akshaya Tritiya",
                image: goldRingsGreen,
                categoryId: "",
                path: "/shop?metal=gold&category=rings",
                tag: "",
              },
              {
                id: "gold-curated-showcase-4",
                name: "Sands Jewels",
                label: "Sands Jewels",
                image: goldRingsGreen,
                categoryId: "",
                path: "/shop?metal=gold&category=rings",
                tag: "",
              },
              {
                id: "gold-curated-showcase-5",
                name: "Crafted in Pure Gold",
                label: "Crafted in Pure Gold",
                image: goldRingsGreen,
                categoryId: "",
                path: "/shop?metal=gold&category=rings",
                tag: "",
              },
              {
                id: "gold-curated-showcase-6",
                name: "Luxury Ring Sets",
                label: "Luxury Ring Sets",
                image: goldRingsGreen,
                categoryId: "",
                path: "/shop?metal=gold&category=rings",
                tag: "",
              },
            ]
          : isGoldLifestyleGridSection
            ? [
                {
                  id: "gold-lifestyle-1",
                  name: "Casual Wear",
                  label: "Casual Wear",
                  image: goldLifestyleCasual,
                  categoryId: "",
                  path: "/shop?metal=gold&search=casual",
                  tag: "",
                },
                {
                  id: "gold-lifestyle-2",
                  name: "Party Wear",
                  label: "Party Wear",
                  image: goldLifestyleParty,
                  categoryId: "",
                  path: "/shop?metal=gold&search=party",
                  tag: "",
                },
                {
                  id: "gold-lifestyle-3",
                  name: "Gold Gift Card",
                  label: "Gold Gift Card",
                  image: goldLifestyleGiftCard,
                  categoryId: "",
                  path: "/shop?metal=gold",
                  tag: "",
                },
                {
                  id: "gold-lifestyle-4",
                  name: "Twinning",
                  label: "Twinning",
                  image: goldLifestyleTwinning,
                  categoryId: "",
                  path: "/shop?metal=gold",
                  tag: "",
                },
                {
                  id: "gold-lifestyle-5",
                  name: "Traditional",
                  label: "Traditional",
                  image: goldLifestyleTraditional,
                  categoryId: "",
                  path: "/shop?metal=gold&search=traditional",
                  tag: "",
                },
                {
                  id: "gold-lifestyle-6",
                  name: "Traditional",
                  label: "Traditional",
                  image: goldLifestyleTraditional,
                  categoryId: "",
                  path: "/shop?metal=gold&search=traditional",
                  tag: "",
                },
                {
                  id: "gold-lifestyle-7",
                  name: "Minimalistic",
                  label: "Minimalistic",
                  image: goldLifestyleMinimalistic,
                  categoryId: "",
                  path: "/shop?metal=gold",
                  tag: "",
                },
                {
                  id: "gold-lifestyle-8",
                  name: "Date Nights",
                  label: "Date Nights",
                  image: goldLifestyleDateNight,
                  categoryId: "",
                  path: "/shop?metal=gold&search=date-night",
                  tag: "",
                },
              ]
            : isGoldExploreCollectionsSection
              ? [
                  {
                    id: "gold-explore-1",
                    name: "DAILY WEAR",
                    label: "DAILY WEAR",
                    subtitle:
                      "Minimalist gold pieces for your everyday sparkle",
                    description:
                      "Minimalist gold pieces for your everyday sparkle",
                    image: goldDailyWearBanner,
                    categoryId: "",
                    path: "/shop?metal=gold",
                    tag: "EFFORTLESS EVERYDAY",
                    extraImages: [
                      goldRingsGreen,
                      goldEarringsGreen,
                      goldPendantsGreen,
                    ],
                  },
                  {
                    id: "gold-explore-2",
                    name: "OFFICE WEAR",
                    label: "OFFICE WEAR",
                    subtitle: "Sophisticated designs for the modern workplace",
                    description:
                      "Sophisticated designs for the modern workplace",
                    image: goldOfficeWearBanner,
                    categoryId: "",
                    path: "/shop?metal=gold",
                    tag: "PROFESSIONAL CHIC",
                    extraImages: [
                      goldBraceletsGreen,
                      goldRingsGreen,
                      goldEarringsGreen,
                    ],
                  },
                  {
                    id: "gold-explore-3",
                    name: "PARTY WEAR",
                    label: "PARTY WEAR",
                    subtitle:
                      "Extravagant gold jewelry for those special moments",
                    description:
                      "Extravagant gold jewelry for those special moments",
                    image: goldDailyWearBanner,
                    categoryId: "",
                    path: "/shop?metal=gold",
                    tag: "CELEBRATION READY",
                    extraImages: [
                      goldPendantsGreen,
                      goldBraceletsGreen,
                      goldRingsGreen,
                    ],
                  },
                ]
              : isGoldNewLaunchBannerSection
                ? [
                    {
                      id: "gold-new-launch-1",
                      name: "Rings",
                      label: "Rings",
                      image: goldRingsGreen,
                      categoryId: "",
                      path: "/shop?metal=gold&category=rings",
                      tag: "",
                    },
                    {
                      id: "gold-new-launch-2",
                      name: "Pendants",
                      label: "Pendants",
                      image: goldPendantsGreen,
                      categoryId: "",
                      path: "/shop?metal=gold&category=necklaces",
                      tag: "",
                    },
                    {
                      id: "gold-new-launch-3",
                      name: "Earrings",
                      label: "Earrings",
                      image: goldEarringsGreen,
                      categoryId: "",
                      path: "/shop?metal=gold&category=earrings",
                      tag: "",
                    },
                  ]
                : isGoldExclusiveLaunchSection
                  ? [
                      {
                        id: "gold-exclusive-1",
                        name: "SOULitaire",
                        label: "SOULitaire",
                        subtitle: "Solitaire Collection",
                        description: "Solitaire Collection",
                        image: goldRingsGreen,
                        categoryId: "",
                        path: "/shop?metal=gold&category=rings",
                        tag: "",
                      },
                      {
                        id: "gold-exclusive-2",
                        name: "Beyond Bold",
                        label: "Beyond Bold",
                        subtitle: "Statement Collection",
                        description: "Statement Collection",
                        image: goldSetsGreen,
                        categoryId: "",
                        path: "/shop?metal=gold&category=sets",
                        tag: "",
                      },
                    ]
                  : isGoldRingCarouselSection
                    ? [
                        {
                          id: "gold-ring-1",
                          name: "Solitaire Ring",
                          label: "Solitaire Ring",
                          image: goldRingsGreen,
                          categoryId: "",
                          path: "/shop?metal=gold&category=rings",
                          tag: "",
                        },
                        {
                          id: "gold-ring-2",
                          name: "Promise Ring",
                          label: "Promise Ring",
                          image: goldRingsGreen,
                          categoryId: "",
                          path: "/shop?metal=gold&category=rings",
                          tag: "",
                        },
                        {
                          id: "gold-ring-3",
                          name: "9kt Ring",
                          label: "9kt Ring",
                          image: goldRingsGreen,
                          categoryId: "",
                          path: "/shop?metal=gold&category=rings",
                          tag: "",
                        },
                        {
                          id: "gold-ring-4",
                          name: "Vanki Ring",
                          label: "Vanki Ring",
                          image: goldRingsGreen,
                          categoryId: "",
                          path: "/shop?metal=gold&category=rings",
                          tag: "",
                        },
                        {
                          id: "gold-ring-5",
                          name: "Rose Gold Ring",
                          label: "Rose Gold Ring",
                          image: goldRingsGreen,
                          categoryId: "",
                          path: "/shop?metal=gold&category=rings",
                          tag: "",
                        },
                        {
                          id: "gold-ring-6",
                          name: "Classic Ring",
                          label: "Classic Ring",
                          image: goldRingsGreen,
                          categoryId: "",
                          path: "/shop?metal=gold&category=rings",
                          tag: "",
                        },
                      ]
                    : isGoldLuxuryWithinReach
                      ? [
                          {
                            id: "gold-luxury-1",
                            name: "Under INR 10000",
                            label: "Under INR 10000",
                            priceMax: 10000,
                            image: goldLuxuryRange10k,
                            categoryId: "",
                            path: "/shop?metal=gold&price_max=10000",
                            tag: "",
                          },
                          {
                            id: "gold-luxury-2",
                            name: "Under INR 15000",
                            label: "Under INR 15000",
                            priceMax: 15000,
                            image: goldLuxuryRange15k,
                            categoryId: "",
                            path: "/shop?metal=gold&price_max=15000",
                            tag: "",
                          },
                          {
                            id: "gold-luxury-3",
                            name: "Under INR 20000",
                            label: "Under INR 20000",
                            priceMax: 20000,
                            image: goldLuxuryRange20k,
                            categoryId: "",
                            path: "/shop?metal=gold&price_max=20000",
                            tag: "",
                          },
                          {
                            id: "gold-luxury-4",
                            name: "Premium Gifts",
                            label: "Premium Gifts",
                            priceMax: 25000,
                            image: goldLuxuryPremium,
                            categoryId: "",
                            path: "/shop?metal=gold&price_max=25000",
                            tag: "",
                          },
                        ]
                      : [
                          {
                            id: "1",
                            name: "Pendants",
                            path: "/category/pendants",
                            image: catPendant,
                            tag: "",
                          },
                          {
                            id: "2",
                            name: "Rings",
                            path: "/category/rings",
                            image: catRing,
                            tag: "",
                          },
                          {
                            id: "3",
                            name: "Earrings",
                            path: "/category/earrings",
                            image: catEarrings,
                            tag: "",
                          },
                          {
                            id: "4",
                            name: "Bracelets",
                            path: "/category/bracelets",
                            image: catBracelet,
                            tag: "",
                          },
                          {
                            id: "5",
                            name: "Anklets",
                            path: "/category/anklets",
                            image: catAnklet,
                            tag: "",
                          },
                          {
                            id: "6",
                            name: "Chains",
                            path: "/category/chains",
                            image: catChain,
                            tag: "",
                          },
                        ];

  const initialItemsFromProps =
    sectionData.items && sectionData.items.length > 0
      ? sectionId === "most-gifted" &&
        !sectionData.items.some((item) => item?.type === "hero")
        ? [defaultMostGiftedHero, ...sectionData.items]
        : sectionData.items
      : defaultItems.length > 0
        ? defaultItems
        : defaultFallbackItems;

  const [items, setItems] = useDraftState(
    `draft_items_${sectionData?.sectionKey || sectionData?.id || ""}_${sectionData?.pageKey || ""}`,
    initialItemsFromProps,
  );
  const [settings, setSettings] = useDraftState(
    `draft_settings_${sectionData?.sectionKey || sectionData?.id || ""}_${sectionData?.pageKey || ""}`,
    sectionData.settings || {},
  );

  const handleSettingChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSettingsImageUpload = async (file, field = "bannerImage") => {
    if (!file) return;
    const uploadedUrl = await adminService.uploadSectionImage(file);
    if (uploadedUrl) {
      handleSettingChange(field, uploadedUrl);
      return;
    }
    toast.error("Process failed. Please try again.");
  };
  const [editingId, setEditingId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [productPickerTarget, setProductPickerTarget] = useState(null);

  useEffect(() => {
    setSettings(sectionData.settings || {});
  }, [sectionData.settings]);

  const parsePriceValue = (value) => {
    if (value === undefined || value === null) return null;
    const cleaned = String(value).replace(/[^0-9]/g, "");
    if (!cleaned) return null;
    const numeric = Number(cleaned);
    return Number.isFinite(numeric) ? numeric : null;
  };

  const getPriceMaxFromItem = (item) => {
    if (!item) return null;
    if (
      item.priceMax !== undefined &&
      item.priceMax !== null &&
      item.priceMax !== ""
    ) {
      return parsePriceValue(item.priceMax);
    }
    if (item.price !== undefined && item.price !== null && item.price !== "") {
      return parsePriceValue(item.price);
    }
    if (item.path && String(item.path).includes("price_max=")) {
      const query = item.path.split("price_max=")[1]?.split("&")[0];
      const parsed = parsePriceValue(query);
      if (parsed) return parsed;
    }
    if (item.name) {
      const parsed = parsePriceValue(item.name);
      if (parsed) return parsed;
    }
    return null;
  };

  const buildPriceRangePath = (priceMax) => {
    if (!priceMax) return "/shop";
    if (isFamilyLuxuryWithinReach) {
      return `/shop?source=family&filter=family&price_max=${priceMax}`;
    }
    if (isFixedWomenPriceRange) {
      return `/shop?source=women&filter=womens&price_max=${priceMax}`;
    }
    return `/shop?price_max=${priceMax}`;
  };

  const buildWomenCategoryPath = (categoryId, currentPath = "") => {
    if (categoryId)
      return `/shop?source=women&filter=womens&category=${encodeURIComponent(categoryId)}`;
    return currentPath || "/shop?source=women&filter=womens";
  };

  const buildFamilyCategoryPath = (categoryId, currentPath = "") => {
    if (categoryId)
      return `/shop?source=family&filter=family&category=${encodeURIComponent(categoryId)}`;
    return currentPath || "/shop?source=family&filter=family";
  };

  const buildGoldCategoryPath = (categoryId, currentPath = "") => {
    const normalizedCategoryId = String(categoryId || "").trim();
    const source = String(currentPath || "").trim();

    if (normalizedCategoryId) {
      return `/shop?metal=gold&category=${encodeURIComponent(normalizedCategoryId)}`;
    }
    if (!source || !source.startsWith("/shop")) {
      return "/shop?metal=gold";
    }

    const queryString = source.includes("?") ? source.split("?")[1] : "";
    const params = new URLSearchParams(queryString);
    params.set("metal", "gold");

    const query = params.toString();
    return `/shop${query ? `?${query}` : ""}`;
  };

  const buildGoldPriceRangePath = (
    priceMax,
    categoryId = "",
    currentPath = "",
  ) => {
    const normalizedPrice = parsePriceValue(priceMax);
    const source = String(currentPath || "").trim();
    const query =
      source.startsWith("/shop") && source.includes("?")
        ? source.split("?")[1]
        : "";
    const params = new URLSearchParams(query);
    params.set("metal", "gold");
    if (normalizedPrice) params.set("price_max", String(normalizedPrice));
    else params.delete("price_max");
    const normalizedCategoryId = String(categoryId || "").trim();
    if (normalizedCategoryId) params.set("category", normalizedCategoryId);
    else params.delete("category");
    const nextQuery = params.toString();
    return `/shop${nextQuery ? `?${nextQuery}` : "?metal=gold"}`;
  };

  const fixedWomenPriceDefaults = [
    { id: "women-under-1299", priceMax: 1299, tag: "EVERYDAY ESSENTIALS" },
    { id: "women-under-1499", priceMax: 1499, tag: "ELEGANT CHARMS" },
    { id: "women-under-1999", priceMax: 1999, tag: "LUXURY STATEMENTS" },
  ];

  const fixedWomenHueDefaults = [
    { id: "women-hue-1", name: "Pure 925 Silver" },
    { id: "women-hue-2", name: "Gold Plated" },
    { id: "women-hue-3", name: "Rose Gold Plated" },
    { id: "women-hue-4", name: "Oxidised Silver" },
  ];

  const fixedWomenPromoDefaults = [
    {
      id: "women-promo-1",
      name: "Couple Rings",
      subtitle: "Eternal Bonds in Silver",
      tag: "Exclusive",
      ctaLabel: "Shop Now",
    },
    {
      id: "women-promo-2",
      name: "Premium Gifts",
      subtitle: "Luxury for your Loved Ones",
      tag: "Exclusive",
      ctaLabel: "Shop Now",
    },
  ];

  const parseLimitValue = (value) => {
    if (value === undefined || value === null) return null;
    const cleaned = String(value).replace(/[^0-9]/g, "");
    if (!cleaned) return null;
    const numeric = Number(cleaned);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  };

  const getLimitFromItem = (item) => {
    if (!item) return null;
    if (item.limit !== undefined && item.limit !== null && item.limit !== "") {
      return parseLimitValue(item.limit);
    }
    if (item.path && String(item.path).includes("limit=")) {
      const query = item.path.split("limit=")[1]?.split("&")[0];
      const parsed = parseLimitValue(query);
      if (parsed) return parsed;
    }
    return null;
  };

  useEffect(() => {
    const fetchCategories = async () => {
      const data = await adminService.getCategories();
      setCategories(data || []);
    };
    fetchCategories();
  }, []);

  // Initial Load & Restoration Logic
  useEffect(() => {
    // 1. Check if we have draft items from before navigation
    const draftItemsString = localStorage.getItem(`${sectionId}_draftItems`);
    let currentItems = draftItemsString
      ? JSON.parse(draftItemsString)
      : initialItemsFromProps;

    // 2. Check if we have returned with selected products
    const returnedProductsString = localStorage.getItem(
      "temp_selected_products",
    );
    const targetId = localStorage.getItem(`${sectionId}_targetId`);

    const shouldApplyReturn = Boolean(
      returnedProductsString && draftItemsString,
    );

    if (shouldApplyReturn) {
      const products = JSON.parse(returnedProductsString);

      if (products.length > 0) {
        const product = products[0]; // Take first product
        const productId = product._id || product.id;
        const newItemData = {
          productId,
          name: product.name,
          path: `/product/${productId}`,
          image: product.image || (product.images && product.images[0]) || "",
          tag: product.discount || "",
        };

        if (targetId) {
          // Replace specific item
          currentItems = currentItems.map((item) =>
            item.id === targetId ? { ...item, ...newItemData } : item,
          );
        } else {
          // Add new item (fallback if no target, though we removed global add)
          const newItem = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            ...newItemData,
          };
          // Append new items, ensuring no duplicates based on productId if it exists
          const existingProductIds = new Set(
            currentItems.map((item) => item.productId).filter(Boolean),
          );
          if (!existingProductIds.has(newItem.productId)) {
            currentItems = [...currentItems, newItem];
          }
        }
      }

      // Cleanup (consume only for the originating section)
      localStorage.removeItem("temp_selected_products");
      localStorage.removeItem(`${sectionId}_draftItems`); // Clear draft after successful merge
      localStorage.removeItem(`${sectionId}_targetId`);
      setItems(currentItems);
    } else if (draftItemsString) {
      // If there are draft items but no new products, restore the draft
      setItems(currentItems);
      // Clear the draft so it doesn't permanently override future loads
      localStorage.removeItem(`${sectionId}_draftItems`);
      localStorage.removeItem(`${sectionId}_targetId`);
    }
  }, [initialItemsFromProps, sectionId]);

  useEffect(() => {
    if (
      !isCategoryDrivenSection ||
      isWomenCuratedCollections ||
      categories.length === 0
    )
      return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.categoryId) return item;
        const resolved = getCategoryFromItem(item);
        if (!resolved) return item;
        return {
          ...item,
          categoryId: resolved._id,
          name:
            isWomenCategoryLinkedSection ||
            isFamilyCategoryLinkedSection ||
            isGoldCategoryLinkedSection
              ? item.name || resolved.name
              : resolved.name,
          path: isWomenCategoryLinkedSection
            ? buildWomenCategoryPath(resolved._id, item.path)
            : isFamilyCategoryLinkedSection
              ? buildFamilyCategoryPath(resolved._id, item.path)
              : isGoldCategoryLinkedSection
                ? buildGoldCategoryPath(resolved._id, item.path)
                : isCategoryGrid
                  ? `/category/${resolved.slug || normalizeLabel(resolved.name)}`
                  : `/shop?category=${resolved._id}`,
          image: item.image || resolved.image || item.image,
          hoverImage: item.hoverImage || "",
        };
      }),
    );
  }, [
    categories,
    isCategoryDrivenSection,
    isCategoryGrid,
    isFamilyCategoryLinkedSection,
    isGoldCategoryLinkedSection,
    isWomenCategoryLinkedSection,
    isWomenCuratedCollections,
  ]);

  useEffect(() => {
    if (!isWomenCuratedCollections || categories.length === 0) return;
    setItems((prev) =>
      prev.map((item) => {
        const resolved =
          getCategoryFromItem(item) || inferWomenCategoryByHint(item);
        if (!resolved) return item;
        return {
          ...item,
          categoryId: resolved._id,
          path: buildWomenCategoryPath(resolved._id, item.path),
          name: item.name || resolved.name,
        };
      }),
    );
  }, [categories, isWomenCuratedCollections]);

  useEffect(() => {
    if (!isWomenTrendingGrid || categories.length === 0) return;
    setItems((prev) =>
      prev.map((item) => {
        const resolved =
          getCategoryFromItem(item) || inferWomenCategoryByHint(item);
        if (!resolved) return item;
        return {
          ...item,
          categoryId: resolved._id,
          path: buildWomenCategoryPath(resolved._id, item.path),
          name: item.name || resolved.name,
        };
      }),
    );
  }, [categories, isWomenTrendingGrid]);

  useEffect(() => {
    if (sectionId !== "price-range-showcase" && !isLuxuryWithinReach) return;
    setItems((prev) =>
      prev.map((item) => {
        const priceMax = getPriceMaxFromItem(item);
        if (!priceMax) return item;
        const resolvedCategoryId =
          item.categoryId || getCategoryFromItem(item)?._id || "";
        return {
          ...item,
          priceMax,
          name:
            isFamilyLuxuryWithinReach || isGoldLuxuryWithinReach
              ? item.name || `Under INR ${priceMax}`
              : `Under INR ${priceMax}`,
          path: isGoldLuxuryWithinReach
            ? buildGoldPriceRangePath(priceMax, resolvedCategoryId, item.path)
            : buildPriceRangePath(priceMax),
        };
      }),
    );
  }, [
    sectionId,
    isLuxuryWithinReach,
    isShopWomenSection,
    isFixedWomenPriceRange,
    isFamilyLuxuryWithinReach,
    isGoldLuxuryWithinReach,
    categories,
  ]);

  useEffect(() => {
    if (!isFixedWomenPriceRange) return;
    setItems((prev) =>
      fixedWomenPriceDefaults.map((fallback, index) => {
        const current = prev[index] || {};
        const priceMax = getPriceMaxFromItem(current) || fallback.priceMax;
        return {
          ...current,
          id: current.id || current.itemId || fallback.id,
          priceMax,
          price: String(priceMax),
          name: `Under INR ${priceMax}`,
          label: `Under INR ${priceMax}`,
          path: buildPriceRangePath(priceMax),
          tag: current.tag || fallback.tag,
        };
      }),
    );
  }, [isFixedWomenPriceRange]);

  useEffect(() => {
    if (!isFixedWomenDiscoverHue) return;
    setItems((prev) =>
      fixedWomenHueDefaults.map((fallback, index) => {
        const current = prev[index] || {};
        const resolvedCategory =
          getCategoryFromItem(current) || inferWomenCategoryByHint(current);
        const categoryId = resolvedCategory?._id || current.categoryId || "";
        return {
          ...current,
          id: current.id || current.itemId || fallback.id,
          name: current.name || fallback.name,
          label: current.label || current.name || fallback.name,
          categoryId: categoryId || current.categoryId,
          path: categoryId
            ? buildWomenCategoryPath(categoryId, current.path)
            : current.path || "/shop?source=women&filter=womens",
        };
      }),
    );
  }, [categories, isFixedWomenDiscoverHue]);

  useEffect(() => {
    if (!isFixedWomenPromoBanners) return;
    setItems((prev) =>
      fixedWomenPromoDefaults.map((fallback, index) => {
        const current = prev[index] || {};
        const resolvedCategory =
          getCategoryFromItem(current) || inferWomenCategoryByHint(current);
        const categoryId = resolvedCategory?._id || current.categoryId || "";
        return {
          ...current,
          id: current.id || current.itemId || fallback.id,
          name: current.name || fallback.name,
          label: current.label || current.name || fallback.name,
          subtitle:
            current.subtitle || current.description || fallback.subtitle,
          description:
            current.description || current.subtitle || fallback.subtitle,
          tag: current.tag || fallback.tag,
          ctaLabel: current.ctaLabel || fallback.ctaLabel,
          categoryId: categoryId || current.categoryId,
          path: categoryId
            ? buildWomenCategoryPath(categoryId, current.path)
            : current.path || "/shop?source=women&filter=womens",
        };
      }),
    );
  }, [categories, isFixedWomenPromoBanners]);

  useEffect(() => {
    if (sectionId !== "latest-drop") return;
    setItems((prev) =>
      prev.map((item) => {
        const category = getCategoryFromItem(item);
        const existingLimit = getLimitFromItem(item);
        const limit = category ? existingLimit || 12 : existingLimit || "";
        const next = { ...item, limit };
        if (category) {
          next.categoryId = category._id;
          next.path = `/shop?category=${category._id}&limit=${limit}&sort=latest`;
          if (!next.name) next.name = category.name;
        } else if (!next.path) {
          next.path = "";
        }
        return next;
      }),
    );
  }, [sectionId, categories]);

  useEffect(() => {
    if (sectionId !== "most-gifted") return;
    setItems((prev) =>
      prev.map((item) => {
        if (item?.type === "hero") {
          return {
            ...defaultMostGiftedHero,
            ...item,
            type: "hero",
            path: item.path || "/shop?sort=most-sold",
          };
        }
        const category = getCategoryFromItem(item);
        const next = { ...item };
        if (category) {
          next.categoryId = category._id;
          next.path = `/shop?category=${category._id}&sort=most-sold`;
          if (!next.name) next.name = category.name;
        } else if (!next.path) {
          next.path = "";
        }
        delete next.limit;
        return next;
      }),
    );
  }, [sectionId, categories]);

  useEffect(() => {
    if (sectionId !== "proposal-rings") return;
    setItems((prev) =>
      prev.map((item) => {
        const category = getCategoryFromItem(item);
        const next = { ...item };
        if (category) {
          next.categoryId = category._id;
          next.path = `/shop?category=${category._id}`;
          if (!next.name) next.name = category.name;
        } else if (!next.path) {
          next.path = "";
        }
        delete next.limit;
        return next;
      }),
    );
  }, [sectionId, categories]);

  useEffect(() => {
    if (sectionId !== "curated-for-you") return;
    setItems((prev) =>
      prev.map((item) => {
        const limit = getLimitFromItem(item) || 12;
        const productIds = Array.isArray(item.productIds)
          ? item.productIds
          : [];
        const path =
          productIds.length > 0
            ? `/shop?products=${encodeURIComponent(productIds.join(","))}`
            : `/shop?limit=${limit}&sort=random`;
        return {
          ...item,
          limit,
          productIds,
          path,
        };
      }),
    );
  }, [sectionId]);

  useEffect(() => {
    if (sectionId !== "style-it-your-way") return;
    setItems((prev) =>
      prev.map((item) => {
        const limit = getLimitFromItem(item) || 12;
        const productIds = Array.isArray(item.productIds)
          ? item.productIds
          : [];
        const path =
          productIds.length > 0
            ? `/shop?products=${encodeURIComponent(productIds.join(","))}`
            : `/shop?limit=${limit}&sort=random`;
        return {
          ...item,
          limit,
          productIds,
          path,
        };
      }),
    );
  }, [sectionId]);

  const handleItemChange = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          // If field is an index of extraImages, e.g., 'extraImage_0'
          if (field.startsWith("extraImage_")) {
            const index = parseInt(field.split("_")[1]);
            const newExtraImages = [...(item.extraImages || ["", "", ""])];
            newExtraImages[index] = value;
            return { ...item, extraImages: newExtraImages };
          }
          return { ...item, [field]: value };
        }
        return item;
      }),
    );
  };

  const handleImageUpload = async (id, file, field = "image") => {
    if (!file) return;
    const uploadedUrl = await adminService.uploadSectionImage(file);
    if (uploadedUrl) {
      handleItemChange(id, field, uploadedUrl);
      return;
    }
    toast.error("Image upload failed. Please try again.");
  };

  const removeItem = async (id) => {
    const itemToRemove = items.find((item) => item.id === id);
    if (sectionId === "most-gifted" && itemToRemove?.type === "hero") {
      toast.error("The hero card stays fixed for this section.");
      return;
    }
    const newItems = items.filter((item) => item.id !== id);
    setItems(newItems);
    if (editingId === id) setEditingId(null);
    await handleSave(newItems);
  };

  const saveCurrentItems = async () => {
    const result = await handleSave(items);
    return result !== false;
  };

  const addItem = () => {
    if (
      isFixedWomenDiscoverHue ||
      isFixedWomenPromoBanners ||
      isGoldShopByColourSection ||
      isGoldCuratedBondSection ||
      isGoldNewLaunchBannerSection ||
      isGoldExclusiveLaunchSection ||
      isGoldRingCarouselSection
    ) {
      return;
    }
    if (
      (isFamilyTrendingNearYou || isFamilyGiftsToRemember) &&
      items.length >= 12
    ) {
      toast.error("You can add up to 12 cards in this section.");
      return;
    }
    if (isGoldLifestyleGridSection && items.length >= 8) {
      toast.error("You can add up to 8 cards in this section.");
      return;
    }
    const defaultCategoryId = isGoldExploreCollectionsSection
      ? String(categories?.[0]?._id || "")
      : "";
    const newItem = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: isCategoryDrivenSection ? "" : "New Item",
      path: isCategoryDrivenSection ? "" : "/shop",
      image: "",
      tag: "",
      ...(isFamilyCuratedCollections
        ? { categoryId: "", path: "/shop?source=family&filter=family" }
        : {}),
      ...(sectionId === "price-range-showcase" || isLuxuryWithinReach
        ? { priceMax: "" }
        : {}),
      ...(sectionId === "latest-drop" ? { limit: "", categoryId: "" } : {}),
      ...(sectionId === "most-gifted" ? { categoryId: "" } : {}),
      ...(sectionId === "proposal-rings" ? { categoryId: "" } : {}),
      ...(sectionId === "new-launch" ? { categoryId: "" } : {}),
      ...(isWomenCuratedCollections ? { categoryId: "" } : {}),
      ...(isGoldCuratedShowcaseSection
        ? {
            name: "New Collection",
            label: "New Collection",
            categoryId: "",
            path: "/shop?metal=gold",
          }
        : {}),
      ...(isGoldExploreCollectionsSection
        ? {
            name: "New Collection",
            label: "New Collection",
            subtitle: "",
            description: "",
            categoryId: defaultCategoryId,
            path: buildGoldCategoryPath(defaultCategoryId, "/shop?metal=gold"),
            extraImages: ["", "", ""],
          }
        : {}),
      ...(sectionId === "curated-for-you" ? { limit: 12, productIds: [] } : {}),
      ...(sectionId === "style-it-your-way"
        ? { limit: 12, productIds: [] }
        : {}),
    };
    const nextItems = [newItem, ...items];
    setItems(nextItems);
    setEditingId(newItem.id);
    if (
      !isCategoryDrivenSection &&
      !isWomenCuratedCollections &&
      !isFamilyCuratedCollections &&
      !isGoldExploreCollectionsSection &&
      !isGoldCuratedShowcaseSection &&
      sectionId !== "price-range-showcase" &&
      !isLuxuryWithinReach &&
      sectionId !== "new-launch" &&
      sectionId !== "latest-drop" &&
      sectionId !== "most-gifted" &&
      sectionId !== "proposal-rings"
    ) {
      handleSave(nextItems);
    }
  };

  const handleRedirectToSelect = (itemId) => {
    // Save current state before navigating
    localStorage.setItem(`${sectionId}_draftItems`, JSON.stringify(items));
    if (itemId) {
      localStorage.setItem(`${sectionId}_targetId`, itemId);
    }
    navigate(
      `/admin/products?selectMode=true&returnUrl=/admin/sections/${sectionId}`,
    );
  };

  const handleProductPickerOpen = (itemId) => {
    setProductPickerTarget(itemId);
    setIsProductPickerOpen(true);
  };

  const handleProductPickerSelect = (selectedItems) => {
    const selectedIds = (selectedItems || [])
      .map((item) => item.id || item._id)
      .filter(Boolean);
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== productPickerTarget) return item;
        const existing = new Set(item.productIds || []);
        selectedIds.forEach((id) => existing.add(id));
        const productIds = Array.from(existing);
        const limit = getLimitFromItem(item) || 12;
        const path =
          productIds.length > 0
            ? `/shop?products=${encodeURIComponent(productIds.join(","))}&limit=${limit}&sort=random`
            : `/shop?limit=${limit}&sort=random`;
        return { ...item, productIds, path };
      }),
    );
    setIsProductPickerOpen(false);
    setProductPickerTarget(null);
  };

  const normalizeLabel = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const normalizeShowcaseCategoryHint = (value) =>
    normalizeLabel(value)
      .replace(/^(latest|fresh|new|most|gifted|proposal)-+/, "")
      .replace(
        /-+(drop|drops|collection|collections|edit|edits|pick|picks)$/g,
        "",
      )
      .replace(/^-+|-+$/g, "");

  const expandCategoryTokens = (value) => {
    const normalized = normalizeLabel(value);
    const tokens = new Set();
    if (!normalized) return tokens;

    tokens.add(normalized);

    if (normalized.endsWith("ies")) {
      tokens.add(`${normalized.slice(0, -3)}y`);
    }
    if (normalized.endsWith("es")) {
      tokens.add(normalized.slice(0, -2));
    }
    if (normalized.endsWith("s")) {
      tokens.add(normalized.slice(0, -1));
    }

    return new Set(Array.from(tokens).filter(Boolean));
  };

  const isRingCategory = (cat) => {
    const name = normalizeLabel(cat?.name || "");
    const slug = normalizeLabel(cat?.slug || cat?.path || "");
    return name.includes("ring") || slug.includes("ring");
  };

  const ringCategories = categories.filter(isRingCategory);

  const getCategoryFromPath = (path) => {
    if (!path || categories.length === 0) return null;
    try {
      if (path.startsWith("/category/")) {
        const slug = path.replace("/category/", "").split("?")[0];
        const slugTokens = expandCategoryTokens(slug);
        return (
          categories.find((c) => {
            const categoryTokens = new Set([
              ...expandCategoryTokens(c.slug || ""),
              ...expandCategoryTokens(c.name || ""),
            ]);
            return Array.from(slugTokens).some((token) =>
              categoryTokens.has(token),
            );
          }) || null
        );
      }
      if (path.includes("category=")) {
        const query = path.split("category=")[1]?.split("&")[0];
        const queryTokens = expandCategoryTokens(query);
        return (
          categories.find((c) => {
            if (String(c._id) === String(query)) return true;
            const categoryTokens = new Set([
              ...expandCategoryTokens(c.slug || ""),
              ...expandCategoryTokens(c.name || ""),
            ]);
            return Array.from(queryTokens).some((token) =>
              categoryTokens.has(token),
            );
          }) || null
        );
      }
    } catch (err) {
      return null;
    }
    return null;
  };

  const getCategoryFromItem = (item) => {
    if (!item) return null;
    if (item.categoryId && categories.length > 0) {
      const match = categories.find(
        (c) => String(c._id) === String(item.categoryId),
      );
      if (match) return match;
    }
    if (item.name) {
      const normalizedItemHint = normalizeShowcaseCategoryHint(item.name);
      const itemTokens = new Set([
        ...expandCategoryTokens(item.name),
        ...expandCategoryTokens(normalizedItemHint),
      ]);
      const byName = categories.find((c) => {
        const categoryTokens = new Set([
          ...expandCategoryTokens(c.name || ""),
          ...expandCategoryTokens(c.slug || c.path || ""),
        ]);
        return Array.from(itemTokens).some((token) =>
          categoryTokens.has(token),
        );
      });
      if (byName) return byName;
    }
    return getCategoryFromPath(item.path);
  };

  const inferWomenCategoryByHint = (item) => {
    if (!item || categories.length === 0) return null;
    const blob =
      `${item?.name || ""} ${item?.label || ""} ${item?.path || ""}`.toLowerCase();
    const hintMap = [
      { keys: ["ring", "rings", "stack"], token: "ring" },
      { keys: ["earring", "earrings", "office"], token: "earring" },
      { keys: ["chain", "layering", "layer"], token: "chain" },
      { keys: ["pendant", "spiritual", "gift"], token: "pendant" },
      { keys: ["set", "combo", "bridal", "date night"], token: "set" },
      { keys: ["anklet", "boho"], token: "anklet" },
      { keys: ["bangle"], token: "bangle" },
      { keys: ["bracelet"], token: "bracelet" },
      { keys: ["temple"], token: "pendant" },
      { keys: ["outing", "girl outing"], token: "earring" },
      { keys: ["party", "glam"], token: "chain" },
      { keys: ["wedding", "hitched"], token: "anklet" },
    ];

    for (const hint of hintMap) {
      if (!hint.keys.some((k) => blob.includes(k))) continue;
      const found = categories.find((cat) => {
        const name = String(cat?.name || "").toLowerCase();
        const slug = String(cat?.slug || cat?.path || "").toLowerCase();
        return name.includes(hint.token) || slug.includes(hint.token);
      });
      if (found) return found;
    }
    return null;
  };

  const canPreserveLegacyCategoryGridItem = (item) => {
    if (!item || getCategoryFromItem(item)) return false;
    const path = String(item.path || "");
    const hasLegacyCategoryPath =
      typeof item.path === "string" &&
      (path.startsWith("/category/") ||
        path.includes("category=") ||
        (path.startsWith("/shop?") && path.includes("source=men")) ||
        (path.startsWith("/shop?") && path.includes("source=women")) ||
        (path.startsWith("/shop?") && path.includes("source=family")));
    const hasUsableContent =
      Boolean((item.name || item.label || "").trim()) && Boolean(item.image);
    return hasLegacyCategoryPath && hasUsableContent;
  };

  const validateItems = (nextItems) => {
    const invalid = nextItems
      .map((item) => ({ item, category: getCategoryFromItem(item) }))
      .filter(
        ({ category }) =>
          category &&
          (category.isActive === false || category.showInCollection === false),
      );

    if (invalid.length > 0) {
      const names = invalid.map(({ category }) => category.name).join(", ");
      toast(`Warning: These categories are hidden or inactive: ${names}`, {
        icon: "⚠️",
        duration: 4000,
      });
      // We allow saving so the user doesn't get blocked from making other edits (like deletions)
      return true;
    }
    return true;
  };

  const handleSave = async (nextItems) => {
    if (!validateItems(nextItems)) return false;
    if (isPremiumCategoryCards) {
      const normalizedItems = nextItems.map((item, index) => {
        const fallbackItem = defaultItems[index] || {};
        return {
          ...item,
          name: item.name || fallbackItem.name || "",
          label:
            item.label ||
            item.name ||
            fallbackItem.label ||
            fallbackItem.name ||
            "",
          tag: item.tag || fallbackItem.tag || "",
          path: item.path || fallbackItem.path || "/shop",
        };
      });
      const result = await onSave({ items: normalizedItems });
      return result?.success !== false;
    }
    if (isFixedWomenDiscoverHue) {
      const normalizedItems = fixedWomenHueDefaults.map((fallback, index) => {
        const current = nextItems[index] || {};
        const category =
          getCategoryFromItem(current) || inferWomenCategoryByHint(current);
        const resolvedCategoryId = category?._id || current.categoryId || "";
        return {
          ...current,
          id: current.id || current.itemId || fallback.id,
          name: current.name || fallback.name,
          label: current.label || current.name || fallback.name,
          categoryId: resolvedCategoryId || undefined,
          path: resolvedCategoryId
            ? buildWomenCategoryPath(resolvedCategoryId, current.path)
            : current.path || "/shop?source=women&filter=womens",
        };
      });
      const missing = normalizedItems.filter(
        (item) => !(item.name || "").trim() || !item.image,
      );
      if (missing.length > 0) {
        toast.error("Each hue card needs title and image before saving.");
        return;
      }
      await onSave({ items: normalizedItems });
      return;
    }
    if (isFixedWomenPromoBanners) {
      const normalizedItems = fixedWomenPromoDefaults.map((fallback, index) => {
        const current = nextItems[index] || {};
        const category =
          getCategoryFromItem(current) || inferWomenCategoryByHint(current);
        const resolvedCategoryId = category?._id || current.categoryId || "";
        return {
          ...current,
          id: current.id || current.itemId || fallback.id,
          name: current.name || fallback.name,
          label: current.label || current.name || fallback.name,
          subtitle:
            current.subtitle || current.description || fallback.subtitle,
          description:
            current.description || current.subtitle || fallback.subtitle,
          tag: current.tag || fallback.tag,
          ctaLabel: current.ctaLabel || fallback.ctaLabel,
          categoryId: resolvedCategoryId || undefined,
          path: resolvedCategoryId
            ? buildWomenCategoryPath(resolvedCategoryId, current.path)
            : current.path || "/shop?source=women&filter=womens",
        };
      });
      const missing = normalizedItems.filter(
        (item) =>
          !(item.name || "").trim() ||
          !(item.subtitle || "").trim() ||
          !item.image,
      );
      if (missing.length > 0) {
        toast.error(
          "Each promo banner needs title, subtitle, and image before saving.",
        );
        return;
      }
      await onSave({ items: normalizedItems });
      return;
    }
    if (isGoldNewLaunchBannerSection) {
      const hasCategoryInPath = (path = "") =>
        /(^|[?&])category=/.test(String(path || "").split("?")[1] || "");
      const templates = [
        {
          id: "gold-new-launch-1",
          name: "Rings",
          label: "Rings",
          image: goldRingsGreen,
          path: "/shop?metal=gold&category=rings",
        },
        {
          id: "gold-new-launch-2",
          name: "Pendants",
          label: "Pendants",
          image: goldPendantsGreen,
          path: "/shop?metal=gold&category=necklaces",
        },
        {
          id: "gold-new-launch-3",
          name: "Earrings",
          label: "Earrings",
          image: goldEarringsGreen,
          path: "/shop?metal=gold&category=earrings",
        },
      ];

      const currentEditingItem = editingId
        ? nextItems.find((item) => item.id === editingId)
        : null;
      const editingCategoryId = String(
        currentEditingItem?.categoryId ||
          getCategoryFromItem(currentEditingItem)?._id ||
          "",
      ).trim();
      if (
        currentEditingItem &&
        !editingCategoryId &&
        !hasCategoryInPath(currentEditingItem?.path)
      ) {
        toast.error("Select a category for this card before saving.");
        return false;
      }

      const normalizedItems = templates.map((template, index) => {
        const current = nextItems[index] || {};
        const resolvedCategoryId = String(
          current.categoryId || getCategoryFromItem(current)?._id || "",
        ).trim();
        const title = String(
          current.name || current.label || template.name,
        ).trim();
        const sourcePath = current.path || template.path;
        return {
          ...current,
          id: current.id || current.itemId || template.id,
          name: title || template.name,
          label: current.label || title || template.label,
          image: current.image || template.image,
          categoryId: resolvedCategoryId || undefined,
          path: buildGoldCategoryPath(resolvedCategoryId, sourcePath),
          sortOrder: index,
        };
      });

      if (currentEditingItem) {
        const editingIndex = nextItems.findIndex(
          (item) => item.id === currentEditingItem.id,
        );
        const savedEditing =
          editingIndex >= 0 ? normalizedItems[editingIndex] : null;
        if (
          !savedEditing ||
          !(savedEditing.name || "").trim() ||
          !savedEditing.image
        ) {
          toast.error("Title and image are required before saving this card.");
          return false;
        }
      }

      const result = await onSave({ items: normalizedItems });
      return result?.success !== false;
    }
    if (isGoldExclusiveLaunchSection) {
      const hasCategoryInPath = (path = "") =>
        /(^|[?&])category=/.test(String(path || "").split("?")[1] || "");
      const templates = [
        {
          id: "gold-exclusive-1",
          name: "SOULitaire",
          label: "SOULitaire",
          subtitle: "Solitaire Collection",
          description: "Solitaire Collection",
          image: goldRingsGreen,
          path: "/shop?metal=gold&category=rings",
        },
        {
          id: "gold-exclusive-2",
          name: "Beyond Bold",
          label: "Beyond Bold",
          subtitle: "Statement Collection",
          description: "Statement Collection",
          image: goldSetsGreen,
          path: "/shop?metal=gold&category=sets",
        },
      ];

      const currentEditingItem = editingId
        ? nextItems.find((item) => item.id === editingId)
        : null;
      const editingCategoryId = String(
        currentEditingItem?.categoryId ||
          getCategoryFromItem(currentEditingItem)?._id ||
          "",
      ).trim();
      if (
        currentEditingItem &&
        !editingCategoryId &&
        !hasCategoryInPath(currentEditingItem?.path)
      ) {
        toast.error("Select a category for this card before saving.");
        return false;
      }

      const normalizedItems = templates.map((template, index) => {
        const current = nextItems[index] || {};
        const resolvedCategoryId = String(
          current.categoryId || getCategoryFromItem(current)?._id || "",
        ).trim();
        const title = String(
          current.name || current.label || template.name,
        ).trim();
        const subtitle = String(
          current.subtitle || current.description || template.subtitle,
        ).trim();
        const sourcePath = current.path || template.path;
        return {
          ...current,
          id: current.id || current.itemId || template.id,
          name: title || template.name,
          label: current.label || title || template.label,
          subtitle: subtitle || template.subtitle,
          description: current.description || subtitle || template.description,
          image: current.image || template.image,
          categoryId: resolvedCategoryId || undefined,
          path: buildGoldCategoryPath(resolvedCategoryId, sourcePath),
          sortOrder: index,
        };
      });

      if (currentEditingItem) {
        const editingIndex = nextItems.findIndex(
          (item) => item.id === currentEditingItem.id,
        );
        const savedEditing =
          editingIndex >= 0 ? normalizedItems[editingIndex] : null;
        if (
          !savedEditing ||
          !(savedEditing.name || "").trim() ||
          !(savedEditing.subtitle || savedEditing.description || "").trim() ||
          !savedEditing.image
        ) {
          toast.error(
            "Title, subtitle, and image are required before saving this card.",
          );
          return false;
        }
      }

      const result = await onSave({ items: normalizedItems });
      return result?.success !== false;
    }
    if (isGoldRingCarouselSection) {
      const hasCategoryInPath = (path = "") =>
        /(^|[?&])category=/.test(String(path || "").split("?")[1] || "");
      const templates = [
        {
          id: "gold-ring-1",
          name: "Solitaire Ring",
          label: "Solitaire Ring",
          image: goldRingsGreen,
          path: "/shop?metal=gold&category=rings",
        },
        {
          id: "gold-ring-2",
          name: "Promise Ring",
          label: "Promise Ring",
          image: goldRingsGreen,
          path: "/shop?metal=gold&category=rings",
        },
        {
          id: "gold-ring-3",
          name: "9kt Ring",
          label: "9kt Ring",
          image: goldRingsGreen,
          path: "/shop?metal=gold&category=rings",
        },
        {
          id: "gold-ring-4",
          name: "Vanki Ring",
          label: "Vanki Ring",
          image: goldRingsGreen,
          path: "/shop?metal=gold&category=rings",
        },
        {
          id: "gold-ring-5",
          name: "Rose Gold Ring",
          label: "Rose Gold Ring",
          image: goldRingsGreen,
          path: "/shop?metal=gold&category=rings",
        },
        {
          id: "gold-ring-6",
          name: "Classic Ring",
          label: "Classic Ring",
          image: goldRingsGreen,
          path: "/shop?metal=gold&category=rings",
        },
      ];

      const currentEditingItem = editingId
        ? nextItems.find((item) => item.id === editingId)
        : null;
      const editingCategoryId = String(
        currentEditingItem?.categoryId ||
          getCategoryFromItem(currentEditingItem)?._id ||
          "",
      ).trim();
      if (
        currentEditingItem &&
        !editingCategoryId &&
        !hasCategoryInPath(currentEditingItem?.path)
      ) {
        toast.error("Select a category for this card before saving.");
        return false;
      }

      const normalizedItems = templates.map((template, index) => {
        const current = nextItems[index] || {};
        const resolvedCategoryId = String(
          current.categoryId || getCategoryFromItem(current)?._id || "",
        ).trim();
        const title = String(
          current.name || current.label || template.name,
        ).trim();
        const sourcePath = current.path || template.path;
        return {
          ...current,
          id: current.id || current.itemId || template.id,
          categoryId: resolvedCategoryId || undefined,
          name: title || template.name,
          label: current.label || title || template.label,
          image: current.image || template.image,
          path: buildGoldCategoryPath(resolvedCategoryId, sourcePath),
          sortOrder: index,
        };
      });

      if (currentEditingItem) {
        const editingIndex = nextItems.findIndex(
          (item) => item.id === currentEditingItem.id,
        );
        const savedEditing =
          editingIndex >= 0 ? normalizedItems[editingIndex] : null;
        if (
          !savedEditing ||
          !(savedEditing.name || "").trim() ||
          !savedEditing.image
        ) {
          toast.error("Title and image are required before saving this card.");
          return false;
        }
      }

      const result = await onSave({ items: normalizedItems });
      return result?.success !== false;
    }
    if (isGoldExploreCollectionsSection) {
      const currentEditingItem = editingId
        ? nextItems.find((item) => item.id === editingId)
        : null;
      const editingCategoryId = String(
        currentEditingItem?.categoryId || "",
      ).trim();
      if (
        currentEditingItem &&
        !editingCategoryId &&
        !getCategoryFromItem(currentEditingItem)
      ) {
        toast.error("Select a category for this card before saving.");
        return false;
      }

      const normalizedItems = nextItems
        .map((item, index) => {
          const category = getCategoryFromItem(item);
          const resolvedCategoryId = String(
            item.categoryId || category?._id || "",
          ).trim();
          if (!resolvedCategoryId) return null;
          const title = String(
            item.name ||
              item.label ||
              category?.name ||
              `Collection ${index + 1}`,
          ).trim();
          const subtitle = String(
            item.subtitle || item.description || "",
          ).trim();
          const extraImages = Array.isArray(item.extraImages)
            ? item.extraImages.filter(Boolean).slice(0, 3)
            : [];
          return {
            ...item,
            id: item.id || item.itemId || `gold-explore-${index + 1}`,
            categoryId: resolvedCategoryId,
            name: title,
            label: item.label || title,
            subtitle,
            description: item.description || subtitle,
            path: buildGoldCategoryPath(resolvedCategoryId, item.path),
            extraImages,
          };
        })
        .filter(Boolean);

      const missingContent = normalizedItems.filter(
        (item) => !(item.name || "").trim() || !item.image,
      );
      if (missingContent.length > 0) {
        const labels = missingContent
          .map((item) => item.name || item.id || "Item")
          .join(", ");
        toast.error(
          `Each card needs title and image before saving. Missing: ${labels}`,
        );
        return false;
      }

      const result = await onSave({ items: normalizedItems });
      return result?.success !== false;
    }
    if (isGoldCuratedShowcaseSection) {
      const currentEditingItem = editingId
        ? nextItems.find((item) => item.id === editingId)
        : null;
      const editingCategoryId = String(
        currentEditingItem?.categoryId ||
          getCategoryFromItem(currentEditingItem)?._id ||
          "",
      ).trim();
      if (currentEditingItem && !editingCategoryId) {
        toast.error("Select a category for this card before saving.");
        return false;
      }

      const normalizedItems = nextItems
        .map((item, index) => {
          const category = getCategoryFromItem(item);
          const resolvedCategoryId = String(
            item.categoryId || category?._id || "",
          ).trim();
          if (!resolvedCategoryId) return null;
          const title = String(
            item.name ||
              item.label ||
              category?.name ||
              `Collection ${index + 1}`,
          ).trim();
          if (!title || !item.image) return null;

          return {
            ...item,
            id: item.id || item.itemId || `gold-curated-showcase-${index + 1}`,
            categoryId: resolvedCategoryId,
            name: title,
            label: item.label || title,
            path: buildGoldCategoryPath(resolvedCategoryId, item.path),
            sortOrder: item.sortOrder ?? index,
          };
        })
        .filter(Boolean);

      if (currentEditingItem) {
        const savedEditing = normalizedItems.find(
          (item) => item.id === currentEditingItem.id,
        );
        if (!savedEditing) {
          toast.error(
            "Title, image, and category are required before saving this card.",
          );
          return false;
        }
      }

      const result = await onSave({ items: normalizedItems });
      return result?.success !== false;
    }
    if (isGoldLifestyleGridSection) {
      const currentEditingItem = editingId
        ? nextItems.find((item) => item.id === editingId)
        : null;
      const editingCategoryId = String(
        currentEditingItem?.categoryId ||
          getCategoryFromItem(currentEditingItem)?._id ||
          "",
      ).trim();
      if (currentEditingItem && !editingCategoryId) {
        toast.error("Select a category for this card before saving.");
        return false;
      }

      const normalizedItems = nextItems
        .map((item, index) => {
          const category = getCategoryFromItem(item);
          const resolvedCategoryId = String(
            item.categoryId || category?._id || "",
          ).trim();
          if (!resolvedCategoryId) return null;
          const title = String(
            item.name ||
              item.label ||
              category?.name ||
              `Lifestyle ${index + 1}`,
          ).trim();
          if (!title || !item.image) return null;
          return {
            ...item,
            id: item.id || item.itemId || `gold-lifestyle-${index + 1}`,
            categoryId: resolvedCategoryId,
            name: title,
            label: item.label || title,
            path: buildGoldCategoryPath(resolvedCategoryId, item.path),
            sortOrder: item.sortOrder ?? index,
          };
        })
        .filter(Boolean)
        .slice(0, 8);

      if (currentEditingItem) {
        const savedEditing = normalizedItems.find(
          (item) => item.id === currentEditingItem.id,
        );
        if (!savedEditing) {
          toast.error(
            "Title, image, and category are required before saving this card.",
          );
          return false;
        }
      }

      const result = await onSave({ items: normalizedItems });
      return result?.success !== false;
    }
    if (isFamilyCuratedCollections) {
      const missing = nextItems.filter(
        (item) =>
          !getCategoryFromItem(item) &&
          !canPreserveLegacyCategoryGridItem(item),
      );
      if (missing.length > 0) {
        const labels = missing
          .map((item) => item.name || item.label || `Item ${item.id}`)
          .join(", ");
        toast.error(
          `Select a category for each item before saving. Missing: ${labels}`,
        );
        return false;
      }
      const normalizedItems = nextItems.map((item, index) => {
        const category = getCategoryFromItem(item);
        return {
          ...item,
          id: item.id || item.itemId || `family-collection-${index + 1}`,
          categoryId: category?._id || item.categoryId || "",
          name: (item.name || item.label || category?.name || "").trim(),
          label: (item.label || item.name || category?.name || "").trim(),
          path: category
            ? buildFamilyCategoryPath(category._id, item.path)
            : item.path || "/shop?source=family&filter=family",
        };
      });

      const missingContent = normalizedItems.filter(
        (item) => !(item.name || item.label || "").trim() || !item.image,
      );
      if (missingContent.length > 0) {
        toast.error(
          "Each family collection card needs title and image before saving.",
        );
        return;
      }

      const result = await onSave({ items: normalizedItems });
      return result?.success !== false;
    }
    if (isCategoryShowcase) {
      const missing = nextItems.filter((item) => !getCategoryFromItem(item));
      if (missing.length > 0) {
        toast.error("Select a category for each item before saving.");
        return;
      }
      const normalizedItems = nextItems.map((item) => {
        const category = getCategoryFromItem(item);
        if (!category) return item;
        return {
          ...item,
          categoryId: category._id,
          name: category.name,
          label: category.name,
          path: `/shop?category=${category._id}`,
          image: item.image || category.image || item.image,
        };
      });
      await onSave({ items: normalizedItems });
      return;
    }
    if (isCategoryGrid && !isWomenCuratedCollections) {
      if (isGoldShopByColourSection || isGoldCuratedBondSection) {
        const currentEditingItem = editingId
          ? nextItems.find((item) => item.id === editingId)
          : null;
        const editingCategoryId = String(
          currentEditingItem?.categoryId ||
            getCategoryFromItem(currentEditingItem)?._id ||
            "",
        ).trim();
        if (currentEditingItem && !editingCategoryId) {
          toast.error("Select a category for this card before saving.");
          return false;
        }

        let normalizedItems = nextItems.map((item) => {
          const category = getCategoryFromItem(item);
          if (!category) {
            return {
              ...item,
              name: item.name || item.label || "",
              label: item.label || item.name || "",
              path: item.path || "/shop?metal=gold",
            };
          }
          return {
            ...item,
            categoryId: category._id,
            name: (item.name || category.name || "").trim(),
            label: (item.label || item.name || category.name || "").trim(),
            path: buildGoldCategoryPath(category._id, item.path),
            image: item.image || category.image || item.image,
          };
        });

        if (currentEditingItem) {
          const savedEditing = normalizedItems.find(
            (item) => item.id === currentEditingItem.id,
          );
          if (
            !savedEditing ||
            !(savedEditing.name || savedEditing.label || "").trim() ||
            !savedEditing.image
          ) {
            toast.error(
              "Title and image are required before saving this card.",
            );
            return false;
          }
        }

        normalizedItems = normalizedItems.slice(0, 4);
        await onSave({ items: normalizedItems });
        return true;
      }
      const missing = nextItems.filter(
        (item) =>
          !(getCategoryFromItem(item) || inferWomenCategoryByHint(item)) &&
          !canPreserveLegacyCategoryGridItem(item),
      );
      if (missing.length > 0) {
        const labels = missing
          .map((item) => item.name || item.label || `Item ${item.id}`)
          .join(", ");
        toast.error(
          `Select a category for each item before saving. Missing: ${labels}`,
        );
        return;
      }
      let normalizedItems = nextItems.map((item) => {
        const category =
          getCategoryFromItem(item) || inferWomenCategoryByHint(item);
        if (!category) {
          return {
            ...item,
            name: item.name || item.label || "",
            label: item.label || item.name || "",
            path: item.path || "/shop",
          };
        }
        return {
          ...item,
          categoryId: category._id,
          name:
            isWomenCategoryLinkedSection ||
            isFamilyCategoryLinkedSection ||
            isGoldCategoryLinkedSection
              ? item.name || category.name
              : category.name,
          label:
            isWomenCategoryLinkedSection ||
            isFamilyCategoryLinkedSection ||
            isGoldCategoryLinkedSection
              ? item.label || item.name || category.name
              : category.name,
          path: isWomenCategoryLinkedSection
            ? buildWomenCategoryPath(category._id, item.path)
            : isFamilyCategoryLinkedSection
              ? buildFamilyCategoryPath(category._id, item.path)
              : isGoldCategoryLinkedSection
                ? buildGoldCategoryPath(category._id, item.path)
                : `/category/${category.slug || normalizeLabel(category.name)}`,
          image: item.image || category.image || item.image,
        };
      });
      if (isWomenTrendingGrid) {
        normalizedItems = normalizedItems.slice(0, 4);
      }
      if (isGoldShopByColourSection || isGoldCuratedBondSection) {
        normalizedItems = normalizedItems.slice(0, 4);
      }
      if (isFamilyTrendingNearYou || isFamilyGiftsToRemember) {
        normalizedItems = normalizedItems.slice(0, 12);
      }
      await onSave({ items: normalizedItems });
      return;
    }
    if (isWomenCuratedCollections) {
      const missing = nextItems.filter(
        (item) =>
          !(getCategoryFromItem(item) || inferWomenCategoryByHint(item)),
      );
      if (missing.length > 0) {
        const labels = missing
          .map((item) => item.name || item.label || `Item ${item.id}`)
          .join(", ");
        toast.error(
          `Select a category for each item before saving. Missing: ${labels}`,
        );
        return;
      }
      const normalizedItems = nextItems.map((item) => {
        const category =
          getCategoryFromItem(item) || inferWomenCategoryByHint(item);
        return {
          ...item,
          categoryId: category?._id || item.categoryId || null,
          name: item.name || category?.name || "",
          label: item.label || item.name || category?.name || "",
          path: buildWomenCategoryPath(
            category?._id || item.categoryId,
            item.path,
          ),
          image: item.image || category?.image || item.image,
        };
      });
      await onSave({ items: normalizedItems });
      return;
    }
    if (sectionId === "price-range-showcase" || isLuxuryWithinReach) {
      const missing = nextItems.filter((item) => !getPriceMaxFromItem(item));
      if (missing.length > 0) {
        const labels = missing
          .map((item) => item.name || item.id || "Item")
          .join(", ");
        toast.error(
          `Enter a max price for each item before saving. Missing: ${labels}`,
        );
        return;
      }
      if (isGoldLuxuryWithinReach) {
        const currentEditingItem = editingId
          ? nextItems.find((item) => item.id === editingId)
          : null;
        const selectedCategoryId = String(
          currentEditingItem?.categoryId ||
            getCategoryFromItem(currentEditingItem)?._id ||
            "",
        ).trim();
        if (currentEditingItem && !selectedCategoryId) {
          toast.error("Select a category for this card before saving.");
          return false;
        }
      }
      if (isFamilyLuxuryWithinReach) {
        const missingContent = nextItems.filter(
          (item) =>
            !(item.name || "").trim() ||
            !(item.subtitle || item.description || "").trim() ||
            !item.image,
        );
        if (missingContent.length > 0) {
          const labels = missingContent
            .map((item) => item.name || item.id || "Item")
            .join(", ");
          toast.error(
            `Each card needs title, subtitle, and image before saving. Missing: ${labels}`,
          );
          return;
        }
      }
      if (isGoldLuxuryWithinReach) {
        const missingContent = nextItems.filter(
          (item) => !(item.name || "").trim() || !item.image,
        );
        if (missingContent.length > 0) {
          const labels = missingContent
            .map((item) => item.name || item.id || "Item")
            .join(", ");
          toast.error(
            `Each card needs title and image before saving. Missing: ${labels}`,
          );
          return false;
        }
      }
      const normalizedItems = nextItems.map((item, index) => {
        const priceMax = getPriceMaxFromItem(item);
        if (!priceMax) return item;
        const resolvedCategoryId =
          item.categoryId || getCategoryFromItem(item)?._id || "";
        return {
          ...item,
          id: item.id || `price-${index + 1}`,
          priceMax,
          price: String(priceMax),
          name:
            isFamilyLuxuryWithinReach || isGoldLuxuryWithinReach
              ? (item.name || item.label || "").trim() ||
                `Under INR ${priceMax}`
              : `Under INR ${priceMax}`,
          label:
            isFamilyLuxuryWithinReach || isGoldLuxuryWithinReach
              ? (item.label || item.name || "").trim() ||
                `Under INR ${priceMax}`
              : `Under INR ${priceMax}`,
          subtitle: isFamilyLuxuryWithinReach
            ? item.subtitle || item.description || ""
            : item.subtitle,
          description: isFamilyLuxuryWithinReach
            ? item.description || item.subtitle || ""
            : item.description,
          categoryId: isGoldLuxuryWithinReach
            ? resolvedCategoryId || undefined
            : item.categoryId,
          path: isGoldLuxuryWithinReach
            ? buildGoldPriceRangePath(priceMax, resolvedCategoryId, item.path)
            : buildPriceRangePath(priceMax),
        };
      });

      let constrainedItems = normalizedItems.slice(
        0,
        isLuxuryWithinReach
          ? isGoldLuxuryWithinReach
            ? 4
            : isFamilyLuxuryWithinReach
              ? 3
              : 2
          : nextItems.length,
      );
      if (isFixedWomenPriceRange) {
        constrainedItems = fixedWomenPriceDefaults.map((fallback, index) => {
          const current = constrainedItems[index] || {};
          const priceMax = getPriceMaxFromItem(current) || fallback.priceMax;
          return {
            ...current,
            id: current.id || current.itemId || fallback.id,
            priceMax,
            price: String(priceMax),
            name: `Under INR ${priceMax}`,
            label: `Under INR ${priceMax}`,
            path: buildPriceRangePath(priceMax),
            tag: current.tag || fallback.tag,
          };
        });
      }
      await onSave({ items: constrainedItems });
      return;
    }
    if (sectionId === "perfect-gift") {
      const normalizedItems = nextItems.map((item) => ({
        ...item,
        productIds: Array.isArray(item.productIds) ? item.productIds : [],
        label: item.label || item.name || "",
        path:
          Array.isArray(item.productIds) && item.productIds.length > 0
            ? `/shop?products=${encodeURIComponent(item.productIds.join(","))}`
            : item.path || "/shop?status=coming-soon",
      }));
      await onSave({ items: normalizedItems });
      return;
    }
    if (sectionId === "new-launch") {
      const missing = nextItems.filter((item) => !getCategoryFromItem(item));
      if (missing.length > 0) {
        const labels = missing
          .map((item) => item.name || item.id || "Item")
          .join(", ");
        toast.error(
          `Select a category for each card before saving. Missing: ${labels}`,
        );
        return;
      }
      const normalizedItems = nextItems.map((item) => ({
        ...item,
        categoryId: getCategoryFromItem(item)?._id || item.categoryId,
        productIds: [],
        name: item.name || getCategoryFromItem(item)?.name || "",
        label: item.label || item.name || getCategoryFromItem(item)?.name || "",
        path: getCategoryFromItem(item)
          ? `/shop?category=${getCategoryFromItem(item)._id}`
          : item.path || "/shop",
      }));
      await onSave({ items: normalizedItems });
      return;
    }
    if (sectionId === "latest-drop") {
      const invalid = nextItems.filter((item) => {
        const hasCategory = Boolean(getCategoryFromItem(item));
        const hasLimit = Boolean(getLimitFromItem(item));
        return hasCategory !== hasLimit;
      });
      if (invalid.length > 0) {
        const labels = invalid
          .map((item) => item.name || item.id || "Item")
          .join(", ");
        toast.error(
          `For each card, set both Category and Limit. Missing: ${labels}`,
        );
        return;
      }
      const normalizedItems = nextItems.map((item) => {
        const category = getCategoryFromItem(item);
        const limit = getLimitFromItem(item) || 12;
        if (!category) return { ...item, limit: getLimitFromItem(item) || "" };
        return {
          ...item,
          categoryId: category._id,
          name: item.name || category.name,
          label: item.label || item.name || category.name,
          limit,
          path: `/shop?category=${category._id}&limit=${limit}&sort=latest`,
        };
      });
      await onSave({ items: normalizedItems });
      return;
    }
    if (sectionId === "most-gifted") {
      const heroItems = nextItems.filter((item) => item?.type === "hero");
      const contentItems = nextItems.filter((item) => item?.type !== "hero");
      const invalid = contentItems.filter((item) => !getCategoryFromItem(item));
      if (invalid.length > 0) {
        const labels = invalid
          .map((item) => item.name || item.id || "Item")
          .join(", ");
        toast.error(
          `Select a category for each card before saving. Missing: ${labels}`,
        );
        return;
      }
      const normalizedHeroItems = heroItems.map((item, index) => ({
        ...defaultMostGiftedHero,
        ...item,
        type: "hero",
        name: item.name || defaultMostGiftedHero.name,
        label: item.label || item.name || defaultMostGiftedHero.label,
        tag: item.tag || defaultMostGiftedHero.tag,
        ctaLabel: item.ctaLabel || defaultMostGiftedHero.ctaLabel,
        path: "/shop?sort=most-sold",
        sortOrder: item.sortOrder ?? index,
      }));
      const normalizedItems = contentItems.map((item) => {
        const category = getCategoryFromItem(item);
        if (!category) return { ...item };
        return {
          ...item,
          categoryId: category._id,
          name: item.name || category.name,
          label: item.label || item.name || category.name,
          limit: undefined,
          path: `/shop?category=${category._id}&sort=most-sold`,
        };
      });
      await onSave({ items: [...normalizedHeroItems, ...normalizedItems] });
      return;
    }
    if (sectionId === "proposal-rings") {
      const sourceItem =
        nextItems.find((item) => Boolean(getCategoryFromItem(item))) ||
        nextItems[0];
      if (!sourceItem || !getCategoryFromItem(sourceItem)) {
        toast.error("Select a category before saving.");
        return;
      }
      const category = getCategoryFromItem(sourceItem);
      const normalizedItem = {
        ...sourceItem,
        categoryId: category._id,
        name: sourceItem.name || category.name || "Proposal Rings",
        label: sourceItem.label || sourceItem.name || "Proposal Rings",
        limit: undefined,
        path: `/shop?category=${category._id}`,
      };
      await onSave({ items: [normalizedItem] });
      return;
    }
    if (sectionId === "curated-for-you") {
      const missingLimit = nextItems.filter((item) => !getLimitFromItem(item));
      if (missingLimit.length > 0) {
        const labels = missingLimit
          .map((item) => item.name || item.id || "Item")
          .join(", ");
        toast.error(
          `Enter a limit for each item before saving. Missing: ${labels}`,
        );
        return;
      }
      const normalizedItems = nextItems.map((item) => {
        const limit = getLimitFromItem(item) || 12;
        const productIds = Array.isArray(item.productIds)
          ? item.productIds
          : [];
        const path =
          productIds.length > 0
            ? `/shop?products=${encodeURIComponent(productIds.join(","))}&limit=${limit}&sort=random`
            : `/shop?limit=${limit}&sort=random`;
        return {
          ...item,
          limit,
          productIds,
          label: item.label || item.name || "",
          path,
        };
      });
      await onSave({ items: normalizedItems });
      return;
    }
    if (sectionId === "style-it-your-way") {
      const missingLimit = nextItems.filter((item) => !getLimitFromItem(item));
      if (missingLimit.length > 0) {
        const labels = missingLimit
          .map((item) => item.name || item.id || "Item")
          .join(", ");
        toast.error(
          `Enter a limit for each item before saving. Missing: ${labels}`,
        );
        return;
      }
      const normalizedItems = nextItems.map((item) => {
        const limit = getLimitFromItem(item) || 12;
        const productIds = Array.isArray(item.productIds)
          ? item.productIds
          : [];
        const path =
          productIds.length > 0
            ? `/shop?products=${encodeURIComponent(productIds.join(","))}`
            : `/shop?limit=${limit}&sort=random`;
        return {
          ...item,
          limit,
          productIds,
          label: item.label || item.name || "",
          path,
        };
      });
      await onSave({ items: normalizedItems });
      return;
    }
    const normalizedItems = nextItems.map((item) => {
      return item;
    });
    const result = await onSave({ items: normalizedItems, settings });
    return result?.success !== false;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Section Settings Block */}
      {(sectionId === "silver-collection" ||
        sectionId === "silver-curated") && (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-50 pb-4">
            <h3 className="font-display text-base font-bold text-gray-800">
              Section Settings
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#B44C63] bg-[#FDF4F6] px-2 py-1 rounded">
              Visual Config
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Input
                label="Section Title"
                value={settings.title || ""}
                onChange={(e) => handleSettingChange("title", e.target.value)}
                placeholder="e.g., Curated Highlights"
              />
              <Input
                label="Section Subtitle"
                value={settings.subtitle || ""}
                onChange={(e) =>
                  handleSettingChange("subtitle", e.target.value)
                }
                placeholder="e.g., Premium Silver Collections"
              />
              {sectionId === "silver-collection" && (
                <Input
                  label="Footer Extra Text"
                  value={settings.footerText || ""}
                  onChange={(e) =>
                    handleSettingChange("footerText", e.target.value)
                  }
                  placeholder="e.g., Emotion, made real"
                />
              )}
            </div>

            {sectionId === "silver-collection" && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                  Thematic Banner
                </label>
                <div className="aspect-[21/9] bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden relative group/banner">
                  {settings.bannerImage ? (
                    <>
                      <img
                        src={settings.bannerImage}
                        alt="Banner"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleSettingChange("bannerImage", "")}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover/banner:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <label className="cursor-pointer px-3 py-1.5 bg-[#3E2723] text-white text-xs font-bold rounded-lg block">
                        Upload Banner
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleSettingsImageUpload(
                              e.target.files[0],
                              "bannerImage",
                            )
                          }
                        />
                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest bg-amber-50 px-2.5 py-1.5 rounded border border-amber-200 mt-2 mb-2 inline-block">✨ Recommended Size: 1080x1080px (1:1 Ratio)</p>
                      </label>
                    </div>
                  )}
                </div>
                <p className="text-[11px] leading-4 text-gray-500">
                  Recommended size: 2100 x 900 px
                </p>
                <Input
                  placeholder="Banner URL..."
                  value={settings.bannerImage || ""}
                  onChange={(e) =>
                    handleSettingChange("bannerImage", e.target.value)
                  }
                  className="text-xs h-8"
                />
              </div>
            )}
          </div>
        </div>
      )}
      {(sectionId === "perfect-gift" ||
        sectionId === "curated-for-you" ||
        sectionId === "style-it-your-way") && (
        <ProductBrowserModal
          isOpen={isProductPickerOpen}
          onClose={() => {
            setIsProductPickerOpen(false);
            setProductPickerTarget(null);
          }}
          onSelect={handleProductPickerSelect}
          selectedIds={
            items.find((item) => item.id === productPickerTarget)?.productIds ||
            []
          }
          maxSelection={50}
        />
      )}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h3 className="font-display text-sm md:text-base font-bold text-gray-800">
            Manage Items
          </h3>
          <p className="text-[10px] md:text-xs text-gray-400">
            {isPremiumCategoryCards
              ? "These three cards stay fixed. You can update only their images to keep navigation consistent."
              : isLuxuryWithinReach
                ? isGoldLuxuryWithinReach
                  ? "These four cards stay fixed. Update title, image, max price, and category. Card clicks always open Gold products only."
                  : isFamilyLuxuryWithinReach
                    ? "These three cards stay fixed. Update title, subtitle, image, badge, and max price. User clicks always go to Family products under the selected price."
                    : "These two cards stay fixed. You can update only their prices to keep this section consistent."
                : isGoldShopByColourSection
                  ? "These four colour cards stay fixed. Update title, image, and category. Card clicks always open Gold products in the selected category."
                  : isGoldCuratedBondSection
                    ? "These four bond cards stay fixed. Update title, image, and category. Card clicks always open Gold products in the selected category."
                    : isGoldCuratedShowcaseSection
                      ? "Add, edit, or remove showcase cards. Set title, image, and category. Card clicks always open Gold products in the selected category."
                      : isGoldLifestyleGridSection
                        ? "Add, edit, or remove lifestyle cards (up to 8). Set title, image, and category. Card clicks always open Gold products in the selected category."
                        : isGoldNewLaunchBannerSection
                          ? "These three cards stay fixed. Update title, image, and category. Card clicks always open Gold products in the selected category."
                          : isGoldExclusiveLaunchSection
                            ? "These two cards stay fixed. Update title, subtitle, image, and category. Card clicks always open Gold products in the selected category."
                            : isGoldRingCarouselSection
                              ? "These six ring cards stay fixed. Update title, image, and category. Card clicks always open Gold products in the selected category."
                              : isFixedWomenPriceRange
                                ? "These three cards stay fixed. Update only max price and badge; images and card count are locked."
                                : isWomenTrendingGrid
                                  ? "These four cards stay fixed. Update image/title/category only to preserve layout."
                                  : isFixedWomenDiscoverHue
                                    ? "These four hue cards stay fixed. Update title, hue type, and image only."
                                    : isFixedWomenPromoBanners
                                      ? "These two promo banners stay fixed. Update content and destination only."
                                      : "Add, edit, or remove items in this section"}
          </p>
        </div>
        {!isPremiumCategoryCards &&
          !isLuxuryWithinReach &&
          !isGoldShopByColourSection &&
          !isGoldCuratedBondSection &&
          !isGoldNewLaunchBannerSection &&
          !isGoldExclusiveLaunchSection &&
          !isGoldRingCarouselSection &&
          !isFixedWomenPriceRange &&
          !isWomenTrendingGrid &&
          !isFixedWomenDiscoverHue &&
          !isFixedWomenPromoBanners &&
          sectionId !== "proposal-rings" && (
            <button
              onClick={addItem}
              className="flex items-center gap-2 bg-[#3E2723] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#2b1b18] transition-colors"
            >
              <Plus size={14} /> Add Item
            </button>
          )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item, index) => {
          const isEditing = editingId === item.id;
          const isMostGiftedHero =
            sectionId === "most-gifted" && item?.type === "hero";

          return (
            <div
              key={item.id}
              className={`bg-white border rounded-xl p-4 shadow-sm relative group animate-in zoom-in-95 duration-200 transition-all ${isEditing ? "border-[#3E2723] ring-1 ring-[#3E2723]" : "border-gray-200 hover:shadow-md"}`}
            >
              {/* Header: Item # + Edit/Save Button */}
              <div className="flex justify-between items-start mb-4">
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${isEditing ? "bg-[#3E2723] text-white" : "text-[#3E2723] bg-[#3E2723]/5"}`}
                >
                  {isMostGiftedHero ? "Hero Card" : `Item #${index + 1}`}
                </span>
                <div className="flex gap-2">
                  {isEditing &&
                    !isPremiumCategoryCards &&
                    !isLuxuryWithinReach &&
                    !isGoldShopByColourSection &&
                    !isGoldCuratedBondSection &&
                    !isGoldNewLaunchBannerSection &&
                    !isGoldExclusiveLaunchSection &&
                    !isGoldRingCarouselSection &&
                    !isFixedWomenPriceRange &&
                    !isWomenTrendingGrid &&
                    !isFixedWomenDiscoverHue &&
                    !isFixedWomenPromoBanners &&
                    !isMostGiftedHero &&
                    sectionId !== "proposal-rings" && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  <button
                    onClick={async () => {
                      if (isEditing) {
                        const didSave = await saveCurrentItems();
                        if (!didSave) return;
                      }
                      setEditingId(isEditing ? null : item.id);
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${isEditing ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-gray-50 text-gray-400 hover:bg-gray-100"}`}
                    title={isEditing ? "Save" : "Edit"}
                  >
                    {isEditing ? (
                      <CheckCircle size={16} />
                    ) : (
                      <Edit2 size={16} />
                    )}
                  </button>
                </div>
              </div>

              {isEditing ? (
                /* EDIT MODE */
                <div className="space-y-4">
                  {/* Main Image */}
                  {(!isLuxuryWithinReach ||
                    isFamilyLuxuryWithinReach ||
                    isGoldLuxuryWithinReach) &&
                    !isFixedWomenPriceRange && (
                      <div className="aspect-square bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden relative group/img">
                        {item.image ? (
                          <>
                            <img
                              src={resolveLegacyCmsAsset(
                                item.image,
                                item.image,
                              )}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() =>
                                handleItemChange(item.id, "image", "")
                              }
                              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <div className="text-center p-4">
                            <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <label className="cursor-pointer px-3 py-1.5 bg-[#3E2723] text-white text-xs font-bold rounded-lg block">
                              Upload Main
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                  handleImageUpload(item.id, e.target.files[0])
                                }
                              />
                              <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest bg-amber-50 px-2.5 py-1.5 rounded border border-amber-200 mt-2 mb-2 inline-block">
                                {isGoldExploreCollectionsSection 
                                  ? "✨ Recommended Size: 1200x600px (2:1 Ratio)"
                                  : "✨ Recommended Size: 1080x1080px (1:1 Ratio)"}
                              </p>
                            </label>
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-white/95 p-2 border-t border-gray-100">
                          <Input
                            placeholder="URL..."
                            value={item.image}
                            onChange={(e) =>
                              handleItemChange(item.id, "image", e.target.value)
                            }
                            className="text-xs h-8"
                          />
                        </div>
                      </div>
                    )}

                  {isCategoryShowcase && (
                    <div className="aspect-square bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden relative group/img">
                      {item.hoverImage ? (
                        <>
                          <img
                            src={item.hoverImage}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() =>
                              handleItemChange(item.id, "hoverImage", "")
                            }
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <label className="cursor-pointer px-3 py-1.5 bg-[#3E2723] text-white text-xs font-bold rounded-lg block">
                            Upload Hover
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                handleImageUpload(
                                  item.id,
                                  e.target.files[0],
                                  "hoverImage",
                                )
                              }
                            />
                            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest bg-amber-50 px-2.5 py-1.5 rounded border border-amber-200 mt-2 mb-2 inline-block">✨ Recommended Size: 1080x1080px (1:1 Ratio)</p>
                          </label>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-white/95 p-2 border-t border-gray-100">
                        <Input
                          placeholder="Hover URL..."
                          value={item.hoverImage || ""}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "hoverImage",
                              e.target.value,
                            )
                          }
                          className="text-xs h-8"
                        />
                      </div>
                    </div>
                  )}

                  {/* Select Product Button (skip for locked premium cards and structured sections) */}
                  {!isPremiumCategoryCards &&
                    !isCategoryDrivenSection &&
                    !isWomenCuratedCollections &&
                    !isFamilyCuratedCollections &&
                    !isGoldExploreCollectionsSection &&
                    !isGoldCuratedShowcaseSection &&
                    !isGoldNewLaunchBannerSection &&
                    !isGoldExclusiveLaunchSection &&
                    !isFixedWomenDiscoverHue &&
                    !isFixedWomenPromoBanners &&
                    sectionId !== "price-range-showcase" &&
                    !isLuxuryWithinReach &&
                    sectionId !== "perfect-gift" &&
                    sectionId !== "new-launch" &&
                    sectionId !== "latest-drop" &&
                    sectionId !== "most-gifted" &&
                    sectionId !== "proposal-rings" &&
                    sectionId !== "curated-for-you" &&
                    sectionId !== "style-it-your-way" && (
                      <button
                        onClick={() => handleRedirectToSelect(item.id)}
                        className="w-full py-2 bg-gray-50 text-gray-600 text-[10px] font-bold rounded-lg border border-gray-200 hover:bg-gray-100 flex items-center justify-center gap-2 uppercase tracking-widest"
                      >
                        <Search size={14} /> Product Link
                      </button>
                    )}

                  <div className="space-y-3">
                    {isPremiumCategoryCards && (
                      <div className="rounded-xl border border-[#EFE3DF] bg-[#FFFCFB] px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#B28A8A]">
                          Card Destination
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#3E2723]">
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {item.path}
                        </p>
                      </div>
                    )}
                    {isCategoryDrivenSection && !isWomenCuratedCollections && (
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                          Category
                        </label>
                        <select
                          value={getCategoryFromItem(item)?._id || ""}
                          onChange={(e) => {
                            const selected = categories.find(
                              (c) => String(c._id) === String(e.target.value),
                            );
                            if (!selected) return;
                            setItems((prev) =>
                              prev.map((entry) => {
                                if (entry.id !== item.id) return entry;
                                return {
                                  ...entry,
                                  categoryId: selected._id,
                                  name:
                                    isWomenCategoryLinkedSection ||
                                    isFamilyCategoryLinkedSection ||
                                    isGoldCategoryLinkedSection
                                      ? entry.name || selected.name
                                      : selected.name,
                                  path: isCategoryGrid
                                    ? isWomenCategoryLinkedSection
                                      ? buildWomenCategoryPath(
                                          selected._id,
                                          entry.path,
                                        )
                                      : isFamilyCategoryLinkedSection
                                        ? buildFamilyCategoryPath(
                                            selected._id,
                                            entry.path,
                                          )
                                        : isGoldCategoryLinkedSection
                                          ? buildGoldCategoryPath(
                                              selected._id,
                                              entry.path,
                                            )
                                          : `/category/${selected.slug || normalizeLabel(selected.name)}`
                                    : `/shop?category=${selected._id}`,
                                  image:
                                    entry.image ||
                                    selected.image ||
                                    entry.image,
                                };
                              }),
                            );
                          }}
                          className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-[#3E2723] focus:ring-1 focus:ring-[#3E2723]/20"
                        >
                          <option value="">Select Category</option>
                          {categories.map((cat) => (
                            <option key={cat._id} value={cat._id}>
                              {cat.name}
                              {cat.isActive === false ? " (Inactive)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {isWomenCuratedCollections && (
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                          Category
                        </label>
                        <select
                          value={getCategoryFromItem(item)?._id || ""}
                          onChange={(e) => {
                            const selected = categories.find(
                              (c) => String(c._id) === String(e.target.value),
                            );
                            if (!selected) return;
                            setItems((prev) =>
                              prev.map((entry) => {
                                if (entry.id !== item.id) return entry;
                                return {
                                  ...entry,
                                  categoryId: selected._id,
                                  name: entry.name || selected.name,
                                  path: buildWomenCategoryPath(
                                    selected._id,
                                    entry.path,
                                  ),
                                  image:
                                    entry.image ||
                                    selected.image ||
                                    entry.image,
                                };
                              }),
                            );
                          }}
                          className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-[#3E2723] focus:ring-1 focus:ring-[#3E2723]/20"
                        >
                          <option value="">Select Category</option>
                          {categories.map((cat) => (
                            <option key={cat._id} value={cat._id}>
                              {cat.name}
                              {cat.isActive === false ? " (Inactive)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {isFamilyCuratedCollections && (
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                          Category
                        </label>
                        <select
                          value={getCategoryFromItem(item)?._id || ""}
                          onChange={(e) => {
                            const selected = categories.find(
                              (c) => String(c._id) === String(e.target.value),
                            );
                            if (!selected) return;
                            setItems((prev) =>
                              prev.map((entry) => {
                                if (entry.id !== item.id) return entry;
                                return {
                                  ...entry,
                                  categoryId: selected._id,
                                  name: entry.name || selected.name,
                                  path: buildFamilyCategoryPath(
                                    selected._id,
                                    entry.path,
                                  ),
                                };
                              }),
                            );
                          }}
                          className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-[#3E2723] focus:ring-1 focus:ring-[#3E2723]/20"
                        >
                          <option value="">Select Category</option>
                          {categories.map((cat) => (
                            <option key={cat._id} value={cat._id}>
                              {cat.name}
                              {cat.isActive === false ? " (Inactive)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {(sectionId === "latest-drop" ||
                      sectionId === "proposal-rings" ||
                      (sectionId === "most-gifted" && !isMostGiftedHero)) && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                            Category
                          </label>
                          <select
                            value={getCategoryFromItem(item)?._id || ""}
                            onChange={(e) => {
                              const sourceCategories = categories;
                              const selected = sourceCategories.find(
                                (c) => String(c._id) === String(e.target.value),
                              );
                              if (!selected) return;
                              const limit = getLimitFromItem(item) || 12;
                              setItems((prev) =>
                                prev.map((entry) => {
                                  if (entry.id !== item.id) return entry;
                                  const nextEntry = {
                                    ...entry,
                                    categoryId: selected._id,
                                    name: entry.name || selected.name,
                                    path:
                                      sectionId === "most-gifted"
                                        ? `/shop?category=${selected._id}&sort=most-sold`
                                        : sectionId === "proposal-rings"
                                          ? `/shop?category=${selected._id}`
                                          : `/shop?category=${selected._id}&limit=${limit}&sort=latest`,
                                  };
                                  if (sectionId === "most-gifted") {
                                    delete nextEntry.limit;
                                  }
                                  if (sectionId === "proposal-rings") {
                                    delete nextEntry.limit;
                                  }
                                  return nextEntry;
                                }),
                              );
                            }}
                            className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-[#3E2723] focus:ring-1 focus:ring-[#3E2723]/20"
                          >
                            <option value="">Select Category</option>
                            {categories.map((cat) => (
                              <option key={cat._id} value={cat._id}>
                                {cat.name}
                                {cat.isActive === false ? " (Inactive)" : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                        {sectionId !== "most-gifted" &&
                          sectionId !== "proposal-rings" && (
                            <Input
                              label="Number of Products"
                              type="number"
                              min="1"
                              value={item.limit ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const numeric = raw === "" ? "" : Number(raw);
                                setItems((prev) =>
                                  prev.map((entry) => {
                                    if (entry.id !== item.id) return entry;
                                    const category = getCategoryFromItem(entry);
                                    const limit = numeric || 0;
                                    return {
                                      ...entry,
                                      limit: numeric,
                                      path: category
                                        ? `/shop?category=${category._id}&limit=${limit}&sort=${sectionId === "most-gifted" ? "most-sold" : "latest"}`
                                        : entry.path,
                                    };
                                  }),
                                );
                              }}
                              placeholder="12"
                            />
                          )}
                      </div>
                    )}
                    {sectionId === "curated-for-you" && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                            Selected Products
                          </label>
                          <button
                            onClick={() => handleProductPickerOpen(item.id)}
                            className="w-full py-2 bg-gray-50 text-gray-700 text-[10px] font-bold rounded-lg border border-gray-200 hover:bg-gray-100 uppercase tracking-widest"
                          >
                            {Array.isArray(item.productIds) &&
                            item.productIds.length > 0
                              ? `Selected ${item.productIds.length} Products`
                              : "Select Products"}
                          </button>
                        </div>
                        <Input
                          label="Number of Products"
                          type="number"
                          min="1"
                          value={item.limit ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const numeric = raw === "" ? "" : Number(raw);
                            setItems((prev) =>
                              prev.map((entry) => {
                                if (entry.id !== item.id) return entry;
                                const productIds = Array.isArray(
                                  entry.productIds,
                                )
                                  ? entry.productIds
                                  : [];
                                const limit = numeric || 0;
                                const path =
                                  productIds.length > 0
                                    ? `/shop?products=${encodeURIComponent(productIds.join(","))}&limit=${limit}&sort=random`
                                    : `/shop?limit=${limit}&sort=random`;
                                return {
                                  ...entry,
                                  limit: numeric,
                                  path,
                                };
                              }),
                            );
                          }}
                          placeholder="12"
                        />
                      </div>
                    )}
                    {sectionId === "style-it-your-way" && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                            Selected Products
                          </label>
                          <button
                            onClick={() => handleProductPickerOpen(item.id)}
                            className="w-full py-2 bg-gray-50 text-gray-700 text-[10px] font-bold rounded-lg border border-gray-200 hover:bg-gray-100 uppercase tracking-widest"
                          >
                            {Array.isArray(item.productIds) &&
                            item.productIds.length > 0
                              ? `Selected ${item.productIds.length} Products`
                              : "Select Products"}
                          </button>
                        </div>
                        <Input
                          label="Number of Products"
                          type="number"
                          min="1"
                          value={item.limit ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const numeric = raw === "" ? "" : Number(raw);
                            setItems((prev) =>
                              prev.map((entry) => {
                                if (entry.id !== item.id) return entry;
                                const productIds = Array.isArray(
                                  entry.productIds,
                                )
                                  ? entry.productIds
                                  : [];
                                const limit = numeric || 0;
                                const path =
                                  productIds.length > 0
                                    ? `/shop?products=${encodeURIComponent(productIds.join(","))}&limit=${limit}&sort=random`
                                    : `/shop?limit=${limit}&sort=random`;
                                return {
                                  ...entry,
                                  limit: numeric,
                                  path,
                                };
                              }),
                            );
                          }}
                          placeholder="12"
                        />
                      </div>
                    )}
                    {!isPremiumCategoryCards &&
                      (!isCategoryDrivenSection ||
                        isWomenCategoryLinkedSection ||
                        isFamilyCategoryLinkedSection ||
                        isGoldCategoryLinkedSection ||
                        isGoldExploreCollectionsSection ||
                        isFixedWomenDiscoverHue ||
                        isFixedWomenPromoBanners ||
                        isFamilyCuratedCollections ||
                        isFamilyLuxuryWithinReach ||
                        isGoldLuxuryWithinReach) &&
                      sectionId !== "price-range-showcase" &&
                      (!isLuxuryWithinReach ||
                        isFamilyLuxuryWithinReach ||
                        isGoldLuxuryWithinReach) && (
                        <Input
                          label={
                            isMostGiftedHero
                              ? "Hero Title"
                              : sectionId === "style-it-your-way"
                                ? "Title"
                                : isWomenCuratedCollections ||
                                    isFamilyCuratedCollections
                                  ? "Card Title"
                                  : "Name"
                          }
                          value={item.name}
                          onChange={(e) =>
                            handleItemChange(item.id, "name", e.target.value)
                          }
                          placeholder={
                            isMostGiftedHero
                              ? "Most Gifted Items"
                              : isWomenCuratedCollections ||
                                  isFamilyCuratedCollections
                                ? "Boho Anklets"
                                : "Name"
                          }
                        />
                      )}
                    {isFamilyLuxuryWithinReach && (
                      <Input
                        label="Subtitle"
                        value={item.subtitle || item.description || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setItems((prev) =>
                            prev.map((entry) =>
                              entry.id === item.id
                                ? {
                                    ...entry,
                                    subtitle: value,
                                    description: value,
                                  }
                                : entry,
                            ),
                          );
                        }}
                        placeholder="Keepsake rings and petite gifting picks."
                      />
                    )}
                    {isGoldExploreCollectionsSection && (
                      <Input
                        label="Subtitle"
                        value={item.subtitle || item.description || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setItems((prev) =>
                            prev.map((entry) =>
                              entry.id === item.id
                                ? {
                                    ...entry,
                                    subtitle: value,
                                    description: value,
                                  }
                                : entry,
                            ),
                          );
                        }}
                        placeholder="Sophisticated designs for the modern workplace"
                      />
                    )}
                    {isGoldExclusiveLaunchSection && (
                      <Input
                        label="Subtitle"
                        value={item.subtitle || item.description || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setItems((prev) =>
                            prev.map((entry) =>
                              entry.id === item.id
                                ? {
                                    ...entry,
                                    subtitle: value,
                                    description: value,
                                  }
                                : entry,
                            ),
                          );
                        }}
                        placeholder="Solitaire Collection"
                      />
                    )}
                    {isFixedWomenDiscoverHue && (
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                          Category
                        </label>
                        <select
                          value={getCategoryFromItem(item)?._id || ""}
                          onChange={(e) => {
                            const selected = categories.find(
                              (c) => String(c._id) === String(e.target.value),
                            );
                            if (!selected) return;
                            setItems((prev) =>
                              prev.map((entry) => {
                                if (entry.id !== item.id) return entry;
                                return {
                                  ...entry,
                                  categoryId: selected._id,
                                  path: buildWomenCategoryPath(
                                    selected._id,
                                    entry.path,
                                  ),
                                };
                              }),
                            );
                          }}
                          className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-[#3E2723] focus:ring-1 focus:ring-[#3E2723]/20"
                        >
                          <option value="">Select Category</option>
                          {categories.map((cat) => (
                            <option key={cat._id} value={cat._id}>
                              {cat.name}
                              {cat.isActive === false ? " (Inactive)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {isFixedWomenPromoBanners && (
                      <>
                        <Input
                          label="Subtitle"
                          value={item.subtitle || ""}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "subtitle",
                              e.target.value,
                            )
                          }
                          placeholder="Luxury for your Loved Ones"
                        />
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                            Category
                          </label>
                          <select
                            value={getCategoryFromItem(item)?._id || ""}
                            onChange={(e) => {
                              const selected = categories.find(
                                (c) => String(c._id) === String(e.target.value),
                              );
                              if (!selected) return;
                              setItems((prev) =>
                                prev.map((entry) => {
                                  if (entry.id !== item.id) return entry;
                                  return {
                                    ...entry,
                                    categoryId: selected._id,
                                    path: buildWomenCategoryPath(
                                      selected._id,
                                      entry.path,
                                    ),
                                  };
                                }),
                              );
                            }}
                            className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-[#3E2723] focus:ring-1 focus:ring-[#3E2723]/20"
                          >
                            <option value="">Select Category</option>
                            {categories.map((cat) => (
                              <option key={cat._id} value={cat._id}>
                                {cat.name}
                                {cat.isActive === false ? " (Inactive)" : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                        <Input
                          label="Button Label"
                          value={item.ctaLabel || ""}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "ctaLabel",
                              e.target.value,
                            )
                          }
                          placeholder="Shop Now"
                        />
                      </>
                    )}
                    {(isGoldExploreCollectionsSection ||
                      isGoldCuratedShowcaseSection ||
                      isGoldNewLaunchBannerSection ||
                      isGoldExclusiveLaunchSection) && (
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                          Category
                        </label>
                        <select
                          value={String(
                            item.categoryId ||
                              getCategoryFromItem(item)?._id ||
                              "",
                          )}
                          onChange={(e) => {
                            const selectedId = String(
                              e.target.value || "",
                            ).trim();
                            if (!selectedId) {
                              setItems((prev) =>
                                prev.map((entry) => {
                                  if (entry.id !== item.id) return entry;
                                  return {
                                    ...entry,
                                    categoryId: "",
                                    path: buildGoldCategoryPath("", entry.path),
                                  };
                                }),
                              );
                              return;
                            }
                            const selected = categories.find(
                              (c) => String(c._id) === selectedId,
                            );
                            if (!selected) return;
                            setItems((prev) =>
                              prev.map((entry) => {
                                if (entry.id !== item.id) return entry;
                                return {
                                  ...entry,
                                  categoryId: selected._id,
                                  name: entry.name || selected.name,
                                  path: buildGoldCategoryPath(
                                    selected._id,
                                    entry.path,
                                  ),
                                };
                              }),
                            );
                          }}
                          className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-[#3E2723] focus:ring-1 focus:ring-[#3E2723]/20"
                        >
                          <option value="">Select Category</option>
                          {categories.map((cat) => (
                            <option key={cat._id} value={cat._id}>
                              {cat.name}
                              {cat.isActive === false ? " (Inactive)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {isGoldLuxuryWithinReach && (
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                          Category
                        </label>
                        <select
                          value={String(
                            item.categoryId ||
                              getCategoryFromItem(item)?._id ||
                              "",
                          )}
                          onChange={(e) => {
                            const selectedId = String(
                              e.target.value || "",
                            ).trim();
                            const selected = categories.find(
                              (c) => String(c._id) === selectedId,
                            );
                            setItems((prev) =>
                              prev.map((entry) => {
                                if (entry.id !== item.id) return entry;
                                const nextCategoryId = selected?._id || "";
                                const priceMax = getPriceMaxFromItem(entry);
                                return {
                                  ...entry,
                                  categoryId: nextCategoryId,
                                  path: buildGoldPriceRangePath(
                                    priceMax,
                                    nextCategoryId,
                                    entry.path,
                                  ),
                                };
                              }),
                            );
                          }}
                          className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-[#3E2723] focus:ring-1 focus:ring-[#3E2723]/20"
                        >
                          <option value="">Select Category</option>
                          {categories.map((cat) => (
                            <option key={cat._id} value={cat._id}>
                              {cat.name}
                              {cat.isActive === false ? " (Inactive)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {isCategoryDrivenSection &&
                      !isWomenCategoryLinkedSection &&
                      !isFamilyCategoryLinkedSection &&
                      !isGoldCategoryLinkedSection &&
                      !isGoldExploreCollectionsSection && (
                        <Input
                          label="Category Name"
                          value={item.name}
                          readOnly
                          placeholder="Select a category"
                          className="bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                      )}
                    {(sectionId === "price-range-showcase" ||
                      isLuxuryWithinReach) && (
                      <div className="space-y-2">
                        <Input
                          label="Max Price (INR)"
                          type="number"
                          min="0"
                          value={item.priceMax ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const numeric = raw === "" ? "" : Number(raw);
                            setItems((prev) =>
                              prev.map((entry) => {
                                if (entry.id !== item.id) return entry;
                                return {
                                  ...entry,
                                  priceMax: numeric,
                                  name:
                                    isFamilyLuxuryWithinReach ||
                                    isGoldLuxuryWithinReach
                                      ? entry.name
                                      : numeric
                                        ? `Under INR ${numeric}`
                                        : entry.name,
                                  path: isGoldLuxuryWithinReach
                                    ? buildGoldPriceRangePath(
                                        numeric,
                                        entry.categoryId ||
                                          getCategoryFromItem(entry)?._id ||
                                          "",
                                        entry.path,
                                      )
                                    : entry.path,
                                };
                              }),
                            );
                          }}
                          placeholder={isLuxuryWithinReach ? "1499" : "999"}
                        />
                        {!isFamilyLuxuryWithinReach &&
                          !isGoldLuxuryWithinReach && (
                            <Input
                              label="Display Label"
                              value={item.name || ""}
                              readOnly
                              placeholder="Under INR 999"
                              className="bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
                          )}
                      </div>
                    )}
                    {sectionId === "new-launch" && (
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                          Category
                        </label>
                        <select
                          value={getCategoryFromItem(item)?._id || ""}
                          onChange={(e) => {
                            const selected = categories.find(
                              (c) => String(c._id) === String(e.target.value),
                            );
                            if (!selected) return;
                            setItems((prev) =>
                              prev.map((entry) => {
                                if (entry.id !== item.id) return entry;
                                return {
                                  ...entry,
                                  categoryId: selected._id,
                                  name: selected.name,
                                  path: `/shop?category=${selected._id}`,
                                };
                              }),
                            );
                          }}
                          className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-[#3E2723] focus:ring-1 focus:ring-[#3E2723]/20"
                        >
                          <option value="">Select Category</option>
                          {categories.map((cat) => (
                            <option key={cat._id} value={cat._id}>
                              {cat.name}
                              {cat.isActive === false ? " (Inactive)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {sectionId === "perfect-gift" && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                          Selected Products
                        </label>
                        <button
                          onClick={() => handleProductPickerOpen(item.id)}
                          className="w-full py-2 bg-gray-50 text-gray-700 text-[10px] font-bold rounded-lg border border-gray-200 hover:bg-gray-100 uppercase tracking-widest"
                        >
                          {Array.isArray(item.productIds) &&
                          item.productIds.length > 0
                            ? `Selected ${item.productIds.length} Products`
                            : "Select Products"}
                        </button>
                      </div>
                    )}
                    {!isPremiumCategoryCards && !isFixedWomenDiscoverHue && (
                      <Input
                        label={
                          isMostGiftedHero
                            ? "Eyebrow"
                            : sectionId === "style-it-your-way"
                              ? "Subtitle"
                              : "Badge"
                        }
                        value={item.tag}
                        onChange={(e) =>
                          handleItemChange(item.id, "tag", e.target.value)
                        }
                        placeholder={
                          isMostGiftedHero ? "Collection Focus" : "..."
                        }
                      />
                    )}
                    {isMostGiftedHero && (
                      <Input
                        label="Button Label"
                        value={item.ctaLabel || ""}
                        onChange={(e) =>
                          handleItemChange(item.id, "ctaLabel", e.target.value)
                        }
                        placeholder="Explore Collection"
                      />
                    )}
                    {isMostGiftedHero && (
                      <div className="rounded-xl border border-[#EFE3DF] bg-[#FFFCFB] px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#B28A8A]">
                          Hero Destination
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#3E2723]">
                          All Most Gifted Products
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          /shop?sort=most-sold
                        </p>
                      </div>
                    )}

                    {(sectionId === "style-it-your-way" ||
                      isGoldExploreCollectionsSection) && (
                      <div className="pt-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                          3 Mini Photos
                        </label>
                        <div className="flex gap-2">
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className="flex-1 aspect-square rounded-lg border border-dashed border-gray-300 relative group/mini overflow-hidden bg-gray-50"
                            >
                              {item.extraImages?.[i] ? (
                                <>
                                  <img
                                    src={resolveLegacyCmsAsset(
                                      item.extraImages[i],
                                      item.extraImages[i],
                                    )}
                                    className="w-full h-full object-cover"
                                    alt=""
                                  />
                                  <button
                                    onClick={() =>
                                      handleItemChange(
                                        item.id,
                                        `extraImage_${i}`,
                                        "",
                                      )
                                    }
                                    className="absolute inset-0 bg-red-500/20 opacity-0 group-hover/mini:opacity-100 flex items-center justify-center"
                                  >
                                    <Trash2
                                      size={12}
                                      className="text-white bg-red-500 p-1 rounded-full shadow-lg"
                                    />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleItemChange(
                                        item.id,
                                        `extraImage_${i}`,
                                        "",
                                      )
                                    }
                                    className="absolute bottom-1 left-1 right-1 bg-white/95 text-[9px] font-bold text-red-600 rounded py-0.5 border border-red-100"
                                  >
                                    Remove
                                  </button>
                                </>
                              ) : (
                                <label className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-gray-100">
                                  <Plus size={14} className="text-gray-400" />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) =>
                                      handleImageUpload(
                                        item.id,
                                        e.target.files[0],
                                        `extraImage_${i}`,
                                      )
                                    }
                                  />
                                  <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest bg-amber-50 px-2.5 py-1.5 rounded border border-amber-200 mt-2 mb-2 inline-block">✨ Recommended Size: 1080x1080px (1:1 Ratio)</p>
                                </label>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* VIEW MODE */
                <div className="space-y-3 p-4">
                  {sectionId === "style-it-your-way" ? (
                    <div className="space-y-4">
                      <div className="aspect-[16/9] md:aspect-[4/3] rounded-xl bg-gray-100 overflow-hidden relative shadow-sm border border-gray-100">
                        <img
                          src={resolveLegacyCmsAsset(item.image, item.image)}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      </div>
                      <div className="flex gap-2 justify-end">
                        {(item.extraImages || ["", "", ""]).map((img, i) => (
                          <div
                            key={i}
                            className="w-10 h-10 md:w-16 md:h-16 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shadow-sm"
                          >
                            {img && (
                              <img
                                src={resolveLegacyCmsAsset(img, img)}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="text-left">
                        <p className="text-[#C9A24D] text-[10px] font-bold uppercase tracking-widest">
                          {item.tag}
                        </p>
                        <h3 className="font-bold text-gray-800 text-sm md:text-base">
                          {item.name}
                        </h3>
                      </div>
                    </div>
                  ) : (
                    <>
                      {isFixedWomenPriceRange ? (
                        <div
                          className="rounded-lg px-3 py-5 text-center"
                          style={{
                            background:
                              "linear-gradient(135deg, #4A0E1C 0%, #2A0610 50%, #150207 100%)",
                            border: "1px solid rgba(255,255,255,0.05)",
                          }}
                        >
                          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/60">
                            Under
                          </p>
                          <h3 className="mt-1 text-white font-bold text-2xl leading-none">
                            ₹{getPriceMaxFromItem(item) || item.priceMax || ""}
                          </h3>
                          <p className="mt-2 text-[10px] font-bold tracking-[0.12em] uppercase text-[#EBCDD0]">
                            {item.tag || ""}
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="aspect-square rounded-lg bg-gray-100 overflow-hidden relative">
                            <img
                              src={resolveLegacyCmsAsset(
                                item.image,
                                item.image,
                              )}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="text-center">
                            <h3 className="font-bold text-gray-800 text-sm">
                              {item.name}
                            </h3>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryShowcaseEditor;
