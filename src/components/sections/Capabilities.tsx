import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import Reveal from "@/components/Reveal";
import { getRepository } from "@/admin/repository";
import { CAPABILITIES, CAPABILITIES_INTRO, type Capability } from "@/data/site";

/**
 * An aligned row list, not a bento.
 *
 * The previous grid used spans of 4,2,2,2,4 on a 6-column track, which packs as
 * 4+2 / 2+2 / 4 — leaving two ragged holes — and each card carried a fixed 4rem
 * spacer that pushed it to ~400px tall. The result was a section you scrolled
 * through rather than read.
 *
 * Rows fix both at once: every index, title, description, and detail column
 * lands on the same vertical axis down the whole list, and the section is a
 * third of the height. Alignment is the style here — the grid IS the design.
 */
const CapabilityRow = ({
  capability,
  index,
}: {
  capability: Capability;
  index: number;
}) => (
  <Reveal
    as="li"
    index={index}
    className="group relative isolate border-b border-border first:border-t"
  >
    {/* The fill sweeps horizontally on a row (origin-left), where the card
        version swept vertically. A separate layer, not a background transition —
        CSS cannot interpolate between gradients. */}
    <div
      aria-hidden="true"
      className="gradient-fill absolute inset-0 -z-10 origin-left scale-x-0 transition-transform duration-500 ease-apple group-hover:scale-x-100"
    />

    <article className="grid items-baseline gap-x-8 gap-y-3 px-1 py-7 transition-[padding] duration-500 ease-apple group-hover:px-3 sm:px-4 sm:py-9 sm:group-hover:px-8 lg:grid-cols-12 lg:gap-y-4 lg:py-10">
      {/* Below lg the index rides INLINE with the title. Left on its own row it
          reads as an orphaned number floating above the heading — the classic
          artefact of a desktop grid collapsing into a single column. */}
      <div className="flex items-baseline gap-4 lg:contents">
        <span className="shrink-0 text-sm tabular-nums text-accent transition-colors duration-500 ease-apple group-hover:text-white lg:col-span-1">
          {capability.index}
        </span>

        <h3 className="type-display text-xl text-foreground transition-colors duration-500 ease-apple group-hover:text-white sm:text-2xl lg:col-span-4 lg:text-3xl">
          {capability.title}
        </h3>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground transition-colors duration-500 ease-apple group-hover:text-white/80 lg:col-span-4">
        {capability.description}
      </p>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 lg:col-span-2 lg:flex-col lg:gap-y-2">
        {capability.detail.map((item) => (
          <li
            key={item}
            className="text-xs text-muted-foreground transition-colors duration-500 ease-apple group-hover:text-white/70"
          >
            {item}
          </li>
        ))}
      </ul>

      <ArrowUpRight
        size={20}
        strokeWidth={1.5}
        aria-hidden="true"
        className="hidden text-muted-foreground opacity-0 transition-all duration-500 ease-apple group-hover:translate-x-1 group-hover:text-white group-hover:opacity-100 lg:col-span-1 lg:block lg:justify-self-end"
      />
    </article>
  </Reveal>
);

const Capabilities = () => {
  const [live, setLive] = useState<Capability[] | null>(null);

  useEffect(() => {
    void getRepository()
      .listCapabilities()
      .then((rows) => {
        const active = rows.filter((r) => r.isActive);
        if (active.length > 0) {
          setLive(
            active.map((r, i) => ({
              id: r.id,
              index: String(i + 1).padStart(2, "0"),
              title: r.title,
              description: r.description,
              detail: r.detail,
            })),
          );
        }
      })
      .catch(() => {
        /* fall back to the built-ins */
      });
  }, []);

  const capabilities = live ?? CAPABILITIES;

  return (
  <section id="capabilities" className="px-6 py-24 md:py-32">
    <div className="mx-auto max-w-7xl">
      <Reveal as="header" className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">
          {CAPABILITIES_INTRO.eyebrow}
        </p>
        <h2 className="type-display mt-5 text-[clamp(1.85rem,7vw,2.5rem)] text-foreground sm:mt-6 md:text-6xl">
          {CAPABILITIES_INTRO.headline}
        </h2>
        <p className="measure mt-5 text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
          {CAPABILITIES_INTRO.description}
        </p>
      </Reveal>

      <ul className="mt-10 sm:mt-16">
        {capabilities.map((capability, i) => (
          <CapabilityRow key={capability.id} capability={capability} index={i} />
        ))}
      </ul>
    </div>
  </section>
  );
};

export default Capabilities;
