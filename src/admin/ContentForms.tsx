import { useState, type FormEvent, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button, Field, Label, inputClass } from "@/components/kit";
import { LIMITS, validate, type Limit } from "@/data/limits";
import {
  EMPTY_CAPABILITY,
  EMPTY_PARTNER,
  type Announcement,
  type SiteCapability,
  type SiteCapabilityDraft,
  type SitePartner,
  type SitePartnerDraft,
} from "./repository";
import { cn } from "@/lib/utils";

/**
 * Content editors with LIVE LENGTH COUNTERS.
 *
 * The counter is not decoration. The public layout depends on these limits — a
 * capability title that wraps breaks the row it sits in; an announcement longer
 * than the bar gets truncated mid-word. So the writer sees the budget while they
 * type, the form refuses to submit over it, and the database rejects it as a
 * last line of defence. Three layers, one number (src/data/limits.ts).
 */

/** A field with a counter that turns amber near the limit and red over it. */
const Counted = ({
  id,
  label,
  limit,
  value,
  onChange,
  multiline = false,
  placeholder,
  rows = 3,
}: {
  id: string;
  label: string;
  limit: Limit;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  rows?: number;
}) => {
  const length = value.trim().length;
  const over = length > limit.max;
  const near = !over && length > limit.max * 0.85;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id}>
          <Label>{label}</Label>
        </label>
        <span
          className={cn(
            "text-[11px] tabular-nums",
            over ? "text-red-500" : near ? "text-amber-500" : "text-muted-foreground",
          )}
        >
          {length}/{limit.max}
        </span>
      </div>

      <div className="mt-2">
        {multiline ? (
          <textarea
            id={id}
            rows={rows}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className={inputClass(
              cn("resize-none leading-relaxed", over && "border-red-500"),
            )}
          />
        ) : (
          <input
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className={inputClass(over ? "border-red-500" : undefined)}
          />
        )}
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">{limit.hint}</p>
    </div>
  );
};

const ActiveToggle = ({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint: string;
}) => (
  <label className="flex cursor-pointer items-start gap-3">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="mt-1 h-4 w-4 shrink-0 accent-[#0067AE]"
    />
    <span>
      <span className="text-sm text-foreground">{label}</span>
      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
        {hint}
      </span>
    </span>
  </label>
);

const Shell = ({
  title,
  error,
  busy,
  submitLabel,
  onSubmit,
  onCancel,
  children,
}: {
  title: string;
  error: string | null;
  busy: boolean;
  submitLabel: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  children: ReactNode;
}) => (
  <form onSubmit={onSubmit} className="surface card-pad flex flex-col gap-6">
    <h3 className="type-display text-xl text-foreground">{title}</h3>
    {children}

    {error && (
      <p role="alert" className="text-sm text-red-500">
        {error}
      </p>
    )}

    <div className="flex flex-col gap-3 sm:flex-row">
      <Button type="submit" disabled={busy}>
        {busy && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
        {submitLabel}
      </Button>
      <Button type="button" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  </form>
);

/* ── Announcement ─────────────────────────────────────────────────────────── */

export const AnnouncementForm = ({
  announcement,
  onSave,
  onCancel,
}: {
  announcement?: Announcement;
  onSave: (draft: Omit<Announcement, "id" | "createdAt">) => Promise<void>;
  onCancel: () => void;
}) => {
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [body, setBody] = useState(announcement?.body ?? "");
  const [link, setLink] = useState(announcement?.link ?? "");
  const [kind, setKind] = useState<Announcement["kind"]>(announcement?.kind ?? "news");
  const [isActive, setIsActive] = useState(announcement?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const problem =
      validate(title, LIMITS.announcement.title, "Title") ??
      validate(body, LIMITS.announcement.body, "Body");
    if (problem) {
      setError(problem);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onSave({ title, body, link, kind, isActive });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell
      title={announcement ? "Edit announcement" : "New announcement"}
      error={error}
      busy={busy}
      submitLabel={announcement ? "Save changes" : "Create announcement"}
      onSubmit={submit}
      onCancel={onCancel}
    >
      <Counted
        id="ann-title"
        label="Title"
        limit={LIMITS.announcement.title}
        value={title}
        onChange={setTitle}
        placeholder="Abdul Wahab has joined Synaptic Lab"
      />

      <Counted
        id="ann-body"
        label="Body (optional)"
        limit={LIMITS.announcement.body}
        value={body}
        onChange={setBody}
        multiline
        rows={2}
        placeholder="Joins us as AI & Multi-Platform Engineering Lead."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="ann-kind" label="Kind">
          <select
            id="ann-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as Announcement["kind"])}
            className={inputClass("capitalize")}
          >
            <option value="news">News</option>
            <option value="joiner">New joiner</option>
            <option value="milestone">Milestone</option>
          </select>
        </Field>

        <Field id="ann-link" label="Link (optional)" hint="Where clicking the bar goes.">
          <input
            id="ann-link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="/team"
            className={inputClass()}
          />
        </Field>
      </div>

      {/* The live preview — exactly the bar the visitor will see. */}
      <div>
        <Label>Preview — the bar under the site header</Label>
        <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-card/80">
          <div className="flex items-center gap-4 px-5 py-2.5">
            <span
              aria-hidden="true"
              className="gradient-synapse h-1.5 w-1.5 shrink-0 rounded-full"
            />
            <p className="flex-1 truncate text-sm text-foreground">
              {kind === "joiner" && <span className="mr-2 text-accent">New</span>}
              {title || (
                <span className="text-muted-foreground">Your announcement title…</span>
              )}
            </p>
            <span className="text-xs text-muted-foreground">✕</span>
          </div>
        </div>
      </div>

      <ActiveToggle
        checked={isActive}
        onChange={setIsActive}
        label="Live — show on the website now"
        hint="Turn this off to keep it as a draft. Visitors who dismiss it never see it again, but a NEW announcement always shows."
      />
    </Shell>
  );
};

/* ── Partner ──────────────────────────────────────────────────────────────── */

export const PartnerForm = ({
  partner,
  onSave,
  onCancel,
}: {
  partner?: SitePartner;
  onSave: (draft: SitePartnerDraft, id?: string) => Promise<void>;
  onCancel: () => void;
}) => {
  const [draft, setDraft] = useState<SitePartnerDraft>(partner ?? EMPTY_PARTNER);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof SitePartnerDraft>(key: K, value: SitePartnerDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const problem =
      validate(draft.name, LIMITS.partner.name, "Name") ??
      validate(draft.relationship, LIMITS.partner.relationship, "Relationship") ??
      validate(draft.description, LIMITS.partner.description, "Description");
    if (problem) {
      setError(problem);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onSave(draft, partner?.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell
      title={partner ? `Edit — ${partner.name}` : "Add partner"}
      error={error}
      busy={busy}
      submitLabel={partner ? "Save changes" : "Add partner"}
      onSubmit={submit}
      onCancel={onCancel}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Counted
          id="p-name"
          label="Name"
          limit={LIMITS.partner.name}
          value={draft.name}
          onChange={(v) => set("name", v)}
          placeholder="Noregna AS"
        />
        <Counted
          id="p-country"
          label="Country"
          limit={LIMITS.partner.country}
          value={draft.country}
          onChange={(v) => set("country", v)}
          placeholder="Norway"
        />
      </div>

      <Counted
        id="p-rel"
        label="Relationship"
        limit={LIMITS.partner.relationship}
        value={draft.relationship}
        onChange={(v) => set("relationship", v)}
        placeholder="Back-office engineering partner"
      />

      <Counted
        id="p-desc"
        label="Description"
        limit={LIMITS.partner.description}
        value={draft.description}
        onChange={(v) => set("description", v)}
        multiline
        rows={4}
        placeholder="We run dedicated engineering capacity for…"
      />

      <ActiveToggle
        checked={draft.isActive}
        onChange={(v) => set("isActive", v)}
        label="Show on the website"
        hint="Removing a partner from the site does not delete the record — untick this."
      />
    </Shell>
  );
};

/* ── Capability ───────────────────────────────────────────────────────────── */

export const CapabilityForm = ({
  capability,
  onSave,
  onCancel,
}: {
  capability?: SiteCapability;
  onSave: (draft: SiteCapabilityDraft, id?: string) => Promise<void>;
  onCancel: () => void;
}) => {
  const [draft, setDraft] = useState<SiteCapabilityDraft>(
    capability
      ? { ...capability, detail: [...capability.detail, "", "", ""].slice(0, 3) }
      : EMPTY_CAPABILITY,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof SiteCapabilityDraft>(
    key: K,
    value: SiteCapabilityDraft[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const setDetail = (index: number, value: string) =>
    setDraft((current) => {
      const detail = [...current.detail];
      detail[index] = value;
      return { ...current, detail };
    });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const problem =
      validate(draft.title, LIMITS.capability.title, "Title") ??
      validate(draft.description, LIMITS.capability.description, "Description");
    if (problem) {
      setError(problem);
      return;
    }

    const longChip = draft.detail.find(
      (d) => d.trim().length > LIMITS.capability.detail.max,
    );
    if (longChip) {
      setError(
        `“${longChip}” is over the ${LIMITS.capability.detail.max}-character chip limit and will wrap.`,
      );
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onSave(
        { ...draft, detail: draft.detail.filter((d) => d.trim() !== "") },
        capability?.id,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell
      title={capability ? `Edit — ${capability.title}` : "Add capability"}
      error={error}
      busy={busy}
      submitLabel={capability ? "Save changes" : "Add capability"}
      onSubmit={submit}
      onCancel={onCancel}
    >
      <Counted
        id="c-title"
        label="Title"
        limit={LIMITS.capability.title}
        value={draft.title}
        onChange={(v) => set("title", v)}
        placeholder="Enterprise ERP Systems"
      />

      <Counted
        id="c-desc"
        label="Description"
        limit={LIMITS.capability.description}
        value={draft.description}
        onChange={(v) => set("description", v)}
        multiline
        rows={4}
        placeholder="Large-scale resource planning platforms unifying finance, inventory…"
      />

      <div>
        <Label>Detail chips (up to 3)</Label>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {LIMITS.capability.detail.hint}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => {
            const value = draft.detail[i] ?? "";
            const over = value.trim().length > LIMITS.capability.detail.max;

            return (
              <div key={i}>
                <input
                  aria-label={`Detail chip ${i + 1}`}
                  value={value}
                  onChange={(e) => setDetail(i, e.target.value)}
                  placeholder={["Multi-entity ledgers", "Role-based access", "Audit trails"][i]}
                  className={inputClass(over ? "border-red-500" : undefined)}
                />
                <span
                  className={cn(
                    "mt-1 block text-right text-[11px] tabular-nums",
                    over ? "text-red-500" : "text-muted-foreground",
                  )}
                >
                  {value.trim().length}/{LIMITS.capability.detail.max}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <Field id="c-order" label="Order" hint="Lower numbers appear first.">
        <input
          id="c-order"
          type="number"
          value={draft.sortOrder}
          onChange={(e) => set("sortOrder", Number(e.target.value))}
          className={inputClass("tabular-nums")}
        />
      </Field>

      <ActiveToggle
        checked={draft.isActive}
        onChange={(v) => set("isActive", v)}
        label="Show on the website"
        hint="Untick to retire a capability without deleting it."
      />
    </Shell>
  );
};
