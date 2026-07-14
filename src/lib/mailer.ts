import { COMPANY } from "@/data/site";

/**
 * Getting a real email into a real inbox, from a site with no backend.
 *
 * A `mailto:` link is NOT a way to receive applications: it requires the visitor
 * to have a desktop mail client configured, it cannot carry a CV, and if their
 * mail app doesn't open, the application is simply lost and you never know it
 * existed. For a contact form that's annoying; for hiring it's unacceptable.
 *
 * So we POST to a form relay (Web3Forms — free, no account, no server), which
 * delivers a formatted email straight to the company inbox.
 *
 * If no key is configured, we fall back to a well-formatted mailto rather than
 * failing silently — the message still reaches you, just less reliably. The
 * fallback tells the user what happened; it never pretends to have sent.
 */

const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY as string | undefined;
const ENDPOINT = "https://api.web3forms.com/submit";

export const isMailerConfigured = Boolean(WEB3FORMS_KEY);

export interface MailPayload {
  subject: string;
  /** Shown as the sender name in the inbox. */
  fromName: string;
  /** Reply-To — so hitting "Reply" in Gmail answers the applicant directly. */
  replyTo: string;
  /** Ordered field list. Rendered as "Label: value" lines, in this order. */
  fields: Array<[label: string, value: string]>;
}

const asPlainText = (payload: MailPayload): string =>
  payload.fields
    .filter(([, value]) => value.trim() !== "")
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");

/** Composes a mailto with a properly encoded subject and body. */
export const mailtoHref = (payload: MailPayload): string =>
  `mailto:${COMPANY.email}?subject=${encodeURIComponent(
    payload.subject,
  )}&body=${encodeURIComponent(asPlainText(payload))}`;

export type SendResult =
  | { ok: true; via: "email" }
  | { ok: false; via: "mailto"; reason: string };

export const sendMail = async (payload: MailPayload): Promise<SendResult> => {
  if (!WEB3FORMS_KEY) {
    return {
      ok: false,
      via: "mailto",
      reason: "No mail relay is configured (VITE_WEB3FORMS_KEY).",
    };
  }

  const body: Record<string, string> = {
    access_key: WEB3FORMS_KEY,
    subject: payload.subject,
    from_name: payload.fromName,
    replyto: payload.replyTo,
    // A honeypot: bots fill hidden fields, humans never see them.
    botcheck: "",
  };

  for (const [label, value] of payload.fields) {
    if (value.trim() !== "") body[label] = value;
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as { success?: boolean; message?: string };

    if (!response.ok || !data.success) {
      return {
        ok: false,
        via: "mailto",
        reason: data.message ?? `Mail relay returned ${response.status}.`,
      };
    }

    return { ok: true, via: "email" };
  } catch (caught) {
    return {
      ok: false,
      via: "mailto",
      reason: caught instanceof Error ? caught.message : "Network error.",
    };
  }
};
