import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

/**
 * A 2px hairline of the brand gradient that fills as the page is read. It is the
 * cheapest possible way to make a long page feel authored rather than endless —
 * and it puts the logo's own colours in the viewer's peripheral vision the whole
 * way down.
 *
 * Driven by `useScroll` (a single passive listener) and smoothed by a spring, so
 * it never stutters against the scroll.
 */
const ScrollProgress = () => {
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 30,
    restDelta: 0.001,
  });

  if (prefersReducedMotion) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="gradient-synapse fixed inset-x-0 top-14 z-50 h-[2px] origin-left"
    />
  );
};

export default ScrollProgress;
