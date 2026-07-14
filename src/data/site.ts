/**
 * Every user-facing string on the site lives here, so copy is editable without
 * touching layout. Sections read from this file; they never inline text.
 */

export const COMPANY = {
  name: "Synaptic Lab",
  tagline:
    "Enterprise software engineering for systems that cannot fail. Back-office engineering arm for Noregna AS and Superlogics AS, Norway.",
  email: "qhammad286@gmail.com",
  /** Display form. `whatsappNumber` is the dialable form wa.me requires. */
  phone: "+92 313 9676896",
  whatsappNumber: "923139676896",
  location: "Islamabad, Pakistan — Head Office. Operating globally.",
} as const;

/**
 * `href` starting with "#" is an in-page anchor (home only, drives the scroll-spy).
 * `href` starting with "/" is a real route and renders as a router <Link>.
 */
export const NAV_LINKS = [
  { label: "How we work", href: "/how-we-work" },
  { label: "Capabilities", href: "/capabilities" },
  { label: "Partners", href: "/partners" },
  { label: "Team", href: "/team" },
  { label: "Careers", href: "/careers" },
  { label: "FAQ", href: "/faq" },
] as const;

export const HERO = {
  eyebrow: "Your engineering department, abroad",
  headline: "The engineering floor behind software firms abroad.",
  subheadline:
    "Synaptic Lab runs dedicated back-office engineering for companies in Norway and beyond — and builds independent platforms end to end. Web, mobile, ERP, commerce, AI. You name the system; we staff it, architect it, and ship it.",
  primaryCta: { label: "Start an engagement", href: "/contact" },
  secondaryCta: { label: "See how we work", href: "/how-we-work" },
  /** The strongest credibility signal the firm has — it sits directly under the fold. */
  trustLabel: "Back-office engineering arm for",
} as const;

export interface Engagement {
  index: string;
  title: string;
  pitch: string;
  description: string;
  points: string[];
}

export const ENGAGEMENTS_INTRO = {
  eyebrow: "How We Work",
  headline: "Two ways to put us to work.",
  description:
    "Whether you need an engineering floor that answers to your head office, or a finished product that did not exist yesterday — the engagement is built around which of those you are buying.",
} as const;

export const ENGAGEMENTS: Engagement[] = [
  {
    index: "01",
    title: "Extended Engineering Team",
    pitch: "For head offices abroad.",
    description:
      "We become your back office. A dedicated squad works under your brand, inside your process, and on your release calendar — the capability of an in-house department without the cost and lead time of building one. This is exactly what we do today for Noregna AS and Superlogics AS in Norway.",
    points: [
      "Dedicated, named engineers — not a rotating pool",
      "Your process, your standards, your repositories",
      "European timezone overlap, daily",
      "Scale the team up or down without a hiring cycle",
    ],
  },
  {
    index: "02",
    title: "Independent Product Builds",
    pitch: "For companies who need the thing built.",
    description:
      "You describe the system; we own it end to end — data model, architecture, engineering, launch, and the support that keeps it standing. Web platforms, mobile apps, ERP, e-commerce, AI-driven tooling. One accountable team from first call to production traffic.",
    points: [
      "Fixed scope, fixed price — or a retainer if it keeps evolving",
      "Web, mobile, and full-stack platform engineering",
      "Architected to be maintained, not demoed",
      "You own the code, the infrastructure, and the documentation",
    ],
  },
];

/** Confirmed: aggregate delivery record of the team behind these engagements. */
export const STATS = [
  { value: "150+", label: "Projects Delivered" },
  { value: "99%", label: "Client Satisfaction" },
  { value: "$2M+", label: "Revenue Generated" },
  { value: "5+", label: "Years Experience" },
] as const;

export interface Partner {
  name: string;
  country: string;
  /** The exact nature of the relationship. Stated plainly — never inflated. */
  relationship: string;
  description: string;
}

export const PARTNERS_INTRO = {
  eyebrow: "Nordic Operations",
  headline: "We are the engineering floor behind Norwegian software firms.",
  description:
    "Synaptic Lab operates as the dedicated back-office engineering arm for established Norwegian companies — running delivery, infrastructure, and long-term platform work under their brand, to Nordic standards, on Nordic timelines.",
} as const;

export const PARTNERS: Partner[] = [
  {
    name: "Noregna AS",
    country: "Norway",
    relationship: "Back-office engineering partner",
    description:
      "We run dedicated engineering capacity for Noregna — architecting, building, and maintaining production systems as an embedded extension of their team.",
  },
  {
    name: "Superlogics AS",
    country: "Norway",
    relationship: "Back-office engineering partner",
    description:
      "We provide Superlogics with sustained delivery and infrastructure capability, operating inside their process and to their release standards.",
  },
];

export interface Capability {
  id: string;
  index: string;
  title: string;
  description: string;
  detail: string[];
}

export const CAPABILITIES_INTRO = {
  eyebrow: "Core Capabilities",
  headline: "Product lines we build end to end.",
  description:
    "Not a service menu. These are systems we have architected, shipped, and kept running in production.",
} as const;

export const CAPABILITIES: Capability[] = [
  {
    id: "erp",
    index: "01",
    title: "Enterprise ERP Systems",
    description:
      "Large-scale resource planning platforms unifying finance, inventory, procurement, and human capital into one operational spine.",
    detail: ["Multi-entity ledgers", "Role-based access", "Audit trails"],
  },
  {
    id: "automotive",
    index: "02",
    title: "Automotive Workshop Management",
    description:
      "Advanced platforms covering the full service lifecycle — intake, job cards, parts, technician scheduling, and invoicing.",
    detail: ["Job-card lifecycle", "Parts inventory", "Technician dispatch"],
  },
  {
    id: "appointments",
    index: "03",
    title: "Automated Appointment Systems",
    description:
      "Booking infrastructure that handles capacity, reminders, and reconciliation without a human in the loop.",
    detail: ["Capacity engines", "Automated reminders", "Calendar sync"],
  },
  {
    id: "commerce",
    index: "04",
    title: "High-Throughput E-Commerce",
    description:
      "Commerce ecosystems engineered for peak load — catalog, checkout, payments, and fulfilment that hold under a traffic spike.",
    detail: ["Peak-load checkout", "Payment orchestration", "Fulfilment pipelines"],
  },
  {
    id: "bespoke",
    index: "05",
    title: "Bespoke Full-Stack Engineering",
    description:
      "When the system does not exist yet: custom web and software engineering, architected from the data model up.",
    detail: ["Greenfield architecture", "Legacy modernization", "Systems integration"],
  },
];

/**
 * The public org chart.
 *
 * NAMES AND JOB TITLES ONLY. Salaries, CNICs, personal phone numbers and
 * emergency contacts must NEVER appear in this file — it is compiled into the
 * public bundle and the repository is public. That data belongs in the database,
 * entered through the admin panel, where row-level security protects it.
 */
export interface TeamMemberProfile {
  name: string;
  role: string;
  initials: string;
  /** Rank in the hierarchy. 0 = CEO. Drives the org-chart layout. */
  level: 0 | 1 | 2;
  summary: string;
  domains: string[];
}

export const TEAM_INTRO = {
  eyebrow: "The Team",
  headline: "A small team that ships large systems.",
  description:
    "Everyone here is an operator, not a manager of operators. The people who architect your system are the people who build it.",
} as const;

export const TEAM: TeamMemberProfile[] = [
  {
    name: "Hammad Sohail",
    role: "Chief Executive Officer & Director",
    initials: "HS",
    level: 0,
    summary:
      "Founder and CEO. Runs the firm end to end — project delivery, client architecture, people, and growth. Specialist in large-scale project management, enterprise IT solutions, and technical architecture for the global finance sector. Every engagement ultimately answers to him.",
    domains: [
      "Large-scale project management",
      "Enterprise IT industry solutions",
      "Technical architecture — global finance",
      "Client & partner relationships",
    ],
  },
  {
    name: "Muhammad Umer",
    role: "DevOps Manager",
    initials: "MU",
    level: 1,
    summary:
      "Owns everything the code runs on: servers, deployment pipelines, and production infrastructure. Specialist in DevOps management, large-scale Hospital Management Systems, and high-security FinTech infrastructure.",
    domains: [
      "Servers & cloud infrastructure",
      "Deployment & CI/CD pipelines",
      "Hospital Management Systems (HMS)",
      "High-security FinTech infrastructure",
    ],
  },
  {
    name: "Farhan",
    role: "Lead Developer",
    initials: "F",
    level: 1,
    summary:
      "Leads the engineering team and owns delivery on the platform work. Senior Laravel developer, architecting and shipping the large back-end systems our clients run their businesses on.",
    domains: [
      "Engineering leadership",
      "Senior Laravel development",
      "Back-end architecture",
      "Code review & standards",
    ],
  },
  {
    name: "Usama",
    role: "Senior Developer",
    initials: "U",
    level: 2,
    summary:
      "Senior Laravel developer. Builds and maintains the platform systems — ERP, commerce, and booking infrastructure — to production standard.",
    domains: [
      "Laravel development",
      "Platform & API engineering",
      "Database design",
    ],
  },
  {
    name: "Abdul Wahab",
    role: "AI & Multi-Platform Engineering Lead",
    initials: "AW",
    level: 2,
    summary:
      "The firm's applied-AI lead and its most versatile builder. Drives our deep research into AI systems and delivers across the MERN stack — web, mobile, and everything between.",
    domains: [
      "Applied AI & deep research",
      "MERN stack engineering",
      "Cross-platform mobile applications",
      "End-to-end product delivery",
    ],
  },
];

export interface Executive {
  name: string;
  role: string;
  initials: string;
  summary: string;
  domains: string[];
}

export const LEADERSHIP_INTRO = {
  eyebrow: "Leadership & Technical Team",
  headline: "The people who actually build it.",
  description:
    "Every engagement is architected and run by the people whose names are on the company — not delegated to a bench you never meet.",
} as const;

export const EXECUTIVES: Executive[] = [
  {
    name: "Hammad Sohail",
    role: "CEO & Director",
    initials: "HS",
    summary:
      "Specialist in managing large-scale projects, enterprise IT industry solutions, and technical architecture for the global finance sector.",
    domains: [
      "Large-scale project management",
      "Enterprise IT industry solutions",
      "Technical architecture — global finance",
    ],
  },
  {
    name: "Muhammad Umer",
    role: "Chief Operating Officer",
    initials: "MU",
    summary:
      "Specialist in global operations, DevOps management, large-scale Hospital Management Systems, and high-security FinTech infrastructure.",
    domains: [
      "Global operations",
      "DevOps management",
      "Hospital Management Systems (HMS)",
      "High-security FinTech infrastructure",
    ],
  },
  {
    name: "Abdul Wahab",
    role: "AI & Multi-Platform Engineering Lead",
    initials: "AW",
    summary:
      "The firm's applied-AI lead and its most versatile builder — driving our deep research into AI systems and delivering across web, mobile, and everything between.",
    domains: [
      "Applied AI & deep research",
      "Full-stack web engineering",
      "Cross-platform mobile applications",
      "End-to-end product delivery",
    ],
  },
];

export interface ProcessStep {
  index: string;
  title: string;
  /** Plain-English duration. Buyers ask "how long" before anything else. */
  duration: string;
  description: string;
  /** What actually happens in this phase. */
  activities: string[];
  /** What lands in the client's hands at the end of it. Concrete artefacts. */
  deliverable: string;
}

export const PROCESS_INTRO = {
  eyebrow: "The Method",
  headline: "How the work actually gets built.",
  description:
    "No black box, and no six-week silence followed by a reveal. Each phase ends in something you can hold, review, and reject — and you see working software long before launch day.",
} as const;

export const PROCESS: ProcessStep[] = [
  {
    index: "01",
    title: "Discovery",
    duration: "1–2 weeks",
    description:
      "Before a line of code, we learn your business the way your operators understand it — the rules, the exceptions, and the constraints nobody wrote down.",
    activities: [
      "Stakeholder and operator interviews",
      "Business logic and edge-case mapping",
      "Existing systems and integration audit",
      "Success metrics agreed in writing",
    ],
    deliverable: "A written scope, risk register, and a fixed estimate you can act on.",
  },
  {
    index: "02",
    title: "Architecture",
    duration: "1–3 weeks",
    description:
      "We design the system before we build it. The data model is where a platform lives or dies — most rewrites we are called in to fix were lost at this stage.",
    activities: [
      "Data model and schema design",
      "Infrastructure and scaling plan",
      "API contracts and integration surface",
      "Interface systems and component library",
    ],
    deliverable: "An architecture document, schema, API contracts, and clickable UI system.",
  },
  {
    index: "03",
    title: "Engineering",
    duration: "Continuous, in two-week increments",
    description:
      "Built in the open. You get a working environment early and a reviewable increment every fortnight — never a demo, always the real system running real data.",
    activities: [
      "Two-week increments, each one shippable",
      "Peer review on every merge",
      "Automated test coverage on business logic",
      "A staging environment you can use whenever you like",
    ],
    deliverable: "Working software in staging from week one, and a demo every two weeks.",
  },
  {
    index: "04",
    title: "Deployment & Care",
    duration: "Launch, then ongoing",
    description:
      "Launch is the start of the system's life, not the end of ours. It goes out on continuous delivery, with monitoring watching it from the first hour of real traffic.",
    activities: [
      "Continuous CI/CD pipeline",
      "Monitoring, logging, and alerting",
      "Load and security verification before go-live",
      "Handover: repositories, infrastructure, documentation",
    ],
    deliverable: "A live, monitored system — and full ownership of every part of it.",
  },
];

export interface TechTier {
  tier: string;
  scope: string;
  /** Who this tier is for — a buyer should recognise themselves in one of these. */
  suitedTo: string;
  description: string;
  items: string[];
}

export const TECH_INTRO = {
  eyebrow: "Technologies",
  headline: "The stack, tiered by engagement.",
  description:
    "We do not chase frameworks. This is what we run in production today, grouped by the scale of the system it belongs in — so you can see exactly which tier your project lands in.",
} as const;

export const TECH_TIERS: TechTier[] = [
  {
    tier: "Foundation",
    scope: "Interface and application layer",
    suitedTo: "Marketing platforms, web apps, mobile products",
    description:
      "Everything the user actually touches. Typed end to end, component-driven, and fast on the devices your customers really own — not just on a developer's laptop.",
    items: [
      "TypeScript",
      "React",
      "Next.js",
      "React Native",
      "Tailwind CSS",
      "Framer Motion",
    ],
  },
  {
    tier: "Platform",
    scope: "Services, data, and integration",
    suitedTo: "ERP, HMS, e-commerce, booking systems",
    description:
      "The layer where the business logic lives. Relational where correctness matters, document-based where shape changes, and an integration surface that other systems can rely on.",
    items: [
      "Node.js",
      "Express",
      "PostgreSQL",
      "MongoDB",
      "Redis",
      "REST & GraphQL",
      "Payment & third-party integrations",
    ],
  },
  {
    tier: "Enterprise",
    scope: "Scale, delivery, and security",
    suitedTo: "FinTech, healthcare, high-throughput commerce",
    description:
      "What separates a system that demos from a system that survives. Containerised, continuously delivered, observable in production, and audited before it ever sees real traffic.",
    items: [
      "Docker",
      "CI/CD pipelines",
      "Cloud infrastructure (AWS · Azure)",
      "Microservices",
      "Monitoring & observability",
      "Security auditing",
    ],
  },
  {
    tier: "Applied AI",
    scope: "Research, automation, and intelligence",
    suitedTo: "Teams putting AI into a real product, not a demo",
    description:
      "Our deep-research practice. We integrate language models and automation into systems that already carry load — where the hard part is grounding, evaluation, and cost, not the prompt.",
    items: [
      "Python",
      "LLM & model integration",
      "Retrieval-augmented generation",
      "Vector databases",
      "Workflow automation",
    ],
  },
];

export const FAQ_INTRO = {
  eyebrow: "Common Questions",
  headline: "The things every client asks first.",
} as const;

export const FAQS = [
  {
    question: "How do you price an engagement?",
    answer:
      "Fixed scope is quoted as a fixed price. Anything open-ended — a platform we will keep evolving with you — runs on a monthly retainer. We do not bill hourly, because it rewards the wrong thing.",
  },
  {
    question: "How long does a build take?",
    answer:
      "A focused platform ships in 6 to 12 weeks. A full enterprise ERP or HMS is a multi-phase engagement measured in months, delivered in working increments rather than one launch day.",
  },
  {
    question: "How is an estimate produced?",
    answer:
      "From an architecture pass, not a guess. We map the data model and integration surface first, then estimate against it. If the scope is not clear enough to estimate honestly, we say so.",
  },
  {
    question: "What does the engagement process look like?",
    answer:
      "Discovery, architecture, engineering, deployment. You get a working environment early and see increments throughout — no black box, no six-week silence followed by a reveal.",
  },
  {
    question: "Do you support the system after launch?",
    answer:
      "Yes. Monitoring, incident response, and iteration are offered as an ongoing retainer. A system that cannot fail is not a thing you hand over and walk away from.",
  },
  {
    question: "Who owns the code?",
    answer:
      "You do, outright, on final payment — repositories, infrastructure, and documentation. There is no lock-in and no licensing arrangement holding your own platform hostage.",
  },
] as const;

export const CONTACT = {
  eyebrow: "Enterprise Endpoint",
  headline: "Tell us what you are building.",
  description:
    "Engagements begin with a technical conversation, not a sales call. Describe the system and we will respond with an architectural point of view.",
} as const;

export const WHATSAPP_MESSAGE =
  "Hello Synaptic Lab — I'd like to discuss an engineering engagement.";
