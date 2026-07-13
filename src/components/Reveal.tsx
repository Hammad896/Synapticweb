import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

type RevealTag = "div" | "article" | "section" | "header" | "li" | "ul";

/** Resolved once at module scope. Calling `motion(tag)` inside render would mint
 *  a new component identity every pass and remount the subtree. */
const MOTION_TAGS = {
  div: motion.div,
  article: motion.article,
  section: motion.section,
  header: motion.header,
  li: motion.li,
  ul: motion.ul,
} as const;

interface RevealProps {
  children: ReactNode;
  /** Stagger step, in reveal order. Capped so long grids never feel laggy. */
  index?: number;
  className?: string;
  /** Render as a semantic element instead of a div. */
  as?: RevealTag;
}

const EASE = [0.16, 1, 0.3, 1] as const;
const STAGGER = 0.07;
const MAX_STAGGER = 0.35;

/**
 * The single scroll-reveal primitive for the whole site: opacity 0→1 with a 24px
 * rise, fired once. Every section uses it — one shared curve is what makes the
 * page feel like a single object rather than a stack of animated widgets.
 *
 * Under `prefers-reduced-motion` the content renders at rest. The CSS media query
 * alone would not cover this: Framer animates inline styles, so the element would
 * otherwise sit at opacity:0 forever.
 */
const Reveal = ({ children, index = 0, className, as = "div" }: RevealProps) => {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const MotionTag = MOTION_TAGS[as];

  const variants: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: EASE,
        delay: Math.min(index * STAGGER, MAX_STAGGER),
      },
    },
  };

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
    >
      {children}
    </MotionTag>
  );
};

export default Reveal;
