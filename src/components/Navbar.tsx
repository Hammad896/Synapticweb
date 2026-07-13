import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import Logo from "./Logo";
import { COMPANY, NAV_LINKS } from "@/data/site";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
            <Logo className="h-6 md:h-7" />
          </a>

          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-xs text-muted-foreground transition-colors duration-300 ease-apple hover:text-accent"
              >
                {link.label}
              </a>
            ))}

            <ThemeToggle />

            <a
              href="#contact"
              className="rounded-full bg-accent-solid px-4 py-1.5 text-xs font-medium text-accent-foreground transition-all duration-300 ease-apple hover:scale-[1.02] hover:opacity-90"
            >
              Let's talk
            </a>
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setIsOpen((open) => !open)}
              aria-label={isOpen ? "Close menu" : "Open menu"}
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
              className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-opacity duration-300 ease-apple hover:opacity-70"
            >
              {isOpen ? (
                <X size={18} strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <Menu size={18} strokeWidth={1.75} aria-hidden="true" />
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
            className="fixed inset-0 z-40 bg-background/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex h-full flex-col justify-center px-6 pb-16">
              <ul className="flex flex-col gap-1">
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
                      className="type-display block py-3 text-4xl text-foreground transition-colors duration-300 ease-apple hover:text-accent"
                    >
                      {link.label}
                    </a>
                  </motion.li>
                ))}
              </ul>

              <a
                href="#contact"
                onClick={() => setIsOpen(false)}
                className="mt-12 w-full rounded-full bg-accent-solid py-4 text-center text-sm font-medium text-accent-foreground transition-opacity duration-300 ease-apple hover:opacity-90"
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
