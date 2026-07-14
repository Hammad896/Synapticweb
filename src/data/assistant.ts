import {
  CAPABILITIES,
  COMPANY,
  ENGAGEMENTS,
  FAQS,
  PARTNERS,
  PROCESS,
  STATS,
  TEAM,
  TECH_TIERS,
} from "./site";

/**
 * Lab Assist's knowledge base.
 *
 * Deliberately NOT an LLM. A browser-only site cannot call a model API without
 * shipping the key in the bundle for anyone to lift, and a serverless proxy is a
 * decision the client has to make (cost, hosting, abuse). More importantly: a
 * grounded assistant CANNOT invent a price, a timeline, or a client. Everything
 * below is derived from `site.ts`, so the bot and the page can never disagree.
 *
 * When it doesn't know, it says so and hands off to a human. That is the whole
 * design — a confident wrong answer about commercial terms is worse than none.
 */

export interface Intent {
  id: string;
  /** Matched against the user's message, lowercased. */
  keywords: string[];
  answer: string;
  /** Follow-up chips offered after this answer. */
  followUps?: string[];
}

const list = (items: readonly string[]) => items.map((i) => `• ${i}`).join("\n");

export const GREETING = `Hi — I'm Lab Assist, ${COMPANY.name}'s assistant.

I can answer questions about what we build, how we work, pricing, timelines, and our team. Ask me anything, or pick one below.`;

export const QUICK_REPLIES = [
  "What do you build?",
  "How much does it cost?",
  "How do I hire your team?",
  "Who are your partners?",
  "Talk to a human",
];

export const INTENTS: Intent[] = [
  {
    id: "services",
    keywords: [
      "what do you build", "what do you do", "services", "service", "offer",
      "capabilities", "capability", "products", "product", "build", "make",
    ],
    answer: `We build five core product lines, end to end:\n\n${list(
      CAPABILITIES.map((c) => `${c.title} — ${c.detail[0].toLowerCase()}`),
    )}\n\nWe also work as a dedicated back-office engineering team for firms abroad. Want me to explain either?`,
    followUps: ["How do I hire your team?", "How much does it cost?"],
  },
  {
    id: "engagements",
    keywords: [
      "hire", "engage", "engagement", "work with", "outsource", "outsourcing",
      "back office", "backoffice", "extended team", "dedicated team", "how do you work",
      "how we work", "models", "model",
    ],
    answer: `There are two ways to work with us:\n\n${ENGAGEMENTS.map(
      (e) => `${e.index} ${e.title} — ${e.pitch}\n${e.description}`,
    ).join("\n\n")}`,
    followUps: ["How much does it cost?", "How long does it take?", "Talk to a human"],
  },
  {
    id: "pricing",
    keywords: [
      "cost", "price", "pricing", "how much", "budget", "rate", "rates", "fee",
      "quote", "expensive", "charge", "hourly",
    ],
    answer: `${FAQS[0].answer}\n\nEvery estimate comes out of an architecture pass, not a guess — we map the data model and integration surface first, then price against it. If the scope isn't clear enough to estimate honestly, we'll tell you that instead of inventing a number.\n\nFor a real figure, the fastest route is to describe the system to us directly.`,
    followUps: ["Talk to a human", "How long does it take?"],
  },
  {
    id: "timeline",
    keywords: [
      "how long", "timeline", "timeframe", "duration", "when", "fast", "speed",
      "deadline", "weeks", "months", "delivery time",
    ],
    answer: `${FAQS[1].answer}\n\nYou won't wait until the end to see it: there's a working staging environment from week one and a reviewable increment every two weeks.`,
    followUps: ["What is your process?", "Talk to a human"],
  },
  {
    id: "process",
    keywords: [
      "process", "method", "methodology", "how do you build", "steps", "phases",
      "approach", "workflow", "discovery",
    ],
    answer: `Four phases, each ending in something you can hold and reject:\n\n${PROCESS.map(
      (p) => `${p.index} ${p.title} (${p.duration})\n→ ${p.deliverable}`,
    ).join("\n\n")}`,
    followUps: ["How long does it take?", "How much does it cost?"],
  },
  {
    id: "ownership",
    keywords: [
      "own", "owns", "ownership", "ip", "intellectual property", "code ownership",
      "lock in", "lock-in", "rights", "license", "source code",
    ],
    answer: FAQS[5].answer,
    followUps: ["Talk to a human", "How much does it cost?"],
  },
  {
    id: "support",
    keywords: [
      "support", "maintenance", "maintain", "after launch", "post launch", "sla",
      "monitoring", "bugs", "fix",
    ],
    answer: FAQS[4].answer,
    followUps: ["How much does it cost?", "Talk to a human"],
  },
  {
    id: "partners",
    keywords: [
      "partner", "partners", "client", "clients", "norway", "norwegian", "noregna",
      "superlogics", "nordic", "reference", "references", "who do you work with",
    ],
    answer: `We are the back-office engineering arm for two Norwegian software firms:\n\n${PARTNERS.map(
      (p) => `• ${p.name} (${p.country}) — ${p.relationship}`,
    ).join(
      "\n",
    )}\n\nWe run dedicated delivery, infrastructure, and long-term platform work as an embedded extension of their teams — under their brand, inside their process.`,
    followUps: ["How do I hire your team?", "Talk to a human"],
  },
  {
    id: "team",
    keywords: [
      "team", "who are you", "founder", "founders", "ceo", "coo", "leadership",
      "people", "staff", "employees", "how many",
    ],
    // Derived from TEAM, never restated. A hardcoded copy here had already gone
    // stale: it still called Umer "Chief Operating Officer" months after he
    // became DevOps Manager. The bot and the team page must never disagree.
    answer: `The company is run by the people who build the work:\n\n${TEAM.map(
      (m) => `• ${m.name} — ${m.role}.`,
    ).join(
      "\n",
    )}\n\nEveryone reports to the CEO. There is no layer between you and the people writing your code.`,
    followUps: ["Who are your partners?", "Talk to a human"],
  },
  {
    id: "tech",
    keywords: [
      "tech", "technology", "technologies", "stack", "react", "node", "language",
      "framework", "database", "cloud", "docker", "typescript", "python",
    ],
    answer: `We run four tiers, by the scale of the system:\n\n${TECH_TIERS.map(
      (t) => `${t.tier} — ${t.items.slice(0, 4).join(", ")}`,
    ).join("\n")}\n\nWe don't chase frameworks; that's what we actually run in production.`,
    followUps: ["Do you do AI?", "Do you build mobile apps?"],
  },
  {
    id: "ai",
    keywords: [
      "ai", "artificial intelligence", "machine learning", "ml", "llm", "gpt",
      "chatbot", "automation", "rag", "model",
    ],
    answer: `Yes — applied AI is a real practice here, led by Abdul Wahab.\n\nWe integrate language models and automation into systems that already carry load: retrieval-augmented generation, vector search, and workflow automation. The hard part is never the prompt — it's grounding, evaluation, and cost, and that's the part we engineer.`,
    followUps: ["What is your tech stack?", "Talk to a human"],
  },
  {
    id: "mobile",
    keywords: ["mobile", "app", "apps", "ios", "android", "react native", "flutter"],
    answer: `Yes. We deliver cross-platform mobile alongside web — React Native in the Foundation tier — and Abdul Wahab leads delivery across both.\n\nMost of our mobile work sits on top of a platform we also built (ERP, booking, commerce), so the app and its backend are engineered as one system rather than bolted together.`,
    followUps: ["What do you build?", "Talk to a human"],
  },
  {
    id: "location",
    keywords: [
      "where", "location", "based", "office", "country", "timezone", "time zone",
      "islamabad", "pakistan", "remote", "overlap",
    ],
    answer: `Our head office is in Islamabad, Pakistan, and we operate globally.\n\nFor clients in Europe that matters practically: we hold daily timezone overlap with the Nordics and the EU, which is exactly how the Noregna and Superlogics engagements run.`,
    followUps: ["Who are your partners?", "Talk to a human"],
  },
  {
    id: "experience",
    keywords: [
      "experience", "track record", "how many projects", "portfolio", "case study",
      "case studies", "stats", "proof", "years",
    ],
    answer: `Our delivery record:\n\n${STATS.map((s) => `• ${s.value} — ${s.label}`).join(
      "\n",
    )}\n\nWe don't publish case studies for work we can't name — much of it is under client brands. If you want references, ask and we'll arrange them directly.`,
    followUps: ["Who are your partners?", "Talk to a human"],
  },
  {
    id: "contact",
    keywords: [
      "contact", "talk", "human", "call", "email", "whatsapp", "reach", "speak",
      "meeting", "book", "sales", "person",
    ],
    answer: `Happy to hand you to a human — no sales script, it goes straight to the people who'd architect the work.\n\n• Email: ${COMPANY.email}\n• WhatsApp: ${COMPANY.phone}\n\nOr fill in the form at the bottom of this page and tell us what you're building.`,
  },
  {
    id: "greeting",
    keywords: ["hi", "hello", "hey", "salam", "assalam", "good morning", "good evening"],
    answer: `Hello — good to meet you. Ask me about what we build, how we work, pricing, timelines, or the team.`,
    followUps: QUICK_REPLIES.slice(0, 3),
  },
  {
    id: "thanks",
    keywords: ["thanks", "thank you", "thankyou", "cheers", "appreciate"],
    answer: `Any time. If you'd like to take it further, the fastest route is WhatsApp (${COMPANY.phone}) or the form at the bottom of this page.`,
  },
];

/** Said when nothing scores above the threshold. It never guesses. */
export const FALLBACK = `I don't want to guess at that one — and on anything commercial I'd rather be right than fast.

The people who'd actually do the work will answer it directly:

• Email: ${COMPANY.email}
• WhatsApp: ${COMPANY.phone}

Meanwhile, I can help with what we build, how we work, pricing, timelines, our stack, or the team.`;

/**
 * Scores every intent by how many of its keywords appear in the message,
 * weighting longer phrases higher — "how much" should beat a stray "how".
 */
export const findAnswer = (input: string): Intent | null => {
  const message = ` ${input.toLowerCase().replace(/[^\w\s]/g, " ")} `;

  let best: Intent | null = null;
  let bestScore = 0;

  for (const intent of INTENTS) {
    let score = 0;

    for (const keyword of intent.keywords) {
      if (message.includes(` ${keyword} `) || message.includes(`${keyword} `)) {
        // A multi-word phrase is far stronger evidence than a single token.
        score += keyword.includes(" ") ? keyword.split(" ").length * 2 : 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = intent;
    }
  }

  return bestScore > 0 ? best : null;
};
