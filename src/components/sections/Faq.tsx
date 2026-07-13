import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import Reveal from "@/components/Reveal";
import { FAQS, FAQ_INTRO } from "@/data/site";
import { cn } from "@/lib/utils";

/**
 * Native disclosure semantics — a real <button aria-expanded> controlling a
 * region — rather than a component library. The indicator rotates 45° into an
 * "×" instead of swapping icons, so the transition is a single transform.
 */
const Faq = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="px-6 py-32 md:py-40">
      <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
        <Reveal as="header">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">
            {FAQ_INTRO.eyebrow}
          </p>
          <h2 className="type-display mt-6 text-4xl text-foreground md:text-5xl">
            {FAQ_INTRO.headline}
          </h2>
        </Reveal>

        <Reveal index={1}>
          <ul className="border-t border-border">
            {FAQS.map((faq, i) => {
              const isOpen = openIndex === i;
              const panelId = `faq-panel-${i}`;
              const buttonId = `faq-trigger-${i}`;

              return (
                <li key={faq.question} className="border-b border-border">
                  <h3>
                    <button
                      type="button"
                      id={buttonId}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenIndex(isOpen ? null : i)}
                      className="flex w-full items-start justify-between gap-8 py-7 text-left transition-colors duration-300 ease-apple hover:text-accent"
                    >
                      <span className="text-lg font-medium tracking-[-0.01em] text-foreground transition-colors duration-300 ease-apple hover:text-accent md:text-xl">
                        {faq.question}
                      </span>
                      <Plus
                        size={20}
                        strokeWidth={1.5}
                        aria-hidden="true"
                        className={cn(
                          "mt-1 shrink-0 text-accent transition-transform duration-500 ease-apple",
                          isOpen && "rotate-45",
                        )}
                      />
                    </button>
                  </h3>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="measure pb-8 pr-12 text-base leading-relaxed text-muted-foreground">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
};

export default Faq;
