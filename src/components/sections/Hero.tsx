import { motion, useReducedMotion } from "framer-motion";
import CountUp from "@/components/CountUp";
import LiveStatus from "@/components/LiveStatus";
import { HERO, PARTNERS, STATS } from "@/data/site";

const EASE = [0.16, 1, 0.3, 1] as const;

const Hero = () => {
  const prefersReducedMotion = useReducedMotion();

  // Time-based, not scroll-based: the hero is already in view on load, so
  // `whileInView` would fire instantly and read as a glitch.
  const rise = (delay: number) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.9, delay, ease: EASE },
        };

  const words = HERO.headline.split(" ");

  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-24 md:pt-28">
      {/* Three stacked, purely atmospheric layers, all theme-aware: a hairline
          grid masked to fade radially, a bloom of the brand gradient behind the
          headline, and film grain to kill banding on the near-black. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] [background-image:linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] [background-size:72px_72px] opacity-50"
      />
      <div aria-hidden="true" className="bloom pointer-events-none absolute inset-0" />

      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-col items-center text-center">
          <motion.div {...rise(0)}>
            <LiveStatus />
          </motion.div>

          {/* Word-by-word reveal. The headline assembles itself rather than
              fading in as a block — the single most-watched moment on the page,
              and the only place we spend this much motion.

              Size is capped at 5rem and the measure at ~14ch-per-line via
              max-w-4xl: at 8vw/7.5rem this wrapped to four lines on a laptop and
              pushed the CTAs below the fold. On a page that has to sell, the buy
              button outranks the type scale. */}
          <h1 className="type-display mt-10 max-w-4xl text-balance text-[clamp(2.25rem,5vw,5rem)] text-foreground">
            {prefersReducedMotion ? (
              HERO.headline
            ) : (
              <span className="inline">
                {words.map((word, i) => (
                  <span
                    key={`${word}-${i}`}
                    className="inline-block overflow-hidden align-bottom"
                  >
                    <motion.span
                      className="inline-block"
                      initial={{ y: "110%" }}
                      animate={{ y: 0 }}
                      transition={{
                        duration: 0.9,
                        delay: 0.15 + i * 0.06,
                        ease: EASE,
                      }}
                    >
                      {word}
                    </motion.span>
                    {i < words.length - 1 && " "}
                  </span>
                ))}
              </span>
            )}
          </h1>

          <motion.p
            {...rise(0.6)}
            className="measure mt-7 text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            {HERO.subheadline}
          </motion.p>

          <motion.div
            {...rise(0.7)}
            className="mt-10 flex flex-col items-center gap-6 sm:flex-row"
          >
            <a
              href={HERO.primaryCta.href}
              className="rounded-full bg-accent-solid px-8 py-3.5 text-sm font-medium text-accent-foreground transition-all duration-300 ease-apple hover:scale-[1.02] hover:opacity-90"
            >
              {HERO.primaryCta.label}
            </a>

            <a
              href={HERO.secondaryCta.href}
              className="text-sm text-muted-foreground transition-colors duration-300 ease-apple hover:text-foreground"
            >
              {HERO.secondaryCta.label}
            </a>
          </motion.div>

          {/* The trust strip. Named partners above the fold do more for
              credibility than any adjective in the headline could. */}
          <motion.div {...rise(0.8)} className="mt-14 flex flex-col items-center gap-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {HERO.trustLabel}
            </p>
            <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {PARTNERS.map((partner) => (
                <li key={partner.name}>
                  <a
                    href="#partners"
                    className="type-display text-xl text-foreground transition-colors duration-300 ease-apple hover:text-accent md:text-2xl"
                  >
                    {partner.name}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.dl
          {...rise(0.9)}
          className="mt-20 grid grid-cols-2 gap-x-6 gap-y-10 border-t border-border pt-12 md:grid-cols-4"
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <CountUp
                  value={stat.value}
                  className="type-display block text-4xl tabular-nums text-foreground md:text-5xl"
                />
                <span
                  aria-hidden="true"
                  className="mt-3 block text-xs uppercase tracking-[0.2em] text-muted-foreground"
                >
                  {stat.label}
                </span>
              </dd>
            </div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
};

export default Hero;
