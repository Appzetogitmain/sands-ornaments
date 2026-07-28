import React, { useEffect, useMemo, useState } from "react";
import MenHeroCarousel from "../components/men/MenHeroCarousel";
import MenCategoriesGrid from "../components/men/MenCategoriesGrid";
import LazySection from "../../../components/LazySection";

// Lazy loaded below-fold components
import MenLuxurySection from "../components/men/MenLuxurySection";
import CelebrateMen from "../components/men/CelebrateMen";
import MenCuratedCollections from "../components/men/MenCuratedCollections";
import MenExploreCollections from "../components/men/MenExploreCollections";
import MenPersonalizedBanner from "../components/men/MenPersonalizedBanner";
import MenPickYourGlam from "../components/men/MenPickYourGlam";
import MenInteractiveLook from "../components/men/MenInteractiveLook";
import MenStyleGuide from "../components/men/MenStyleGuide";
import MenStyleTrends from "../components/men/MenStyleTrends";
import MenFeaturedProducts from "../components/men/MenFeaturedProducts";

import Loader from "../../shared/components/Loader";
import { usePublicCmsPage } from "../hooks/usePublicCmsPage";

const ShopForMen = () => {
  const {
    data: sections = [],
    isLoading: isCmsLoading,
    isError,
    error,
    refetch,
  } = usePublicCmsPage("shop-men");

  useEffect(() => {
    document.title = "Shop Men's Jewellery | Sands Jewels";
  }, []);

  const sectionMap = useMemo(
    () =>
      (sections || []).reduce((acc, section) => {
        const key = section.sectionKey || section.sectionId;
        if (key) acc[key] = section;
        return acc;
      }, {}),
    [sections],
  );

  if (isCmsLoading) return <Loader />;
  if (isError) {
    return (
      <div className="bg-[#FDF5F6] min-h-screen flex items-center justify-center px-6 py-14">
        <div className="max-w-xl w-full bg-white border border-gray-100 rounded-2xl p-8 shadow-sm text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.35em] text-gray-400">
            Shop for Men
          </div>
          <h1 className="mt-2 text-2xl font-extrabold text-gray-900">
            Unable to load page content
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            {error?.response?.data?.message ||
              error?.message ||
              "Please try again."}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#3E2723] px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:opacity-95"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mens-section bg-[#FDF5F6] min-h-screen text-[#111827] overflow-x-hidden">
      <MenHeroCarousel sectionData={sectionMap["hero-banners"]} />
      <MenCategoriesGrid sectionData={sectionMap["categories-grid"]} />
      
      <MenLuxurySection sectionData={sectionMap["luxury-section"]} />
        
          <CelebrateMen sectionData={sectionMap["celebrate-men"]} />
        
        
          <MenCuratedCollections sectionData={sectionMap["curated-collections"]} />
        
        
          <MenExploreCollections sectionData={sectionMap["explore-collections"]} />
        
        
          <MenPersonalizedBanner sectionData={sectionMap["personalized-banner"]} />
        
        
          <MenPickYourGlam sectionData={sectionMap["pick-your-glam"]} />
        
        
          <MenInteractiveLook />
        
        
          <MenStyleGuide sectionData={sectionMap["style-guide"]} />
        
        
          <MenStyleTrends sectionData={sectionMap["style-trends"]} />
        
        
          <MenFeaturedProducts sectionData={sectionMap["products-listing"]} />
        
      
    </div>
  );
};

export default ShopForMen;
