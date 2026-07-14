import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * THE THEME KIT.
 *
 * Every new page or panel is built from these. That is the point: a new screen
 * inherits the design language for free, and nobody has to remember that an
 * eyebrow is `text-xs uppercase tracking-[0.2em] text-accent`.
 *
 * Rule: if you find yourself re-typing a Tailwind incantation in a second file,
 * it belongs here instead.
 */

/* ── Layout ──────────────────────────────────────────────────────────────── */

export const Section = ({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) => (
  <section id={id} className={cn("px-6 py-16 md:py-24", className)}>
    <div className="mx-auto max-w-7xl">{children}</div>
  </section>
);

export const SectionHeader = ({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) => (
  <header className={cn("max-w-3xl", className)}>
    {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
    <h2 className="type-display mt-4 text-[clamp(1.85rem,7vw,2.5rem)] text-foreground md:text-5xl">
      {title}
    </h2>
    {description && (
      <p className="measure mt-4 text-base leading-relaxed text-muted-foreground">
        {description}
      </p>
    )}
  </header>
);

/* ── Type ────────────────────────────────────────────────────────────────── */

export const Eyebrow = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <p className={cn("text-xs uppercase tracking-[0.2em] text-accent", className)}>
    {children}
  </p>
);

export const Label = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "text-xs uppercase tracking-[0.15em] text-muted-foreground",
      className,
    )}
  >
    {children}
  </span>
);

/* ── Surfaces ────────────────────────────────────────────────────────────── */

export const Card = ({
  as: Tag = "div",
  hover = false,
  className,
  children,
}: {
  as?: ElementType;
  /** Adds the signature gradient hover-fill. Content must invert to white. */
  hover?: boolean;
  className?: string;
  children: ReactNode;
}) => (
  <Tag
    className={cn(
      "surface card-pad relative isolate overflow-hidden",
      hover &&
        "group transition-transform duration-500 ease-apple hover:scale-[1.02]",
      className,
    )}
  >
    {hover && (
      <span
        aria-hidden="true"
        className="gradient-fill absolute inset-0 -z-10 origin-bottom scale-y-0 transition-transform duration-500 ease-apple group-hover:scale-y-100"
      />
    )}
    {children}
  </Tag>
);

/* ── Controls ────────────────────────────────────────────────────────────── */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent-solid text-accent-foreground hover:opacity-90",
  secondary:
    "border border-border text-foreground hover:border-accent hover:text-accent",
  ghost: "text-muted-foreground hover:text-foreground",
  danger: "bg-red-500 text-white hover:opacity-90",
};

export const buttonClass = (variant: ButtonVariant = "primary", className?: string) =>
  cn(
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium",
    // `active:scale-95` is what makes a button feel PRESSED rather than clicked.
    // On touch there is no hover, so without it a tap gives no feedback at all.
    "transition-transform duration-200 ease-apple hover:scale-[1.02] active:scale-95",
    "disabled:pointer-events-none disabled:opacity-40",
    BUTTON_VARIANTS[variant],
    className,
  );

export const Button = ({
  variant = "primary",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) => (
  <button className={buttonClass(variant, className)} {...props}>
    {children}
  </button>
);

type Tone = "neutral" | "success" | "warning" | "danger" | "accent";

const BADGE_TONES: Record<Tone, string> = {
  neutral: "border-border text-muted-foreground",
  success: "border-emerald-500/40 text-emerald-500",
  warning: "border-amber-500/40 text-amber-500",
  danger: "border-red-500/40 text-red-500",
  accent: "border-accent/40 text-accent",
};

export const Badge = ({
  tone = "neutral",
  dot = false,
  children,
  className,
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs capitalize",
      BADGE_TONES[tone],
      className,
    )}
  >
    {dot && (
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
    )}
    {children}
  </span>
);

/* ── Forms ───────────────────────────────────────────────────────────────── */

export const inputClass = (className?: string) =>
  cn(
    "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground",
    "placeholder:text-muted-foreground/60 transition-colors duration-300",
    "focus:border-accent focus:outline-none",
    className,
  );

export const Field = ({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) => (
  <div>
    <label htmlFor={id}>
      <Label>{label}</Label>
    </label>
    <div className="mt-2">{children}</div>
    {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
  </div>
);

/* ── States ──────────────────────────────────────────────────────────────── */

export const EmptyState = ({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="surface flex flex-col items-center p-12 text-center sm:p-16">
    <p className="text-base text-foreground">{title}</p>
    {description && (
      <p className="measure mt-2 text-sm text-muted-foreground">{description}</p>
    )}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

export const Stat = ({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon?: ElementType;
  label: string;
  value: string;
  detail?: string;
}) => (
  <div className="surface p-6">
    <div className="flex items-center justify-between gap-3">
      <Label>{label}</Label>
      {Icon && <Icon size={16} aria-hidden="true" className="shrink-0 text-accent" />}
    </div>
    <p className="type-display mt-4 text-3xl tabular-nums text-foreground">{value}</p>
    {detail && <p className="mt-2 text-xs text-muted-foreground">{detail}</p>}
  </div>
);
