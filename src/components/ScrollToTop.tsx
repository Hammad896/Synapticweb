import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets scroll on route change.
 *
 * Without this, navigating from halfway down the home page to /careers lands you
 * halfway down /careers — the browser preserves scroll position across a
 * client-side route change. It is the single most common bug when a single-page
 * site becomes a multi-page one, and it reads as the page being broken.
 *
 * An in-page hash link is left alone: that scroll is the point of it.
 */
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
