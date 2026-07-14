import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useSiteContent } from "@/hooks/use-site-content";

const DISMISSED_KEY = "synapticlab.announcement.dismissed";
const ROTATE_MS = 6500;

const readDismissed = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
};

/**
 * The strip beneath the header.
 *
 * Handles ONE announcement and MANY. With several live it rotates through them
 * on a slow cross-fade: stacking bars would push the whole page down, and a
 * carousel with arrows is more chrome than the content deserves.
 *
 * Dismissal is remembered PER ANNOUNCEMENT id — so dismissing one does not hide
 * the others, and a NEW one always shows even if older ones were dismissed. A
 * banner that reappears on every visit is the fastest way to teach people to
 * ignore the banner.
 */
const AnnouncementBar = () => {
  const { announcements, loaded } = useSiteContent();
  const prefersReducedMotion = useReducedMotion();

  const [dismissed, setDismissed] = useState<string[]>(readDismissed);
  const [index, setIndex] = useState(0);

  const visible = useMemo(
    () => announcements.filter((a) => !dismissed.includes(a.id)),
    [announcements, dismissed],
  );

  // Rotate only when there is more than one to rotate through.
  useEffect(() => {
    if (visible.length < 2 || prefersReducedMotion) return;

    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % visible.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(timer);
  }, [visible.length, prefersReducedMotion]);

  // Dismissing the last item would otherwise leave the index pointing past the end.
  useEffect(() => {
    if (index >= visible.length) setIndex(0);
  }, [index, visible.length]);

  if (!loaded || visible.length === 0) return null;

  const current = visible[index] ?? visible[0];

  const dismiss = () => {
    const next = [...dismissed, current.id];
    setDismissed(next);

    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next.slice(-30)));
    } catch {
      /* Storage unavailable — it will simply show again next visit. */
    }
  };

  const label = (
    <>
      {current.kind === "joiner" && <span className="mr-2 text-accent">New</span>}
      {current.kind === "milestone" && (
        <span className="mr-2 text-accent">Milestone</span>
      )}
      {current.title}
    </>
  );

  const linkClass =
    "block truncate text-xs text-foreground transition-colors hover:text-accent sm:text-sm";

  return (
    <div className="fixed inset-x-0 top-16 z-40 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-2.5">
        <span
          aria-hidden="true"
          className="gradient-synapse hidden h-1.5 w-1.5 shrink-0 rounded-full sm:block"
        />

        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="min-w-0"
            >
              {current.link ? (
                current.link.startsWith("/") ? (
                  <Link to={current.link} className={linkClass}>
                    {label}
                  </Link>
                ) : (
                  <a
                    href={current.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClass}
                  >
                    {label}
                  </a>
                )
              ) : (
                <p className="truncate text-xs text-foreground sm:text-sm">{label}</p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots, not arrows, and only when there is more than one. */}
        {visible.length > 1 && (
          <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
            {visible.map((a, i) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show announcement ${i + 1} of ${visible.length}`}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === index ? "bg-accent" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="tap -mr-2 shrink-0 rounded-full text-muted-foreground transition-colors hover:text-foreground"
        >
          <X size={14} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default AnnouncementBar;
