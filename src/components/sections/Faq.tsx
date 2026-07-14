import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import Reveal from "@/components/Reveal";
import { useSiteContent } from "@/hooks/use-site-content";
import { cn } from "@/lib/utils";

/**
 * Native disclosure semantics — a real <button aria-expanded> controlling a
 * region — rather than a component library. The indicator rotates 45° into an
 * "×" instead of swapping icons, so the transition is a single transform.
 */
const Faq = ({ hideHeader = false }: { hideHeader?: boolean } = {}) => {
  const { content } = useSiteContent();
  const intro = content.intros.faq;
  const FAQS = content.faqs;

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="px-6 py-16 md:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
        {!hideHeader && (

          <Reveal as="header">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">
            {intro.eyebrow}
          </p>
          <h2 className="type-display mt-5 text-[clamp(1.85rem,7vw,2.5rem)] text-foreground sm:mt-6 md:text-5xl">
            {intro.headline}
          </h2>
          </Reveal>

        )}

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
                      className="flex w-full items-start justify-between gap-5 py-6 text-left transition-colors duration-300 ease-apple hover:text-accent sm:gap-8 sm:py-7"
                    >
                      <span className="text-base font-medium tracking-[-0.01em] text-foreground transition-colors duration-300 ease-apple hover:text-accent sm:text-lg md:text-xl">
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
                        <p className="measure pb-7 pr-2 text-sm leading-relaxed text-muted-foreground sm:pb-8 sm:pr-12 sm:text-base">
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
