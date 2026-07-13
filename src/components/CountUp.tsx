import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

/**
 * Counts a stat up when it scrolls into view. Numbers that climb are the single
 * most reliable "this site is alive" cue there is — and unlike most such tricks
 * it costs nothing and carries real information.
 *
 * Values arrive as display strings ("150+", "$2M+", "99%"), so we split off any
 * prefix and suffix and animate only the numeric core — the "$" and "+" stay put
 * instead of flickering.
 *
 * Accessibility: the animating text is aria-hidden and the true final value is
 * exposed to assistive tech, so a screen reader announces "150+" once, cleanly,
 * rather than a stream of intermediate numbers.
 */
const CountUp = ({ value, className }: { value: string; className?: string }) => {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });

  const match = value.match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
  const prefix = match?.[1] ?? "";
  const target = match ? Number(match[2]) : 0;
  const suffix = match?.[3] ?? "";
  const decimals = match?.[2].includes(".") ? 1 : 0;

  const [display, setDisplay] = useState(prefersReducedMotion ? target : 0);

  useEffect(() => {
    if (!isInView || prefersReducedMotion || !match) return;

    const controls = animate(0, target, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(latest),
    });

    return () => controls.stop();
  }, [isInView, prefersReducedMotion, target, match]);

  // Unparseable value — render it verbatim rather than dropping it.
  if (!match) {
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
