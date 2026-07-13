import { useEffect, useMemo, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

/**
 * Counts a stat up when it scrolls into view.
 *
 * Values arrive as display strings ("150+", "$2M+", "99%"), so we split off any
 * prefix and suffix and animate only the numeric core — the "$" and "+" stay put
 * instead of flickering.
 *
 * ⚠️ The parse is memoised, and the effect depends only on PRIMITIVES.
 * `String.match()` returns a fresh array object on every render, so passing the
 * match itself as a dependency made the effect tear down and restart the
 * animation on every frame — the numbers thrashed near zero and never arrived
 * at their target. Do not put a non-primitive in these deps.
 *
 * Accessibility: the animating text is aria-hidden and the true final value is
 * exposed to assistive tech, so a screen reader announces "150+" once, cleanly,
 * rather than a stream of intermediate numbers.
 */
const CountUp = ({ value, className }: { value: string; className?: string }) => {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });

  const { prefix, target, suffix, decimals, parsed } = useMemo(() => {
    const match = value.match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);

    return {
      prefix: match?.[1] ?? "",
      target: match ? Number(match[2]) : 0,
      suffix: match?.[3] ?? "",
      decimals: match?.[2].includes(".") ? 1 : 0,
      parsed: match !== null,
    };
  }, [value]);

  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!parsed) return;

    // Reduced motion: land on the final value immediately, no animation.
    if (prefersReducedMotion) {
      setDisplay(target);
      return;
    }

    if (!isInView) return;

    const controls = animate(0, target, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setDisplay,
      // Guarantees we finish exactly on target rather than a rounded frame.
      onComplete: () => setDisplay(target),
    });

    return () => controls.stop();
  }, [isInView, prefersReducedMotion, target, parsed]);

  // Unparseable value — render it verbatim rather than dropping it.
  if (!parsed) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span ref={ref} className={className}>
      <span aria-hidden="true">
        {prefix}
        {display.toFixed(decimals)}
        {suffix}
      </span>
      <span className="sr-only">{value}</span>
    </span>
  );
};

export default CountUp;
