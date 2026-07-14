/**
 * Content length limits.
 *
 * These are NOT arbitrary. The public site's layout depends on them: a
 * capability title must fit one line beside its index numeral, a partner
 * description must fit its card without pushing the grid out of alignment, an
 * announcement must fit the one-line bar under the header.
 *
 * Overlong text doesn't merely look untidy — it breaks the design. So the limit
 * is enforced in three places that must never disagree:
 *
 *   1. here (the form shows a live counter and blocks submit),
 *   2. the database (a CHECK constraint — the real backstop),
 *   3. docs/STYLE_GUIDE.md.
 *
 * If you change one, change all three.
 */

export interface Limit {
  min: number;
  max: number;
  /** Shown under the field so the writer knows what they're aiming at. */
  hint: string;
}

export const LIMITS = {
  announcement: {
    title: {
      min: 4,
      max: 90,
      hint: "One line in the bar under the header. Say the thing; don't tease it.",
    },
    body: {
      min: 0,
      max: 160,
      hint: "Optional. Shown only on hover/expansion.",
    },
  },

  partner: {
    name: { min: 2, max: 40, hint: "The legal name, e.g. “Noregna AS”." },
    country: { min: 0, max: 24, hint: "e.g. “Norway”." },
    relationship: {
      min: 0,
      max: 60,
      hint: "Stated precisely — e.g. “Back-office engineering partner”. Never inflate it.",
    },
    description: {
      min: 0,
      max: 320,
      hint: "Two or three sentences. Longer than this and the cards stop aligning.",
    },
  },

  capability: {
    title: {
      min: 3,
      max: 44,
      hint: "Fits one line beside the index numeral. Longer wraps and breaks the row.",
    },
    description: {
      min: 20,
      max: 260,
      hint: "One or two sentences. This is the line a buyer actually reads.",
    },
    detail: {
      min: 0,
      max: 28,
      hint: "Three short chips, max ~28 characters each, or they wrap.",
    },
  },

  employee: {
    publicBio: {
      min: 0,
      max: 240,
      hint: "One or two sentences on the team page.",
    },
  },
} as const;

/** `null` when valid; an error string when not. */
export const validate = (value: string, limit: Limit, label: string): string | null => {
  const length = value.trim().length;

  if (length < limit.min) {
    return `${label} needs at least ${limit.min} characters.`;
  }
  if (length > limit.max) {
    return `${label} is ${length - limit.max} characters over the ${limit.max} limit.`;
  }
  return null;
};
