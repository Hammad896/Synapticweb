import {
  CAPABILITIES_INTRO,
  COMPANY,
  ENGAGEMENTS,
  ENGAGEMENTS_INTRO,
  FAQS,
  FAQ_INTRO,
  HERO,
  PARTNERS_INTRO,
  PROCESS,
  PROCESS_INTRO,
  STATS,
  TEAM_INTRO,
  TECH_INTRO,
  TECH_TIERS,
} from "./site";

/**
 * EVERY editable string on the public site, in one shape.
 *
 * The old model was half-managed: partners and capabilities lived in the
 * database while the hero, the stats, the company's own phone number and every
 * section intro were compiled into the bundle. Changing "150+" meant a code
 * change and a redeploy — and the admin panel quietly implied otherwise.
 *
 * Now the database holds all of it, seeded from the values below on first run.
 * `site.ts` is no longer the live source; it is the SEED.
 */

export interface SiteContent {
  company: {
    name: string;
    tagline: string;
    email: string;
    phone: string;
    whatsappNumber: string;
    location: string;
  };

  hero: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    trustLabel: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
  };

  stats: Array<{ value: string; label: string }>;

  intros: {
    engagements: SectionIntro;
    capabilities: SectionIntro;
    partners: SectionIntro;
    team: SectionIntro;
    process: SectionIntro;
    technologies: SectionIntro;
    faq: SectionIntro;
  };

  engagements: Array<{
    index: string;
    title: string;
    pitch: string;
    description: string;
    points: string[];
  }>;

  process: Array<{
    index: string;
    title: string;
    duration: string;
    description: string;
    activities: string[];
    deliverable: string;
  }>;

  techTiers: Array<{
    tier: string;
    scope: string;
    suitedTo: string;
    description: string;
    items: string[];
  }>;

  faqs: Array<{ question: string; answer: string }>;

  /** The closing line under the team roster. */
  teamNote: string;

  /**
   * Office closures. Shown in the hero status bar as the NEXT one coming up.
   *
   * A client deciding whether to hire you wants to know when you are shut. That
   * is useful. "It is a public holiday somewhere in the world today" is trivia,
   * and trivia in the hero dilutes the signals that actually sell.
   *
   * Only fixed-date national holidays are seeded below. Eid al-Fitr and Eid
   * al-Adha move with the lunar calendar and are announced locally, so they are
   * NOT guessed here: add them from the admin panel once the dates are known.
   * A confidently wrong closure date is worse than no closure date.
   */
  holidays: Array<{ name: string; date: string }>;
}

export interface SectionIntro {
  eyebrow: string;
  headline: string;
  description: string;
}

/** The seed. Copied into the database the first time the admin panel loads. */
export const DEFAULT_CONTENT: SiteContent = {
  company: {
    name: COMPANY.name,
    tagline: COMPANY.tagline,
    email: COMPANY.email,
    phone: COMPANY.phone,
    whatsappNumber: COMPANY.whatsappNumber,
    location: COMPANY.location,
  },

  hero: {
    eyebrow: HERO.eyebrow,
    headline: HERO.headline,
    subheadline: HERO.subheadline,
    trustLabel: HERO.trustLabel,
    primaryCta: { ...HERO.primaryCta },
    secondaryCta: { ...HERO.secondaryCta },
  },

  stats: STATS.map((s) => ({ value: s.value, label: s.label })),

  intros: {
    engagements: { ...ENGAGEMENTS_INTRO },
    capabilities: { ...CAPABILITIES_INTRO },
    partners: { ...PARTNERS_INTRO },
    team: { ...TEAM_INTRO },
    process: {
      eyebrow: PROCESS_INTRO.eyebrow,
      headline: PROCESS_INTRO.headline,
      description: PROCESS_INTRO.description,
    },
    technologies: { ...TECH_INTRO },
    faq: { ...FAQ_INTRO, description: "" },
  },

  engagements: ENGAGEMENTS.map((e) => ({ ...e, points: [...e.points] })),

  process: PROCESS.map((p) => ({ ...p, activities: [...p.activities] })),

  techTiers: TECH_TIERS.map((t) => ({ ...t, items: [...t.items] })),

  faqs: FAQS.map((f) => ({ ...f })),

  teamNote:
    "No account managers. No handoffs. No bench. The engineer who architects your system is the one who writes it, the one who ships it, and the one who answers when you call. Every one of them puts their name on the work.",

  // Fixed-date Pakistani public holidays only. The Eids are lunar and must be
  // added by hand once announced, see the note on the type above.
  holidays: [
    { name: "Kashmir Day", date: "2026-02-05" },
    { name: "Pakistan Day", date: "2026-03-23" },
    { name: "Labour Day", date: "2026-05-01" },
    { name: "Independence Day", date: "2026-08-14" },
    { name: "Iqbal Day", date: "2026-11-09" },
    { name: "Quaid-e-Azam Day", date: "2026-12-25" },
    { name: "Kashmir Day", date: "2027-02-05" },
    { name: "Pakistan Day", date: "2027-03-23" },
  ],
};

/** Merge a stored payload onto the defaults, so a field added later still loads. */
export const mergeContent = (stored: Partial<SiteContent> | null): SiteContent => {
  if (!stored) return DEFAULT_CONTENT;

  return {
    company: { ...DEFAULT_CONTENT.company, ...stored.company },
    hero: {
      ...DEFAULT_CONTENT.hero,
      ...stored.hero,
      primaryCta: { ...DEFAULT_CONTENT.hero.primaryCta, ...stored.hero?.primaryCta },
      secondaryCta: {
        ...DEFAULT_CONTENT.hero.secondaryCta,
        ...stored.hero?.secondaryCta,
      },
    },
    stats: stored.stats?.length ? stored.stats : DEFAULT_CONTENT.stats,
    intros: { ...DEFAULT_CONTENT.intros, ...stored.intros },
    engagements: stored.engagements ?? DEFAULT_CONTENT.engagements,
    process: stored.process ?? DEFAULT_CONTENT.process,
    techTiers: stored.techTiers ?? DEFAULT_CONTENT.techTiers,
    faqs: stored.faqs ?? DEFAULT_CONTENT.faqs,
    teamNote: stored.teamNote ?? DEFAULT_CONTENT.teamNote,
    holidays: stored.holidays ?? DEFAULT_CONTENT.holidays,
  };
};
