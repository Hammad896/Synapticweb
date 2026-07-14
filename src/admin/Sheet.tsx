import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Locks the page behind an overlay. Without this the body scrolls underneath a
 *  sheet, which instantly breaks the illusion of a native surface. */
const useScrollLock = (active: boolean) => {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
};

const useEscape = (active: boolean, onClose: () => void) => {
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onClose]);
};

/**
 * A native-style action sheet: slides up from the bottom edge, dims what's
 * behind it, and offers large touch rows. Portalled to <body> so no ancestor's
 * `overflow` or `transform` can clip it — the classic reason sheets mysteriously
 * vanish inside scrolling containers.
 */
export const ActionSheet = ({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) => {
  useScrollLock(open);
  useEscape(open, onClose);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm md:hidden"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.35, ease: EASE }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              // Swipe down to dismiss — the gesture people expect from a sheet.
              if (info.offset.y > 120 || info.velocity.y > 500) onClose();
            }}
            className="safe-bottom fixed inset-x-0 bottom-0 z-[61] rounded-t-3xl border-t border-border bg-card pb-2 md:hidden"
          >
            <div className="flex justify-center pb-1 pt-3">
              <span
                aria-hidden="true"
                className="h-1 w-10 rounded-full bg-muted-foreground/30"
              />
            </div>

            <p className="px-6 pb-3 pt-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">
              {title}
            </p>

            <div className="px-3 pb-3">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};

/** A row inside an ActionSheet. 52px tall — comfortably over the 44px minimum. */
export const SheetAction = ({
  icon: Icon,
  label,
  destructive = false,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  destructive?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex min-h-[52px] w-full items-center gap-4 rounded-2xl px-4 text-left text-sm",
      "transition-transform duration-150 active:scale-[0.98]",
      destructive
        ? "text-red-500 active:bg-red-500/10"
        : "text-foreground active:bg-muted",
    )}
  >
    <Icon size={18} aria-hidden="true" className="shrink-0" />
    {label}
  </button>
);

/**
 * A full-screen slide-up drawer for forms. On mobile a long form must own the
 * whole screen — squeezing a 30-field employee record into a card is how you get
 * a form nobody completes.
 */
export const Drawer = ({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) => {
  useScrollLock(open);
  useEscape(open, onClose);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.4, ease: EASE }}
          className="screen-h fixed inset-0 z-[60] flex flex-col bg-background md:hidden"
        >
          <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="tap rounded-full text-muted-foreground transition-transform active:scale-95"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <div className="safe-bottom flex-1 overflow-y-auto px-4 py-6">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
