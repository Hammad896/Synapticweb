import Reveal from "@/components/Reveal";
import { TECH_INTRO, TECH_TIERS, type TechTier } from "@/data/site";

/** Flattened once for the ticker; the tiers stay the primary presentation. */
const ALL_TECH = TECH_TIERS.flatMap((tier) => tier.items);

const TierCard = ({ tier, index }: { tier: TechTier; index: number }) => (
  <Reveal
    as="article"
    index={index}
    className="surface flex flex-col p-8 transition-all duration-500 ease-apple hover:border-accent/40"
  >
    <header className="flex items-baseline justify-between gap-4">
      <h3 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
        {tier.tier}
      </h3>
      <span className="shrink-0 text-xs tabular-nums text-accent">
        {String(index + 1).padStart(2, "0")}
      </span>
    </header>

    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
      {tier.scope}
    </p>

    <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
      {tier.description}
    </p>

    <ul className="mt-8 flex flex-wrap gap-2">
      {tier.items.map((item) => (
        <li
          key={item}
          className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground transition-colors duration-300 ease-apple hover:border-accent hover:text-accent"
        >
          {item}
        </li>
      ))}
    </ul>

    {/* Pushed to the bottom so the "who is this for" line aligns across all four
        cards regardless of how much description sits above it. */}
    <p className="mt-auto border-t border-border pt-6 text-sm leading-relaxed text-foreground">
      <span className="text-muted-foreground">Suited to </span>
      {tier.suitedTo}
    </p>
  </Reveal>
);

const Technologies = () => (
  <section id="technologies" className="py-24 md:py-32">
    <div className="mx-auto max-w-7xl px-6">
      <Reveal as="header" className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">
          {TECH_INTRO.eyebrow}
        </p>
        <h2 className="type-display mt-6 text-4xl text-foreground md:text-6xl">
          {TECH_INTRO.headline}
        </h2>
        <p className="measure mt-6 text-lg leading-relaxed text-muted-foreground">
          {TECH_INTRO.description}
        </p>
      </Reveal>

      <div className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {TECH_TIERS.map((tier, i) => (
          <TierCard key={tier.tier} tier={tier} index={i} />
        ))}
      </div>
    </div>

    {/* Full-bleed ticker. The track is duplicated and the animation translates
        exactly -50%, so the loop seam is invisible. The second copy is hidden
        from assistive tech so the list is not announced twice. */}
    <div className="group relative mt-24 overflow-hidden border-y border-border py-6 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
      <div className="flex w-max animate-marquee gap-12 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {[0, 1].map((track) => (
          <ul
            key={track}
            aria-hidden={track === 1 || undefined}
            className="flex shrink-0 items-center gap-12"
          >
            {ALL_TECH.map((tech) => (
              <li
                key={tech}
                className="whitespace-nowrap text-sm uppercase tracking-[0.15em] text-muted-foreground"
              >
                {tech}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  </section>
);

export default Technologies;
