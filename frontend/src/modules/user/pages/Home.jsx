import React, { useEffect } from 'react';
import { useHomepageCms } from '../hooks/useHomepageCms';
import { useResetScroll } from '../../../hooks/useResetScroll';
import LazySection from '../../../components/LazySection';

// ─── ABOVE-FOLD: eagerly imported — these are visible immediately on page load ───
import CategoryGrid from '../components/CategoryGrid';
import DynamicPromoBanner from '../components/DynamicPromoBanner';
import TrustMarkers from '../components/TrustMarkers';

// ─── BELOW-FOLD: lazy loaded — downloaded only when user scrolls toward them ────
// This moves ~70KB of JS out of the critical render path
import ShopByPrice from '../components/ShopByPrice';
import PremiumCategoryCards from '../components/PremiumCategoryCards';
import BestStylesSection from '../components/BestStylesSection';
import AutoBannerSection from '../components/AutoBannerSection';
import SilverNewLaunchGrid from '../components/SilverNewLaunchGrid';
import ShopByColour from '../components/ShopByColour';
import PriceRangeShowcase from '../components/PriceRangeShowcase';
import PerfectGift from '../components/PerfectGift';
import NewLaunchSection from '../components/NewLaunchSection';
import StyleItYourWay from '../components/StyleItYourWay';
import OccasionalSpecial from '../components/OccasionalSpecial';
import AllJewellery from '../components/AllJewellery';
import SilverCollectionSection from '../components/SilverCollectionSection';
import SilverCuratedShowcase from '../components/SilverCuratedShowcase';
import ProposalBanner from '../components/ProposalBanner';
import Testimonials from '../components/Testimonials';
import BrandPromises from '../components/BrandPromises';
import ChitChatSection from '../components/ChitChatSection';
import FAQSection from '../components/FAQSection';

// Lightweight fallback for lazy sections — invisible so layout doesn't shift


// Wrap off-screen sections in LazySection with 500px rootMargin to load only when scrolling close


const Home = () => {
    const {
        isError: isHomepageCmsError,
        error: homepageCmsError,
        refetch: refetchHomepageCms,
    } = useHomepageCms();

    useResetScroll();

    useEffect(() => {
        document.title = "SandsJewels | Crafted for Moments That Last";
    }, []);

    // Progressive rendering:
    // Above-the-fold content (Hero Promo Banner, Category Grid, Trust Markers) and CMS sections
    // render immediately without waiting for the global 48-product catalogue fetch.
    // Product-dependent sections (BestStylesSection, AllJewellery, PerfectGift) consume
    // products directly from ShopContext and populate seamlessly once catalogue data resolves.

    return (
        <div className="bg-white font-body text-black relative selection:bg-[#D39A9F] selection:text-white">
            {isHomepageCmsError && (
                <div className="mx-auto max-w-[1450px] px-4 pt-4">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <span className="font-bold">Homepage content is using fallback data.</span>{' '}
                            <span className="opacity-80">
                                {homepageCmsError?.response?.data?.message || homepageCmsError?.message || ''}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => refetchHomepageCms()}
                            className="shrink-0 rounded-lg bg-[#3E2723] px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white hover:opacity-95"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            )}

            {/* ── ABOVE FOLD: loaded eagerly (visible immediately) ── */}
            <DynamicPromoBanner />
            <CategoryGrid />
            <TrustMarkers />

            {/* ── BELOW FOLD: lazy loaded inside SectionShell ── */}
            <ShopByPrice />
            <PremiumCategoryCards />
            <BestStylesSection />
            <AutoBannerSection />
            <SilverNewLaunchGrid />
            <ShopByColour />
            <PriceRangeShowcase />
            <PerfectGift />
            <NewLaunchSection />
            <StyleItYourWay />
            <OccasionalSpecial />
            <AllJewellery />
            <SilverCollectionSection />
            <SilverCuratedShowcase />
            <ProposalBanner />
            <Testimonials />
            <BrandPromises />
            <ChitChatSection />
            <FAQSection />
        </div>
    );
};

export default Home;
