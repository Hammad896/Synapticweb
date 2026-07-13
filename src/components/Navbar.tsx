import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import Logo from "./Logo";
import { COMPANY, NAV_LINKS } from "@/data/site";
import { useActiveSection } from "@/hooks/use-active-section";
import { cn } from "@/lib/utils";

/** Derived once — the hook memoises on identity, so this must not be inline. */
const SECTION_IDS = NAV_LINKS.map((link) => link.href.slice(1));

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const activeId = useActiveSection(SECTION_IDS);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The sheet is full-screen; letting the page scroll behind it feels broken.
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <nav
        aria-label="Primary"
        className={cn(
          "fixed inset-x-0 top-0 z-50 h-14",
          "bg-background/70 backdrop-blur-md backdrop-saturate-150",
          "border-b transition-colors duration-500 ease-apple",
          // The bar never grows or gains a shadow — only the hairline resolves in.
          scrolled ? "border-border" : "border-transparent",
        )}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6 lg:px-8">
          <a
            href="#top"
            aria-label={`${COMPANY.name} — back to top`}
            className="transition-opacity duration-300 ease-apple hover:opacity-70"
          >
            <Logo className="h-7 md:h-8" />
          </a>

          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => {
              const isActive = activeId === link.href.slice(1);

              return (
                <a
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "relative text-xs transition-colors duration-300 ease-apple hover:text-accent",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {link.label}
                  {/* The reader always knows where they are. A 1px gradient rule
                      rather than a color swap — quieter, and it reuses the brand. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "gradient-synapse absolute -bottom-1.5 left-0 h-px w-full origin-left transition-transform duration-500 ease-apple",
                      isActive ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </a>
              );
            })}

            <ThemeToggle />

            <a
              href="#contact"
              className="rounded-full bg-accent-solid px-4 py-1.5 text-xs font-medium text-accent-foreground transition-all duration-300 ease-apple hover:scale-[1.02] hover:opacity-90"
            >
              Let's talk
            </a>
          </div>

          {/* -mr-2 pulls the enlarged 44px hit area back to the visual edge, so
              the touch target grows without the icon looking inset. */}
          <div className="-mr-2 flex items-center md:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setIsOpen((open) => !open)}
              aria-label={isOpen ? "Close menu" : "Open menu"}
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
              className="tap rounded-full text-foreground transition-opacity duration-300 ease-apple hover:opacity-70"
            >
              {isOpen ? (
                <X size={20} strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <Menu size={20} strokeWidth={1.75} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="screen-h fixed inset-0 z-40 overflow-y-auto bg-background/95 backdrop-blur-xl md:hidden"
          >
            {/* pt-20 clears the nav; the sheet scrolls if the list ever outgrows
                a short phone in landscape rather than clipping its own CTA. */}
            <div className="safe-bottom flex min-h-full flex-col justify-center px-6 pb-10 pt-20">
              <ul className="flex flex-col">
                {NAV_LINKS.map((link, i) => (
                  <motion.li
                    key={link.href}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.5,
                      delay: 0.05 * i,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <a
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      // py-4 gives every row a 60px+ target — thumbs are not cursors.
                      className="type-display block py-4 text-[clamp(1.75rem,8vw,2.5rem)] text-foreground transition-colors duration-300 ease-apple hover:text-accent"
                    >
                      {link.label}
                    </a>
                  </motion.li>
                ))}
              </ul>

              <a
                href="#contact"
                onClick={() => setIsOpen(false)}
                className="mt-10 w-full rounded-full bg-accent-solid py-4 text-center text-base font-medium text-accent-foreground transition-opacity duration-300 ease-apple hover:opacity-90"
              >
                Let's talk
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
