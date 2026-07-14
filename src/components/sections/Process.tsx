import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Reveal from "@/components/Reveal";
import { useSiteContent } from "@/hooks/use-site-content";
import type { ProcessStep } from "@/data/site";
import { cn } from "@/lib/utils";

/**
 * The method, as a diagram.
 *
 * Stacked vertically, six phases meant six screens of scrolling and nobody read
 * past the second. As a plain list of clickable rows, nothing said they WERE
 * clickable, so nobody clicked.
 *
 * So: a real timeline. The phases sit on a rail, each a numbered node, and the
 * detail for one shows beneath. Every node has an unmistakable affordance,
 * a cursor, a lift, a filling ring, and the completed portion of the rail is
 * drawn in the brand gradient, so the diagram reads as progress rather than
 * decoration. Same detail as before, a fraction of the height.
 */
const StepDetail = ({ step }: { step: ProcessStep }) => (
  <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
    <div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h3 className="type-display text-2xl text-foreground">{step.title}</h3>
        <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          {step.duration}
        </span>
      </div>

      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        {step.description}
      </p>

      <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
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
    </div>

    {/* The artefact keeps its own surface. It is what a buyer is really after. */}
    <div className="surface h-fit p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">You get</p>
      <p className="mt-3 text-sm leading-relaxed text-foreground">{step.deliverable}</p>
    </div>
  </div>
);

const Process = ({ hideHeader = false }: { hideHeader?: boolean } = {}) => {
  const { content } = useSiteContent();
  const intro = content.intros.process;
  const PROCESS = content.process;

  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<number | null>(0);

  if (PROCESS.length === 0) return null;

  const progress =
    PROCESS.length > 1 ? (active / (PROCESS.length - 1)) * 100 : 100;

  return (
    <section
      id="process"
      className={hideHeader ? "px-6 pb-16 pt-8 md:pb-24 md:pt-10" : "px-6 py-16 md:py-24"}
    >
      <div className="mx-auto max-w-7xl">
        {!hideHeader && (
          <Reveal as="header" className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.2em] text-accent">
              {intro.eyebrow}
            </p>
            <h2 className="type-display mt-4 text-[clamp(1.85rem,7vw,2.5rem)] text-foreground md:text-5xl">
              {intro.headline}
            </h2>
            <p className="measure mt-4 text-base leading-relaxed text-muted-foreground">
              {intro.description}
            </p>
          </Reveal>
        )}

        {/* ── Desktop: the timeline diagram ────────────────────────────────── */}
        <Reveal className="mt-10 hidden lg:block">
          <div className="relative px-2">
            {/* The rail. A dim base line, with the travelled portion drawn in the
                brand gradient so the diagram reads as progress. */}
            <div
              aria-hidden="true"
              className="absolute left-0 right-0 top-6 h-px bg-border"
            />
            <motion.div
              aria-hidden="true"
              className="gradient-synapse absolute left-0 top-6 h-px"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            />

            <div
              role="tablist"
              aria-label="Delivery phases"
              className="relative grid"
              style={{ gridTemplateColumns: `repeat(${PROCESS.length}, minmax(0, 1fr))` }}
            >
              {PROCESS.map((step, i) => {
                const isActive = i === active;
                const isDone = i < active;

                return (
                  <button
                    key={step.index}
                    role="tab"
                    type="button"
                    aria-selected={isActive}
                    onClick={() => setActive(i)}
                    className="group flex cursor-pointer flex-col items-center px-2 text-center outline-none"
                  >
                    {/* The node. Hover is unmistakable: it lifts, the ring fills,
                        the number inverts. Nobody has to guess it is clickable. */}
                    <span
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm tabular-nums",
                        "transition-all duration-300 ease-apple",
                        "group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-accent",
                        isActive
                          ? "border-accent bg-accent text-white shadow-lg"
                          : isDone
                            ? "border-accent/60 bg-background text-accent"
                            : "border-border bg-background text-muted-foreground group-hover:border-accent group-hover:text-accent",
                      )}
                    >
                      {step.index}
                    </span>

                    <span
                      className={cn(
                        "mt-4 text-sm font-medium tracking-[-0.01em] transition-colors duration-300",
                        isActive
                          ? "text-foreground"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                    >
                      {step.title}
                    </span>

                    <span className="mt-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      {step.duration}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-12 min-h-[16rem]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <StepDetail step={PROCESS[active]} />
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>

        {/* ── Mobile: an accordion. A six-node rail on a phone is unreadable. ── */}
        <div className="mt-8 border-t border-border lg:hidden">
          {PROCESS.map((step, i) => {
            const isOpen = open === i;

            return (
              <div key={step.index} className="border-b border-border">
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 py-4 text-left transition-transform active:scale-[0.99]"
                  >
                    <span className="flex items-center gap-3.5">
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums transition-colors",
                          isOpen
                            ? "border-accent bg-accent text-white"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        {step.index}
                      </span>
                      <span>
                        <span className="block text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                          {step.title}
                        </span>
                        <span className="mt-0.5 block text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                          {step.duration}
                        </span>
                      </span>
                    </span>

                    <ChevronDown
                      size={18}
                      aria-hidden="true"
                      className={cn(
                        "shrink-0 text-muted-foreground transition-transform duration-300",
                        isOpen && "rotate-180 text-accent",
                      )}
                    />
                  </button>
                </h3>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pb-6">
                        <StepDetail step={step} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Process;
