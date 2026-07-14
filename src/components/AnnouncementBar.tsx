import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { getRepository } from "@/admin/repository";

interface Live {
  id: string;
  kind: string;
  title: string;
  link: string;
}

const DISMISSED_KEY = "synapticlab.announcement.dismissed";

/**
 * The strip beneath the header. Publishing an announcement from the admin panel
 * makes it appear here — no deploy, no code change.
 *
 * It is deliberately quiet: one line, dismissible, and it *remembers* being
 * dismissed (per announcement id, so a NEW one still shows). A banner that
 * reappears on every page load is the fastest way to teach people to ignore it.
 */
const AnnouncementBar = () => {
  const [announcement, setAnnouncement] = useState<Live | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const load = async () => {
      const all = await getRepository().listAnnouncements();
      const newest = all.find((a) => a.isActive);
      if (!newest) return;

      let seen: string[] = [];
      try {
        seen = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]");
      } catch {
        seen = [];
      }

      // Dismissal is remembered PER ANNOUNCEMENT, so a new one still shows. A
      // banner that reappears on every load teaches people to ignore it.
      if (seen.includes(newest.id)) return;

      setAnnouncement({
        id: newest.id,
        kind: newest.kind,
        title: newest.title,
        link: newest.link,
      });
    };

    void load().catch(() => {
      /* no announcements available */
    });
  }, []);

  const dismiss = () => {
    if (!announcement) return;
    setDismissed(true);

    try {
      const seen: string[] = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]");
      localStorage.setItem(
        DISMISSED_KEY,
        JSON.stringify([...seen, announcement.id].slice(-20)),
      );
    } catch {
      /* Storage unavailable — it will simply show again next visit. */
    }
  };

  return (
    <AnimatePresence>
      {announcement && !dismissed && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-0 top-16 z-40 overflow-hidden border-b border-border bg-card/80 backdrop-blur-md"
        >
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-2.5">
            <span
              aria-hidden="true"
              className="gradient-synapse hidden h-1.5 w-1.5 shrink-0 rounded-full sm:block"
            />

            <a
              href={announcement.link || "#"}
              className="flex-1 truncate text-xs text-foreground transition-colors hover:text-accent sm:text-sm"
            >
              {announcement.kind === "joiner" && (
                <span className="mr-2 text-accent">New</span>
              )}
              {announcement.title}
            </a>

            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss announcement"
              className="tap -mr-2 shrink-0 rounded-full text-muted-foreground transition-colors hover:text-foreground"
            >
              <X size={14} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnnouncementBar;
