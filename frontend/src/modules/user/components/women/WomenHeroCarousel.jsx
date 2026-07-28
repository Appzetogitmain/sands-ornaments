import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { buildWomenShopPath } from "../../utils/womenNavigation";
import { resolveLegacyCmsAsset } from "../../utils/legacyCmsAssets";
import heroRadiance from "@assets/women_hero_radiance.png";

const defaultSlides = [
  {
    id: "women-hero-default",
    title: "Eternal ",
    titleItalic: "Radiance",
    subtitle: "Diamonds that capture the light and her heart.",
    image: heroRadiance,
    cta: "Shop Diamonds",
    path: buildWomenShopPath({ category: "women" }),
    accent: "#FFFFFF",
  },
];

const splitTitle = (label = "") => {
  const source = String(label || "").trim();
  if (!source) return { title: "Eternal ", titleItalic: "Radiance" };
  const parts = source.split(" ");
  if (parts.length < 2) return { title: `${source} `, titleItalic: "" };
  const italic = parts.pop();
  return { title: `${parts.join(" ")} `, titleItalic: italic };
};

const WomenHeroCarousel = ({ sectionData }) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [brokenSlideIds, setBrokenSlideIds] = useState({});

  const slides = useMemo(() => {
    const configured = Array.isArray(sectionData?.items)
      ? sectionData.items
      : [];
    const mapped = configured
      .filter((item) => item?.label || item?.name || item?.image)
      .map((item, index) => {
        const { title, titleItalic } = splitTitle(
          item.label || item.name || defaultSlides[0].title.trim(),
        );
        return {
          id: item.itemId || item.id || `women-hero-${index + 1}`,
          title,
          titleItalic,
          subtitle: item.subtitle || defaultSlides[0].subtitle,
          image: resolveLegacyCmsAsset(item.image, defaultSlides[0].image),
          mobileImage: item.mobileImage ? resolveLegacyCmsAsset(item.mobileImage, defaultSlides[0].image) : null,
          cta: item.ctaLabel || defaultSlides[0].cta,
          path: item.path || buildWomenShopPath({ category: "women" }),
          accent: defaultSlides[0].accent,
        };
      });

    return mapped.length > 0 ? mapped : defaultSlides;
  }, [sectionData]);

  useEffect(() => {
    setBrokenSlideIds({});
    setCurrentIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const autoplayMs = Number(sectionData?.settings?.autoplayMs) || 5000;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, autoplayMs);
    return () => clearInterval(interval);
  }, [slides.length, sectionData?.settings?.autoplayMs]);

  const slide = slides[currentIndex] || defaultSlides[0];
  const activeImage = brokenSlideIds[slide.id]
    ? defaultSlides[0].image
    : slide.image;

  const sliderAspect = slide.mobileImage ? 'aspect-[2/1] md:aspect-[4/1]' : 'aspect-[4/1]';

  return (
    <section className={`relative w-full overflow-hidden select-none transition-all duration-300 ${sliderAspect}`}>
      <div className="absolute inset-0 w-full h-full">
        {slide.mobileImage && (
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] hover:scale-105 block md:hidden"
              style={{
                backgroundImage: `url(${slide.mobileImage})`,
                backgroundPosition: "center",
              }}
            />
        )}
        <div
          className={`absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] hover:scale-105 ${slide.mobileImage ? 'hidden md:block' : 'block'}`}
          style={{
            backgroundImage: `url(${activeImage})`,
            backgroundPosition: "center 35%",
          }}
        />
        <img
          src={activeImage}
          alt=""
          className="hidden"
          onError={() =>
            setBrokenSlideIds((prev) => ({ ...prev, [slide.id]: true }))
          }
        />
        <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/20 to-transparent" />

        <div className="relative h-full container mx-auto px-2 md:px-20 flex flex-col justify-center items-end text-right">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="max-w-xl"
          >
            <span className="inline-block text-[4px] sm:text-[6px] md:text-xs text-white/50 tracking-[0.3em] md:tracking-[0.5em] uppercase mb-0 md:mb-4 font-bold border-r-[1px] md:border-r-2 border-white/30 pr-1 md:pr-4">
              Sands Jewels Exclusive
            </span>

            <h1 className="text-sm sm:text-2xl md:text-8xl font-serif text-white tracking-tight font-light leading-none md:leading-[1] transition-all">
              {slide.title}
              <span className="italic" style={{ color: slide.accent }}>
                {slide.titleItalic}
              </span>
            </h1>

            <p className="text-[5px] sm:text-[8px] md:text-lg text-white/80 font-light mt-0 mb-1 md:mt-4 md:mb-8 tracking-wide italic">
              {slide.subtitle}
            </p>

            <div className="flex flex-wrap gap-4 justify-end">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(slide.path)}
                className="px-1.5 py-0.5 md:px-8 md:py-4 bg-white text-black text-[4px] sm:text-[6px] md:text-xs font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] rounded-none hover:bg-black hover:text-white transition-all shadow-2xl flex items-center gap-1 md:gap-3 group"
              >
                <ShoppingBag className="w-[6px] h-[6px] md:w-4 md:h-4" />
                {slide.cta}
              </motion.button>
            </div>
          </motion.div>
        </div>

        <div className="absolute inset-0 opacity-5 pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/dust.png')]" />
      </div>

      {/* Sliding Line Indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 md:bottom-10 left-1/2 -translate-x-1/2 flex gap-2 md:gap-3 z-30">
          {slides.map((_, index) => {
            const isActive = index === currentIndex;
            return (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`transition-all duration-500 rounded-full ${
                  isActive
                    ? "w-8 md:w-10 h-1 bg-white"
                    : "w-3 md:w-4 h-1 bg-white/30 hover:bg-white/60"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            );
          })}
        </div>
      )}
    </section>
  );
};

export default WomenHeroCarousel;
