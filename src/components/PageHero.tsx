import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The header every sub-page opens with.
 *
 * Before this, a sub-page simply rendered a section — so it opened on a blank
 * band, then a small eyebrow, with no sense of *where you were*. It read like a
 * fragment of the home page that had been cut out and dropped on its own.
 *
 * A page needs an identity: it says where you are (the crumb), what this page
 * is (the title), and why you should read on. It carries the same atmosphere as
 * the home hero — the grid and the bloom — so the site feels continuous rather
 * than like eight unrelated documents.
 */
const PageHero = ({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) => {
  const prefersReducedMotion = useReducedMotion();

  const rise = (delay: number) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, delay, ease: EASE },
        };

  return (
    <section className="relative overflow-hidden border-b border-border px-6 pb-16 pt-14 md:pb-20 md:pt-16">
      {/* Same two atmospheric layers as the home hero, at lower intensity — the
          page is a chapter, not the cover. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)] [background-image:linear-gradient(to_right,hsl(var(--grid-line))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--grid-line))_1px,transparent_1px)] [background-size:72px_72px] opacity-50"
      />
      <div
        aria-hidden="true"
        className="bloom pointer-events-none absolute inset-0 opacity-70"
      />

      <div className="relative mx-auto max-w-7xl">
        {/* The crumb. Small, but it is the thing that makes a page feel like part
            of a site rather than an orphan. */}
        <motion.nav {...rise(0)} aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <li>
              <Link to="/" className="transition-colors hover:text-accent">
                Home
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight size={13} className="text-border" />
            </li>
            <li aria-current="page" className="text-foreground">
              {eyebrow}
            </li>
          </ol>
        </motion.nav>

        <motion.h1
          {...rise(0.08)}
          className="type-display mt-6 max-w-4xl text-balance text-[clamp(2rem,5.5vw,4rem)] text-foreground"
        >
          {title}
        </motion.h1>

        {description && (
          <motion.p
            {...rise(0.16)}
            className="measure mt-5 text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            {description}
          </motion.p>
        )}
      </div>
    </section>
  );
};

export default PageHero;
