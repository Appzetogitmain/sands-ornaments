import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { scrollToTop, getLenis } from "./lib/lenis";

/**
 * Bulletproof Scroll Restoration for Sands Jewels
 * Uses useRef to remember viewport positions across navigations.
 * Optimized for Lenis Smooth Scroll.
 */
const ScrollToTop = () => {
  const location = useLocation();
  const navType = useNavigationType();

  // Persistent ref to store positions: { [pathname+search]: scrollY }
  const scrollPositions = useRef({});

  // Synchronously update current key to avoid race conditions during transitions
  const currentKey = location.pathname + location.search;
  const keyRef = useRef(currentKey);
  keyRef.current = currentKey;

  // 1. Set scroll restoration to manual globally
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // 2. Continuously save scroll position on window scroll events
  // This bound window listener captures all scroll updates from both Lenis and native scrolling.
  useEffect(() => {
    const handleSavePosition = () => {
      const lenis = getLenis();
      const scrollY = lenis ? lenis.scroll : window.scrollY;

      // Only save if it's a meaningful scroll position
      if (scrollY >= 0) {
        scrollPositions.current[keyRef.current] = scrollY;
      }
    };

    window.addEventListener("scroll", handleSavePosition, { passive: true });
    return () => window.removeEventListener("scroll", handleSavePosition);
  }, []);

  // 3. Persist to sessionStorage as backup for hard refreshes
  useLayoutEffect(() => {
    const key = location.pathname + location.search;
    return () => {
      const pos = scrollPositions.current[key];
      if (pos > 0) {
        try {
          sessionStorage.setItem(`scroll_${key}`, String(pos));
        } catch (e) {
          /* ignore */
        }
      }
    };
  }, [location.pathname, location.search]);

  // 4. Handle Restoration on POP (Back/Forward) or PUSH (New Page)
  useEffect(() => {
    const key = location.pathname + location.search;

    if (navType === "POP") {
      const savedScroll =
        scrollPositions.current[key] ||
        Number(sessionStorage.getItem(`scroll_${key}`)) ||
        0;

      if (savedScroll > 0) {
        let observer = null;
        let timeoutId = null;

        const performRestore = () => {
          const lenis = getLenis();
          console.log("[ScrollToTop] Performing restore to", savedScroll, "Lenis:", !!lenis);
          
          const doScroll = () => {
            if (lenis) {
              lenis.resize();
              lenis.scrollTo(savedScroll, { immediate: true });
              // Backup after a tiny delay in case lenis takes a frame to update bounds
              setTimeout(() => {
                  if (lenis) {
                      lenis.resize();
                      lenis.scrollTo(savedScroll, { immediate: true });
                  }
              }, 100);
            } else {
              window.scrollTo(0, savedScroll);
            }
          };

          requestAnimationFrame(doScroll);

          if (observer) observer.disconnect();
        };

        console.log("[ScrollToTop] Page height is", document.documentElement.scrollHeight, "Target is", savedScroll);
        // Try immediately in case the page is already tall enough
        if (document.documentElement.scrollHeight >= savedScroll) {
          console.log("[ScrollToTop] Page already tall enough, restoring immediately.");
          performRestore();
        } else {
          console.log("[ScrollToTop] Page too short, waiting for resize...");
          // If not tall enough, wait for the page to render using ResizeObserver
          observer = new ResizeObserver(() => {
            if (document.documentElement.scrollHeight >= savedScroll) {
              console.log("[ScrollToTop] Page became tall enough (", document.documentElement.scrollHeight, "), restoring now.");
              performRestore();
            }
          });
          observer.observe(document.documentElement);
          
          // Timeout as a fallback to try restoring anyway and clean up after 2.5s
          timeoutId = setTimeout(() => {
             console.log("[ScrollToTop] Timeout reached, restoring anyway.");
             performRestore(); // will just try its best
          }, 2500);
        }

        return () => {
          if (observer) observer.disconnect();
          if (timeoutId) clearTimeout(timeoutId);
        };
      } else {
         console.log("[ScrollToTop] No saved scroll found for", key);
      }
    } else {
      console.log("[ScrollToTop] New navigation (PUSH/REPLACE). Scrolling to top.");
      // New navigation (PUSH/REPLACE): Always scroll to top immediately
      const lenis = getLenis();
      if (lenis) {
        lenis.scrollTo(0, { immediate: true });
      } else {
        window.scrollTo(0, 0);
      }
    }
  }, [location.pathname, location.search, navType]);

  return null;
};

export default ScrollToTop;
