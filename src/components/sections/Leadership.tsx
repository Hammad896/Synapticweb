import Reveal from "@/components/Reveal";
import { EXECUTIVES, LEADERSHIP_INTRO, type Executive } from "@/data/site";

const ExecutiveCard = ({
  executive,
  index,
}: {
  executive: Executive;
  index: number;
}) => (
  <Reveal
    as="article"
    index={index}
    className="group surface flex flex-col p-10 transition-all duration-500 ease-apple hover:scale-[1.02] hover:border-accent/40 md:p-12"
  >
    {/* A monogram, not a stock headshot. Nothing here pretends to be a photo. */}
    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border text-sm font-medium tracking-[0.05em] text-accent transition-colors duration-500 ease-apple group-hover:border-accent">
      {executive.initials}
    </div>

    <header className="mt-10">
      <h3 className="type-display text-3xl text-foreground md:text-4xl">
        {executive.name}
      </h3>
      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {executive.role}
      </p>
    </header>

    <p className="measure mt-8 text-base leading-relaxed text-muted-foreground">
      {executive.summary}
    </p>

    <ul className="mt-10 border-t border-border pt-2">
      {executive.domains.map((domain) => (
        <li
          key={domain}
          className="border-b border-border py-4 text-sm text-foreground last:border-b-0"
        >
          {domain}
        </li>
      ))}
    </ul>
  </Reveal>
);

const Leadership = () => (
  <section id="leadership" className="px-6 py-32 md:py-40">
    <div className="mx-auto max-w-7xl">
      <Reveal as="header" className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">
          {LEADERSHIP_INTRO.eyebrow}
        </p>
        <h2 className="type-display mt-6 text-4xl text-foreground md:text-6xl">
          {LEADERSHIP_INTRO.headline}
        </h2>
        <p className="measure mt-6 text-lg leading-relaxed text-muted-foreground">
          {LEADERSHIP_INTRO.description}
        </p>
      </Reveal>

      <div className="mt-20 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {EXECUTIVES.map((executive, i) => (
          <ExecutiveCard key={executive.name} executive={executive} index={i} />
        ))}
      </div>
    </div>
  </section>
);

export default Leadership;
