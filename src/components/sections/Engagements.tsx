import { Check } from "lucide-react";
import Reveal from "@/components/Reveal";
import { ENGAGEMENTS, ENGAGEMENTS_INTRO, type Engagement } from "@/data/site";

/**
 * The commercial heart of the page: it answers "what am I actually buying?"
 * before the visitor has to work it out from a capability list. Two models,
 * side by side, each with a plain-language pitch and a concrete inclusion list.
 */
const EngagementCard = ({
  engagement,
  index,
}: {
  engagement: Engagement;
  index: number;
}) => (
  <Reveal
    as="article"
    index={index}
    className="group surface relative isolate flex flex-col overflow-hidden p-10 transition-transform duration-500 ease-apple hover:scale-[1.02] md:p-14"
  >
    <div
      aria-hidden="true"
      className="gradient-fill absolute inset-0 -z-10 origin-bottom scale-y-0 transition-transform duration-500 ease-apple group-hover:scale-y-100"
    />

    <span className="type-display block text-5xl tabular-nums text-accent transition-colors duration-500 ease-apple group-hover:text-white">
      {engagement.index}
    </span>

    <header className="mt-16">
      <h3 className="type-display text-3xl text-foreground transition-colors duration-500 ease-apple group-hover:text-white md:text-4xl">
        {engagement.title}
      </h3>
      <p className="mt-3 text-sm font-medium text-accent transition-colors duration-500 ease-apple group-hover:text-white/90">
        {engagement.pitch}
      </p>
    </header>

    <p className="measure mt-6 text-base leading-relaxed text-muted-foreground transition-colors duration-500 ease-apple group-hover:text-white/80">
      {engagement.description}
    </p>

    <ul className="mt-10 flex flex-col gap-4 border-t border-border pt-8 transition-colors duration-500 ease-apple group-hover:border-white/20">
      {engagement.points.map((point) => (
        <li key={point} className="flex items-start gap-3">
          <Check
            size={16}
            strokeWidth={2}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-accent transition-colors duration-500 ease-apple group-hover:text-white"
          />
          <span className="text-sm leading-relaxed text-foreground transition-colors duration-500 ease-apple group-hover:text-white/90">
            {point}
          </span>
        </li>
      ))}
    </ul>
  </Reveal>
);

const Engagements = () => (
  <section id="engagements" className="px-6 py-24 md:py-32">
    <div className="mx-auto max-w-7xl">
      <Reveal as="header" className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">
          {ENGAGEMENTS_INTRO.eyebrow}
        </p>
        <h2 className="type-display mt-6 text-4xl text-foreground md:text-6xl">
          {ENGAGEMENTS_INTRO.headline}
        </h2>
        <p className="measure mt-6 text-lg leading-relaxed text-muted-foreground">
          {ENGAGEMENTS_INTRO.description}
        </p>
      </Reveal>

      <div className="mt-20 grid gap-6 md:grid-cols-2">
        {ENGAGEMENTS.map((engagement, i) => (
          <EngagementCard key={engagement.index} engagement={engagement} index={i} />
        ))}
      </div>
    </div>
  </section>
);

export default Engagements;
