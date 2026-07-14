import type { SiteContent } from "./content";
import { TEAM } from "./site";
import type { Job } from "@/admin/repository";

/**
 * Lab Assist's knowledge base.
 *
 * ── Why it is BUILT, not written ──────────────────────────────────────────
 * It used to be a hand-written list of answers. That list went stale the moment
 * the company changed: it was still telling visitors that Umer was "Chief
 * Operating Officer" months after he became DevOps Manager, and it knew nothing
 * about the open roles or the new pages.
 *
 * So the intents are now COMPILED FROM THE LIVE CONTENT — the same managed
 * source the website renders. The bot and the site cannot disagree, because
 * there is only one thing to disagree with.
 *
 * It is still deliberately NOT an LLM. A browser-only site cannot hold an API
 * key, and a grounded assistant is structurally incapable of inventing a price,
 * a timeline, or a client. When it doesn't know, it says so and hands off to a
 * human — on commercial questions, a confident wrong answer is worse than none.
 */

export interface Intent {
  id: string;
  keywords: string[];
  answer: string;
  followUps?: string[];
}

export const buildGreeting = (content: SiteContent) =>
  `Hi, I'm Lab Assist, ${content.company.name}'s assistant.

I can answer questions about what we build, how we work, pricing, timelines, our team, and open roles. Ask me anything, or pick one below.`;

export const QUICK_REPLIES = [
  "What do you build?",
  "How much does it cost?",
  "Are you hiring?",
  "Who are your partners?",
  "Talk to a human",
];

/** Everything the assistant knows, derived from the live site content. */
export const buildIntents = (
  content: SiteContent,
  partners: Array<{ name: string; country: string; relationship: string }>,
  capabilities: Array<{ title: string; description: string }>,
  jobs: Job[],
): Intent[] => {
  const { company, faqs, process, techTiers, engagements, stats } = content;
  const openRoles = jobs.filter((j) => j.isActive);

  const contactBlock = `• Email: ${company.email}\n• WhatsApp: ${company.phone}`;

  return [
    {
      id: "services",
      keywords: [
        "what do you build", "what do you do", "services", "service", "offer",
        "capabilities", "capability", "products", "product", "build", "make",
      ],
      answer: `We build these, end to end:\n\n${capabilities
        .map((c) => `• ${c.title}`)
        .join(
          "\n",
        )}\n\nWe also work as a dedicated back-office engineering team for firms abroad. Want me to explain either?`,
      followUps: ["How do I hire your team?", "How much does it cost?"],
    },

    {
      id: "engagements",
      keywords: [
        "hire", "engage", "engagement", "work with", "outsource", "outsourcing",
        "back office", "backoffice", "extended team", "dedicated team",
        "how do you work", "how we work", "models", "model",
      ],
      answer: `There are two ways to work with us:\n\n${engagements
        .map((e) => `${e.index} ${e.title}, ${e.pitch}\n${e.description}`)
        .join("\n\n")}`,
      followUps: ["How much does it cost?", "How long does it take?", "Talk to a human"],
    },

    {
      id: "pricing",
      keywords: [
        "cost", "price", "pricing", "how much", "budget", "rate", "rates", "fee",
        "quote", "expensive", "charge", "hourly",
      ],
      answer: `${
        faqs[0]?.answer ?? ""
      }\n\nEvery estimate comes out of an architecture pass, not a guess. If the scope isn't clear enough to estimate honestly, we'll say so rather than invent a number.\n\nFor a real figure, describe the system to us directly.`,
      followUps: ["Talk to a human", "How long does it take?"],
    },

    {
      id: "timeline",
      keywords: [
        "how long", "timeline", "timeframe", "duration", "when", "fast", "speed",
        "deadline", "weeks", "months", "delivery time",
      ],
      answer: `${
        faqs[1]?.answer ?? ""
      }\n\nYou won't wait until the end to see it: there's a working environment early and a reviewable increment every two weeks.`,
      followUps: ["What is your process?", "Talk to a human"],
    },

    {
      id: "process",
      keywords: [
        "process", "method", "methodology", "how do you build", "steps", "phases",
        "approach", "workflow", "discovery",
      ],
      answer: `Four phases, each ending in something you can hold and reject:\n\n${process
        .map((p) => `${p.index} ${p.title} (${p.duration})\n→ ${p.deliverable}`)
        .join("\n\n")}`,
      followUps: ["How long does it take?", "How much does it cost?"],
    },

    {
      id: "ownership",
      keywords: [
        "own", "owns", "ownership", "ip", "intellectual property", "code ownership",
        "lock in", "lock-in", "rights", "license", "source code",
      ],
      answer: faqs.find((f) => /own/i.test(f.question))?.answer ?? faqs[5]?.answer ?? "",
      followUps: ["Talk to a human", "How much does it cost?"],
    },

    {
      id: "support",
      keywords: [
        "support", "maintenance", "maintain", "after launch", "post launch", "sla",
        "monitoring", "bugs", "fix",
      ],
      answer:
        faqs.find((f) => /support|launch/i.test(f.question))?.answer ??
        faqs[4]?.answer ??
        "",
      followUps: ["How much does it cost?", "Talk to a human"],
    },

    {
      id: "partners",
      keywords: [
        "partner", "partners", "client", "clients", "norway", "norwegian", "noregna",
        "superlogics", "nordic", "reference", "references", "who do you work with",
      ],
      answer: partners.length
        ? `We are the back-office engineering arm for:\n\n${partners
            .map((p) => `• ${p.name}${p.country ? ` (${p.country})` : ""}, ${p.relationship}`)
            .join(
              "\n",
            )}\n\nWe run dedicated delivery, infrastructure and long-term platform work as an embedded extension of their teams, under their brand, inside their process.`
        : `We work as the back-office engineering arm for software firms abroad. Ask us and we'll put you in touch with a reference directly.`,
      followUps: ["How do I hire your team?", "Talk to a human"],
    },

    {
      id: "team",
      keywords: [
        "team", "who are you", "founder", "founders", "ceo", "coo", "leadership",
        "people", "staff", "employees", "how many", "org", "structure",
      ],
      // Derived from TEAM — the hardcoded copy that used to live here had already
      // gone stale about a real person's job title.
      answer: `The company is run by the people who build the work:\n\n${TEAM.map(
        (m) => `• ${m.name}, ${m.role}`,
      ).join(
        "\n",
      )}\n\nEveryone reports to the CEO. There is no layer between you and the people writing your code, the full org chart is on the team page.`,
      followUps: ["Are you hiring?", "Who are your partners?"],
    },

    {
      id: "careers",
      keywords: [
        "job", "jobs", "hiring", "hire me", "career", "careers", "vacancy",
        "vacancies", "position", "positions", "apply", "application", "recruit",
        "opening", "openings", "work for you", "join",
      ],
      answer: openRoles.length
        ? `Yes, we're hiring:\n\n${openRoles
            .map((j) => `• ${j.role} (${j.type}${j.location ? `, ${j.location}` : ""})`)
            .join(
              "\n",
            )}\n\nApply on the careers page, it goes straight to us, not to a recruiter. There's a short form; a link to your CV or GitHub is all we need to start.`
        : `We have no open roles listed right now, but we hire good engineers when we meet them. Write to ${company.email} and tell us what you've built, speculative applications genuinely get read.`,
      followUps: ["What do you build?", "Talk to a human"],
    },

    {
      id: "tech",
      keywords: [
        "tech", "technology", "technologies", "stack", "react", "node", "language",
        "framework", "database", "cloud", "docker", "typescript", "python", "laravel",
      ],
      answer: `We run these tiers, by the scale of the system:\n\n${techTiers
        .map((t) => `${t.tier}, ${t.items.slice(0, 4).join(", ")}`)
        .join(
          "\n",
        )}\n\nWe don't chase frameworks; that's what we actually run in production.`,
      followUps: ["Do you do AI?", "Do you build mobile apps?"],
    },

    {
      id: "ai",
      keywords: [
        "ai", "artificial intelligence", "machine learning", "ml", "llm", "gpt",
        "chatbot", "automation", "rag", "model",
      ],
      answer: `Yes, applied AI is a real practice here, led by Abdul Wahab.\n\nWe integrate language models and automation into systems that already carry load: retrieval-augmented generation, vector search, and workflow automation. The hard part is never the prompt, it's grounding, evaluation and cost, and that's the part we engineer.`,
      followUps: ["What is your tech stack?", "Talk to a human"],
    },

    {
      id: "mobile",
      keywords: ["mobile", "app", "apps", "ios", "android", "react native", "flutter"],
      answer: `Yes. We deliver cross-platform mobile alongside web, and Abdul Wahab leads delivery across both.\n\nMost of our mobile work sits on top of a platform we also built (ERP, booking, commerce), so the app and its backend are engineered as one system rather than bolted together.`,
      followUps: ["What do you build?", "Talk to a human"],
    },

    {
      id: "location",
      keywords: [
        "where", "location", "based", "office", "country", "timezone", "time zone",
        "islamabad", "pakistan", "remote", "overlap",
      ],
      answer: `${company.location}\n\nFor clients in Europe that matters practically: we hold daily timezone overlap with the Nordics and the EU, which is exactly how our Norwegian engagements run.`,
      followUps: ["Who are your partners?", "Talk to a human"],
    },

    {
      id: "experience",
      keywords: [
        "experience", "track record", "how many projects", "portfolio", "case study",
        "case studies", "stats", "proof", "years",
      ],
      answer: `Our delivery record:\n\n${stats
        .map((s) => `• ${s.value}, ${s.label}`)
        .join(
          "\n",
        )}\n\nWe don't publish case studies for work we can't name, much of it runs under client brands. If you want references, ask and we'll arrange them directly.`,
      followUps: ["Who are your partners?", "Talk to a human"],
    },

    {
      id: "contact",
      keywords: [
        "contact", "talk", "human", "call", "email", "whatsapp", "reach", "speak",
        "meeting", "book", "sales", "person",
      ],
      answer: `Happy to hand you to a human, no sales script, it goes straight to the people who'd architect the work.\n\n${contactBlock}\n\nOr use the form on the contact page and tell us what you're building.`,
    },

    {
      id: "greeting",
      keywords: ["hi", "hello", "hey", "salam", "assalam", "good morning", "good evening"],
      answer: `Hello, good to meet you. Ask me about what we build, how we work, pricing, timelines, the team, or open roles.`,
      followUps: QUICK_REPLIES.slice(0, 3),
    },

    {
      id: "thanks",
      keywords: ["thanks", "thank you", "thankyou", "cheers", "appreciate"],
      answer: `Any time. If you'd like to take it further, the fastest route is WhatsApp (${company.phone}) or the contact page.`,
    },
  ];
};

export const buildFallback = (content: SiteContent) =>
  `I don't want to guess at that one, and on anything commercial I'd rather be right than fast.

The people who'd actually do the work will answer it directly:

• Email: ${content.company.email}
• WhatsApp: ${content.company.phone}

Meanwhile, I can help with what we build, how we work, pricing, timelines, our stack, the team, or open roles.`;

/**
 * Scores every intent by keyword overlap, weighting multi-word phrases higher —
 * "how much" must beat a stray "how".
 */
export const findAnswer = (input: string, intents: Intent[]): Intent | null => {
  const message = ` ${input.toLowerCase().replace(/[^\w\s]/g, " ")} `;

  let best: Intent | null = null;
  let bestScore = 0;

  for (const intent of intents) {
    let score = 0;

    for (const keyword of intent.keywords) {
      if (message.includes(` ${keyword} `) || message.includes(`${keyword} `)) {
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
