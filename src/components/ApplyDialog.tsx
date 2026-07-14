import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { Button, Field, Label, inputClass } from "@/components/kit";
import { useSiteContent } from "@/hooks/use-site-content";
import { supabase } from "@/lib/supabase";
import { mailtoHref, sendMail, type MailPayload } from "@/lib/mailer";

interface Props {
  /** The role being applied for. Null closes the dialog. */
  role: { id: string; role: string } | null;
  onClose: () => void;
}

const EMPTY = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  experience: "",
  portfolio: "",
  coverNote: "",
};

/**
 * The application form.
 *
 * It does three things on submit, in this order, and the order matters:
 *
 *   1. Writes the application to the database — so it is RECORDED even if the
 *      email fails. A lost application you never knew about is the worst
 *      outcome; a duplicate record is nothing.
 *   2. Sends a formatted email to the company inbox, with the subject line
 *      "Application — <role> — <name>" and Reply-To set to the applicant, so
 *      hitting Reply in Gmail answers them directly.
 *   3. If the mail relay isn't configured, it falls back to a pre-composed
 *      mailto and SAYS SO. It never claims to have sent something it didn't.
 */
const ApplyDialog = ({ role, onClose }: Props) => {
  const { content } = useSiteContent();
  const COMPANY = content.company;

  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const set = <K extends keyof typeof EMPTY>(key: K, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!role) return;
    setForm(EMPTY);
    setDone(false);
    setNotice(null);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [role, onClose]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!role) return;

    setBusy(true);
    setNotice(null);

    /* 1. Record it first. If the email fails, the application still exists. */
    if (supabase) {
      const { error } = await supabase.from("applications").insert({
        job_id: role.id,
        role: role.role,
        full_name: form.fullName,
        email: form.email,
        phone: form.phone,
        location: form.location,
        experience: form.experience,
        portfolio: form.portfolio,
        cover_note: form.coverNote,
      });

      // Not fatal — the email below is still worth attempting.
      if (error) console.error("Could not record application:", error.message);
    }

    /* 2. Email it. */
    const payload: MailPayload = {
      to: COMPANY.email,
      subject: `Application, ${role.role}, ${form.fullName}`,
      fromName: `${form.fullName} (Careers)`,
      replyTo: form.email,
      fields: [
        ["Role", role.role],
        ["Name", form.fullName],
        ["Email", form.email],
        ["Phone", form.phone],
        ["Location", form.location],
        ["Experience", form.experience],
        ["CV / Portfolio / LinkedIn", form.portfolio],
        ["Cover note", form.coverNote],
        ["Submitted", new Date().toLocaleString("en-GB")],
      ],
    };

    const result = await sendMail(payload);

    if (result.ok) {
      setDone(true);
    } else {
      /* 3. Fall back — and be honest that we did. */
      window.location.href = mailtoHref(payload);
      setDone(true);
      setNotice(
        "Your mail app has been opened with the application filled in, press send to complete it.",
      );
    }

    setBusy(false);
  };

  return createPortal(
    <AnimatePresence>
      {role && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Apply for ${role.role}`}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="surface fixed inset-x-4 top-[6vh] z-[61] mx-auto flex max-h-[88vh] max-w-2xl flex-col overflow-hidden p-0"
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border p-6">
              <div>
                <Label>Apply for</Label>
                <h2 className="type-display mt-1.5 text-2xl text-foreground">
                  {role.role}
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="tap -mr-2 -mt-2 shrink-0 rounded-full text-muted-foreground transition-transform hover:text-foreground active:scale-90"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            {done ? (
              <div className="flex flex-col items-center p-12 text-center">
                <CheckCircle2 size={40} aria-hidden="true" className="text-accent" />
                <h3 className="type-display mt-6 text-2xl text-foreground">
                  Application received
                </h3>
                <p className="measure mt-3 text-sm leading-relaxed text-muted-foreground">
                  {notice ??
                    `Thank you. We read every application ourselves, if there is a fit, we will reply to ${form.email} directly.`}
                </p>
                <Button className="mt-8" onClick={onClose}>
                  Close
                </Button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-5 overflow-y-auto p-6"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="a-name" label="Full name">
                    <input
                      id="a-name"
                      required
                      value={form.fullName}
                      onChange={(e) => set("fullName", e.target.value)}
                      autoComplete="name"
                      className={inputClass()}
                    />
                  </Field>

                  <Field id="a-email" label="Email">
                    <input
                      id="a-email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      autoComplete="email"
                      placeholder="you@example.com"
                      className={inputClass()}
                    />
                  </Field>

                  <Field id="a-phone" label="Phone / WhatsApp">
                    <input
                      id="a-phone"
                      required
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      autoComplete="tel"
                      placeholder="+92 300 0000000"
                      className={inputClass()}
                    />
                  </Field>

                  <Field id="a-location" label="Location">
                    <input
                      id="a-location"
                      value={form.location}
                      onChange={(e) => set("location", e.target.value)}
                      placeholder="Islamabad"
                      className={inputClass()}
                    />
                  </Field>
                </div>

                <Field id="a-experience" label="Years of experience">
                  <input
                    id="a-experience"
                    value={form.experience}
                    onChange={(e) => set("experience", e.target.value)}
                    placeholder="e.g. 4 years, Laravel, MySQL, REST APIs"
                    className={inputClass()}
                  />
                </Field>

                <Field
                  id="a-portfolio"
                  label="CV / Portfolio / LinkedIn"
                  hint="Paste a link, Google Drive, GitHub, LinkedIn. We read these."
                >
                  <input
                    id="a-portfolio"
                    type="url"
                    required
                    value={form.portfolio}
                    onChange={(e) => set("portfolio", e.target.value)}
                    placeholder="https://drive.google.com/…"
                    className={inputClass()}
                  />
                </Field>

                <Field
                  id="a-cover"
                  label="Why you"
                  hint="A few honest sentences beat a page of adjectives."
                >
                  <textarea
                    id="a-cover"
                    rows={5}
                    required
                    value={form.coverNote}
                    onChange={(e) => set("coverNote", e.target.value)}
                    placeholder="What have you built that you are proud of, and what do you want to build next?"
                    className={inputClass("resize-none leading-relaxed")}
                  />
                </Field>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Button type="submit" disabled={busy}>
                    {busy && (
                      <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                    )}
                    {busy ? "Sending…" : "Send application"}
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    Goes straight to {COMPANY.email}. No recruiters.
                  </p>
                </div>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default ApplyDialog;
