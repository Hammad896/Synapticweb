# 02 — Hero, Engagements & Team

> Inherits [`00_MASTER_PROMPT.md`](./00_MASTER_PROMPT.md). Read it first.

Act as a Senior UI/UX Engineer **who has sold consulting before**. This is the commercial
top of the page: by the end of the second section a visitor must know exactly what they can
buy from us and believe we can deliver it.

## Execute

### 1. Hero — the offer, not a slogan

- **Massive** headline: `clamp(2.75rem, 8vw, 7.5rem)`, `font-semibold`,
  `tracking-[-0.04em]`, `leading-[0.95]`. It names what we do, plainly:
  *"The engineering floor behind software firms abroad."*
- Subtitle (max ~68ch) that states **both offers in one breath** — dedicated back-office
  engineering for companies abroad, **and** independent end-to-end product builds across
  web, mobile, ERP, commerce, and AI.
- Two CTAs: solid `--accent-solid` ("Start an engagement") and a quiet text link
  ("See how we work" → `#engagements`).
- **The trust strip.** Directly beneath the CTAs: *"Back-office engineering arm for"* +
  **Noregna AS** · **Superlogics AS**, set large. Named European firms above the fold do
  more for credibility than any adjective could. This is the single highest-value element
  on the page — do not bury it.
- **Stat band** at the base of the hero: `150+` Projects Delivered · `99%` Client
  Satisfaction · `$2M+` Revenue Generated · `5+` Years Experience. `tabular-nums`, value
  enormous, label a muted uppercase micro-caption. Confirmed figures — state them plainly.
- **Entry is time-based, not scroll-based** (the hero is already in view; `whileInView`
  would fire instantly and read as a glitch). Stagger ~90ms on the Apple curve.
- Atmosphere: the hairline grid, masked radially, **plus** the `.bloom` gradient behind the
  headline. Both theme-aware. No colored glows beyond that.

### 2. Engagements — the commercial heart

Two numbered cards, same hover-fill as the capability grid, answering *"what am I buying?"*:

- **`01` Extended Engineering Team** — *For head offices abroad.* We become your back
  office: a dedicated squad under your brand, inside your process and release calendar.
  The capability of an in-house department without the cost or lead time of building one.
  Live today with Noregna AS and Superlogics AS. Inclusions: named engineers (not a rotating
  pool) · your process and repositories · **daily European timezone overlap** · scale up or
  down without a hiring cycle.
- **`02` Independent Product Builds** — *For companies who need the thing built.* We own it
  end to end: data model, architecture, engineering, launch, support. Web platforms, mobile
  apps, ERP, e-commerce, AI tooling. Inclusions: fixed scope/fixed price or a retainer ·
  web + mobile + full-stack · built to be maintained, not demoed · **you own the code**.

Sell with **specifics, never adjectives**. Each inclusion is a checkable fact.

### 3. Team

Three cards (`lg:grid-cols-3`), real people, **no stock headshots** — monogram marks, which
are honest about the fact that we don't have photography.

- **Hammad Sohail — CEO & Director.** Large-scale project management, enterprise IT industry
  solutions, technical architecture for the global finance sector.
- **Muhammad Umer — Chief Operating Officer.** Global operations, DevOps management,
  large-scale Hospital Management Systems (HMS), high-security FinTech infrastructure.
- **Abdul Wahab — AI & Multi-Platform Engineering Lead.** Applied AI and deep research;
  delivers across web and mobile. The young engine of the technical team.

Each card lists concrete domains of authority as a hairline-separated list. On hover:
`1.02×`, border resolves to the accent.

## Constraints

`--foreground` for names and figures, `--muted-foreground` for every description. Accent
appears only on CTAs, indices, and eyebrows. No invented people, no placeholder copy, and
**never inflate the Norwegian relationship** beyond "back-office engineering arm."
