import { useEffect, useState } from "react";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { Button, Field, Label, inputClass } from "@/components/kit";
import { DEFAULT_CONTENT, type SectionIntro, type SiteContent } from "@/data/content";

/**
 * The cPanel for the site's own words.
 *
 * Everything here used to be compiled into the bundle — the headline, the "150+
 * projects" stat, the company's own phone number. Changing one meant a code
 * change and a redeploy, while the admin panel implied otherwise. Now the
 * database holds it and this edits it.
 */

const Group = ({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <section className="surface card-pad">
    <h2 className="type-display text-xl text-foreground">{title}</h2>
    {hint && <p className="measure mt-2 text-xs text-muted-foreground">{hint}</p>}
    <div className="mt-6 flex flex-col gap-5">{children}</div>
  </section>
);

const Text = ({
  id,
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  hint?: string;
}) => (
  <Field id={id} label={label} hint={hint}>
    {multiline ? (
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass("resize-none leading-relaxed")}
      />
    ) : (
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass()}
      />
    )}
  </Field>
);

const IntroEditor = ({
  id,
  title,
  intro,
  onChange,
}: {
  id: string;
  title: string;
  intro: SectionIntro;
  onChange: (intro: SectionIntro) => void;
}) => (
  <div className="border-t border-border pt-5 first:border-t-0 first:pt-0">
    <Label>{title}</Label>
    <div className="mt-3 flex flex-col gap-4">
      <Text
        id={`${id}-eyebrow`}
        label="Eyebrow"
        value={intro.eyebrow}
        onChange={(v) => onChange({ ...intro, eyebrow: v })}
      />
      <Text
        id={`${id}-headline`}
        label="Headline"
        value={intro.headline}
        onChange={(v) => onChange({ ...intro, headline: v })}
      />
      <Text
        id={`${id}-desc`}
        label="Description"
        value={intro.description}
        onChange={(v) => onChange({ ...intro, description: v })}
        multiline
        rows={2}
      />
    </div>
  </div>
);

const ContentTab = ({
  content,
  onSave,
}: {
  content: SiteContent;
  onSave: (content: SiteContent) => Promise<void>;
}) => {
  const [draft, setDraft] = useState<SiteContent>(content);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The panel may mount before the fetch lands.
  useEffect(() => setDraft(content), [content]);

  const set = <K extends keyof SiteContent>(key: K, value: SiteContent[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSave(draft);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="type-display text-2xl text-foreground sm:text-4xl">Content</h1>
          <p className="measure mt-2 text-sm leading-relaxed text-muted-foreground">
            Every word on the public site. Saving publishes immediately — no deploy.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => setDraft(DEFAULT_CONTENT)}
            disabled={busy}
          >
            <RotateCcw size={15} aria-hidden="true" />
            Reset to defaults
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? (
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            ) : saved ? (
              <Check size={15} aria-hidden="true" />
            ) : null}
            {saved ? "Published" : "Save & publish"}
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 text-sm text-red-500">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-6">
        <Group
          title="Company"
          hint="Used in the footer, the contact page, the WhatsApp button and every letter."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Text
              id="c-name"
              label="Company name"
              value={draft.company.name}
              onChange={(v) => set("company", { ...draft.company, name: v })}
            />
            <Text
              id="c-email"
              label="Email"
              value={draft.company.email}
              onChange={(v) => set("company", { ...draft.company, email: v })}
            />
            <Text
              id="c-phone"
              label="Phone (display)"
              value={draft.company.phone}
              onChange={(v) => set("company", { ...draft.company, phone: v })}
            />
            <Text
              id="c-wa"
              label="WhatsApp number"
              hint="Digits only — the form wa.me needs, e.g. 923139676896."
              value={draft.company.whatsappNumber}
              onChange={(v) => set("company", { ...draft.company, whatsappNumber: v })}
            />
          </div>
          <Text
            id="c-location"
            label="Location"
            value={draft.company.location}
            onChange={(v) => set("company", { ...draft.company, location: v })}
          />
          <Text
            id="c-tagline"
            label="Tagline"
            value={draft.company.tagline}
            onChange={(v) => set("company", { ...draft.company, tagline: v })}
            multiline
            rows={2}
          />
        </Group>

        <Group title="Hero" hint="The first thing anyone sees.">
          <Text
            id="h-eyebrow"
            label="Eyebrow"
            value={draft.hero.eyebrow}
            onChange={(v) => set("hero", { ...draft.hero, eyebrow: v })}
          />
          <Text
            id="h-headline"
            label="Headline"
            hint="Keep it short. Long headlines wrap to four lines and push the CTAs off the screen."
            value={draft.hero.headline}
            onChange={(v) => set("hero", { ...draft.hero, headline: v })}
            multiline
            rows={2}
          />
          <Text
            id="h-sub"
            label="Subheadline"
            value={draft.hero.subheadline}
            onChange={(v) => set("hero", { ...draft.hero, subheadline: v })}
            multiline
            rows={3}
          />
          <Text
            id="h-trust"
            label="Trust strip label"
            value={draft.hero.trustLabel}
            onChange={(v) => set("hero", { ...draft.hero, trustLabel: v })}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Text
              id="h-cta1"
              label="Primary button"
              value={draft.hero.primaryCta.label}
              onChange={(v) =>
                set("hero", {
                  ...draft.hero,
                  primaryCta: { ...draft.hero.primaryCta, label: v },
                })
              }
            />
            <Text
              id="h-cta2"
              label="Secondary link"
              value={draft.hero.secondaryCta.label}
              onChange={(v) =>
                set("hero", {
                  ...draft.hero,
                  secondaryCta: { ...draft.hero.secondaryCta, label: v },
                })
              }
            />
          </div>
        </Group>

        <Group
          title="Stats"
          hint="The four figures under the hero. These are the most load-bearing claims on the site — keep them true."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            {draft.stats.map((stat, i) => (
              <div key={i} className="grid grid-cols-[7rem_1fr] gap-3">
                <input
                  aria-label={`Stat ${i + 1} value`}
                  value={stat.value}
                  onChange={(e) => {
                    const stats = [...draft.stats];
                    stats[i] = { ...stat, value: e.target.value };
                    set("stats", stats);
                  }}
                  className={inputClass("tabular-nums")}
                />
                <input
                  aria-label={`Stat ${i + 1} label`}
                  value={stat.label}
                  onChange={(e) => {
                    const stats = [...draft.stats];
                    stats[i] = { ...stat, label: e.target.value };
                    set("stats", stats);
                  }}
                  className={inputClass()}
                />
              </div>
            ))}
          </div>
        </Group>

        <Group
          title="Section headings"
          hint="The eyebrow, headline and description at the top of each section."
        >
          {(
            [
              ["engagements", "How we work"],
              ["capabilities", "Capabilities"],
              ["partners", "Partners"],
              ["team", "Team"],
              ["process", "Process"],
              ["technologies", "Technologies"],
              ["faq", "FAQ"],
            ] as const
          ).map(([key, title]) => (
            <IntroEditor
              key={key}
              id={key}
              title={title}
              intro={draft.intros[key]}
              onChange={(intro) =>
                set("intros", { ...draft.intros, [key]: intro })
              }
            />
          ))}
        </Group>

        <Group
          title="Team note"
          hint="The closing line under the team roster on /team. It is the last thing a client reads there — make it worth reading."
        >
          <Text
            id="team-note"
            label="Closing line"
            value={draft.teamNote}
            onChange={(v) => set("teamNote", v)}
            multiline
            rows={3}
          />
        </Group>

        <Group title="FAQ" hint="The questions and answers on /faq.">
          {draft.faqs.map((faq, i) => (
            <div
              key={i}
              className="border-t border-border pt-5 first:border-t-0 first:pt-0"
            >
              <Text
                id={`faq-q-${i}`}
                label={`Question ${i + 1}`}
                value={faq.question}
                onChange={(v) => {
                  const faqs = [...draft.faqs];
                  faqs[i] = { ...faq, question: v };
                  set("faqs", faqs);
                }}
              />
              <div className="mt-4">
                <Text
                  id={`faq-a-${i}`}
                  label="Answer"
                  value={faq.answer}
                  onChange={(v) => {
                    const faqs = [...draft.faqs];
                    faqs[i] = { ...faq, answer: v };
                    set("faqs", faqs);
                  }}
                  multiline
                  rows={4}
                />
              </div>
            </div>
          ))}
        </Group>
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={save} disabled={busy}>
          {busy ? (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          ) : saved ? (
            <Check size={15} aria-hidden="true" />
          ) : null}
          {saved ? "Published" : "Save & publish"}
        </Button>
      </div>
    </>
  );
};

export default ContentTab;
