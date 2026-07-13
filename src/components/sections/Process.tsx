import Reveal from "@/components/Reveal";
import { PROCESS, PROCESS_INTRO, type ProcessStep } from "@/data/site";

/**
 * Rows, not four thin cards. Each phase now carries a duration, what actually
 * happens in it, and — the part buyers care about — the artefact that lands in
 * their hands at the end. The left rail keeps the numerals on one axis so the
 * whole method reads as a single sequence rather than four disconnected boxes.
 */
const ProcessRow = ({ step, index }: { step: ProcessStep; index: number }) => (
  <Reveal
    as="li"
    index={index}
    className="group grid gap-x-10 gap-y-5 border-b border-border py-9 sm:gap-y-6 sm:py-12 lg:grid-cols-12"
  >
    <div className="lg:col-span-3">
      <div className="flex items-baseline gap-3 sm:gap-4">
        <span className="type-display text-3xl tabular-nums text-accent sm:text-4xl">
          {step.index}
        </span>
        <h3 className="text-lg font-semibold tracking-[-0.02em] text-foreground sm:text-xl">
          {step.title}
        </h3>
      </div>
      <p className="mt-2.5 text-xs uppercase tracking-[0.15em] text-muted-foreground sm:mt-3 sm:tracking-[0.2em]">
        {step.duration}
      </p>
    </div>

    <p className="text-sm leading-relaxed text-muted-foreground sm:text-base lg:col-span-4">
      {step.description}
    </p>

    <ul className="flex flex-col gap-2 lg:col-span-3">
      {step.activities.map((activity) => (
        <li
          key={activity}
          className="flex gap-3 text-sm leading-relaxed text-foreground"
        >
          <span aria-hidden="true" className="mt-2 h-px w-3 shrink-0 bg-accent" />
          {activity}
        </li>
      ))}
    </ul>

    {/* The artefact — the answer to "what do I actually get?" — so it is the one
        element in the row with a surface of its own. */}
    <div className="surface p-5 lg:col-span-2">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">You get</p>
      <p className="mt-3 text-sm leading-relaxed text-foreground">{step.deliverable}</p>
    </div>
  </Reveal>
);

const Process = () => (
  <section id="process" className="px-6 py-24 md:py-32">
    <div className="mx-auto max-w-7xl">
      <Reveal as="header" className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">
          {PROCESS_INTRO.eyebrow}
        </p>
        <h2 className="type-display mt-5 text-[clamp(1.85rem,7vw,2.5rem)] text-foreground sm:mt-6 md:text-6xl">
          {PROCESS_INTRO.headline}
        </h2>
        <p className="measure mt-5 text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg">
          {PROCESS_INTRO.description}
        </p>
      </Reveal>

      <ol className="mt-10 border-t border-border sm:mt-16">
        {PROCESS.map((step, i) => (
          <ProcessRow key={step.index} step={step} index={i} />
        ))}
      </ol>
    </div>
  </section>
);

export default Process;
