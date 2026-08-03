# 00 — MASTER PROMPT · Synaptic Lab

> **Historical.** This is the original brief the site was built from, kept for the brand rules,
> the verified facts, and the list of things we must never claim. Two things in it are now out
> of date: the site is **multi-page** (see `ARCHITECTURE.md` §5), and copy is edited from the
> **database**, not from `site.ts` (see `CONTENT.md`). The brand and honesty rules below still
> apply in full.


> **Single source of truth.** Steps `01`–`04` are the execution prompts; this file governs
> all of them. If a step prompt or a component contradicts this document, **this document
> wins.**
>
> **Design inspiration:** [REDSTONE Software](https://www.awwwards.com/sites/redstone-software)
> (Awwwards Honorable Mention, 7.79) — near-black + white high contrast, numbered service
> cards, aggressive hover fills, tech-stack tiers, FAQ accordion, stat badges.
> **Brand color is NOT borrowed from Redstone** — it is extracted from the Synaptic Lab logo.

---

## 0. Role & Objective

Act as an expert frontend engineer and UI/UX designer. Build the Synaptic Lab site as a
**single-page, high-contrast, motion-forward engineering studio site** in **React +
TypeScript + Tailwind CSS** — production-ready, modular, **zero placeholders**.

The feel: *a serious engineering firm that also has taste.* Redstone's structure and
confidence, executed with restraint. Nothing decorative that doesn't carry information.

### This site has to SELL. That is its job.

It is not a brochure. A visitor must understand **what they can buy** within one screen of
scrolling. We sell exactly two things, and the page is organized around that fact:

1. **Extended Engineering Team** — we act as the **back office for head offices abroad**.
   A dedicated squad works under the client's brand, inside their process and release
   calendar: the capability of an in-house department without the cost or lead time of
   building one. *This is live today with Noregna AS and Superlogics AS (Norway).*
2. **Independent Product Builds** — we take a system end to end: web platforms, mobile
   apps, ERP, e-commerce, AI tooling. Data model to production traffic, one accountable team.

Every section must serve one of three jobs: **(a)** say what we sell, **(b)** prove we can
deliver it, or **(c)** make it easy to start. A section doing none of those gets cut.

**Sell with specifics, never adjectives.** "European timezone overlap, daily" sells;
"world-class quality" does not. Named partners, named people, concrete inclusions, honest
commercial terms. Confidence comes from precision — never from inflation.

---

## 1. Color System

### 1.1 The accent is the logo

The Synaptic Lab mark is a prism running a **navy → cyan** gradient. Those exact pixels,
sampled from `synptic.png`, ARE the brand:

| Stop      | Hex       | Role                                          |
| --------- | --------- | --------------------------------------------- |
| Navy      | `#001463` | Gradient origin. Deep, structural.            |
| **Core**  | `#0067AE` | **The brand blue.** Solid fills, buttons.     |
| Cyan      | `#00C2FF` | Gradient terminus. Links, indices, highlights.|

**The Synapse Gradient** — `linear-gradient(90deg, #001463, #0067AE, #00C2FF)` — is the
signature. It appears exactly as it does in the logo (the rule under "LAB"): as section
rules, card hover-fills, and the active-state underline. **It is never a background wash
and never sits behind body text.**

### 1.2 Neutrals (Redstone's near-black, not pure black)

| Token                  | Dark      | Light     | Purpose                       |
| ---------------------- | --------- | --------- | ----------------------------- |
| `--background`         | `#020202` | `#FBFBFD` | Canvas                        |
| `--card`               | `#0A0A0B` | `#FFFFFF` | Elevated surface              |
| `--foreground`         | `#FFFFFF` | `#020202` | Primary text                  |
| `--muted-foreground`   | `#8A8A8E` | `#6B6B70` | Secondary text                |
| `--border`             | `#1C1C1F` | `#E4E6EB` | Hairlines only                |

### 1.4 Light mode is a first-class theme, and it obeys different physics

The commonest way to ruin a light theme is to invert the dark one literally: white canvas,
gray cards. That reads **recessed and cheap** — real elevation catches light, it doesn't sink.

- **In dark, elevation = a lighter surface.** Shadows are invisible on near-black, so there
  is nothing to cast. `#0A0A0B` cards sit above a `#020202` page.
- **In light, elevation = a cast shadow.** The canvas is a soft off-white (`#FBFBFD`) and
  cards are **pure white, floating above it** — the inverse of the usual mistake.
- **Shadows are tinted toward the brand navy, never neutral gray.** Two layers: a tight
  contact shadow plus a wide ambient one. Neutral-gray shadows are what make light UIs look
  like unstyled Bootstrap.
- Expose this as `--elevation` / `--elevation-hover` so a single `.surface` class is correct
  in both themes without a `dark:` variant anywhere.
- A faint **bloom** of the brand gradient sits behind the hero (`.bloom`) so light mode never
  reads as a blank sheet of paper. Never strong enough to compete with type.

### 1.3 Accent, resolved per theme (contrast is non-negotiable)

`#00C2FF` is luminous on near-black but **fails on white**; `#0067AE` is the reverse.
So the accent is a *token*, not a constant:

| Token             | Dark      | Light     | Why                                        |
| ----------------- | --------- | --------- | ------------------------------------------ |
| `--accent`        | `#00C2FF` | `#005A9E` | Text, links, indices. Passes AA both ways. |
| `--accent-solid`  | `#0067AE` | `#0067AE` | Button/fill background, always white type. |

**Ship both themes.** `.light` class on `<html>`, persisted to `localStorage`, defaulting
to the OS preference, applied by a **blocking inline script before first paint** so the
page never flashes the wrong theme.

---

## 2. Typography

- **Family:** Inter (variable), with `-apple-system` / SF Pro ahead of it on Apple
  hardware. One typeface, whole site.
- **Drastic size contrast** — the load-bearing rule. Headlines are enormous; body copy
  stays small and calm. No middle tier.
  - Hero — `clamp(3rem, 8vw, 7.5rem)`, `font-semibold`, `tracking-[-0.04em]`
  - Section heading — `text-4xl` → `text-6xl`
  - Card index numerals (`01`–`09`) — `text-5xl`+, `tabular-nums`, accent-colored
  - Body — `text-base` / `text-lg`
  - Eyebrow — `text-xs`, uppercase, `tracking-[0.2em]`, muted
- **Optical correction at scale:** tight leading (`0.95`) + negative tracking via
  `.type-display`. Opt-in — below ~40px it reads cramped.
- **Measure:** long-form copy capped at ~68ch.
- **Two text colors only:** `--foreground` and `--muted-foreground`. No third gray.

---

## 3. Layout

- **Negative space is the primary design element.** Section rhythm `py-32` → `py-40`.
  Crowded section? *Remove content* — don't shrink padding.
- Containers: `max-w-7xl` (grids), `max-w-5xl` (editorial).
- **Asymmetric bento.** Blocks are deliberately unequal so the eye has a path — never a
  uniform 3×N matrix.
- **Borders:** 1px hairline. A border is an *edge*, never a visible gray box.
- **Radius:** `rounded-3xl` on containers, consistently.

---

## 4. Motion — Redstone-grade, not Redstone-noisy

Motion confirms causality and rewards attention. It never entertains for its own sake.

- **The signature interaction — the hover fill.** A card's background sweeps the Synapse
  Gradient in from the bottom (`scaleY` 0→1, `transform-origin: bottom`, 500ms), the index
  numeral and title invert to white. This is *the* move; it carries the whole page.
- **Scale ceiling `1.02×`.** No lift, no glow, no rotation.
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` — fast out, long settle. 300–600ms.
- **Scroll reveal:** one shared `<Reveal>` primitive — opacity 0→1, `translateY 24px→0`,
  staggered by index, fired **once**.
- **Marquee:** a single infinite ticker for the technology stack. CSS transform only,
  pauses on hover, `aria-hidden` on the duplicated track.
- **Animate only `opacity` and `transform`.** Nothing that triggers layout.
- **`prefers-reduced-motion: reduce` disables all of it.** Non-negotiable.

---

## 5. The Page (single-page scroll, in order)

| #  | Section          | Job | Content                                                                 |
| -- | ---------------- | --- | ----------------------------------------------------------------------- |
| 1  | **Hero**         | (a) | Headline; the offer; two CTAs; **named partner trust strip**; stat band. |
| 2  | **Engagements**  | (a) | **`01` Extended Engineering Team · `02` Independent Product Builds.** The commercial heart — what you are actually buying. |
| 3  | **Capabilities** | (b) | Numbered `01`–`05` cards, hover-fill. The five product lines.            |
| 4  | **Partners**     | (b) | Nordic operations — Noregna AS · Superlogics AS.                         |
| 5  | **Team**         | (b) | Hammad Sohail (CEO) · Muhammad Umer (COO) · Abdul Wahab (AI & Multi-Platform Lead). |
| 6  | **Process**      | (b) | `01` Discovery · `02` Architecture · `03` Engineering · `04` Deployment. |
| 7  | **Technologies** | (b) | Tiered stack (Foundation / Platform / Enterprise) + marquee.             |
| 8  | **FAQ**          | (c) | Accordion — pricing, timelines, process, support, estimation, ownership. |
| 9  | **Contact**      | (c) | Typographic form on underlines. Email + WhatsApp.                        |
| 10 | **Footer**       | —   | Minimal, hairline-separated.                                             |

Stats (`150+` projects · `99%` satisfaction · `$2M+` revenue · `5+` years) ride **inside the
hero**, not as a standalone section — they are evidence for the offer, not the offer.

**Plus:** a persistent floating **WhatsApp** button (bottom-right), styled in the site's
own language — **not** the stock green bubble.

---

## 6. Verified Company Data

Use **only** this. Do not invent people, clients, testimonials, or case studies.

- **Hammad Sohail — CEO & Director.** Large-scale project management, enterprise IT
  industry solutions, technical architecture for the global finance sector.
- **Muhammad Umer — Chief Operating Officer.** Global operations, DevOps management,
  large-scale Hospital Management Systems (HMS), high-security FinTech infrastructure.
- **Abdul Wahab — AI & Multi-Platform Engineering Lead.** The firm's applied-AI lead and its
  most versatile builder: drives our deep research into AI systems and delivers across web,
  mobile, and everything in between. The young engine of the technical team.
  *(Title is a proposal — confirm with him before launch.)*
- **Product lines:** Enterprise ERP · Automotive Workshop Management · Automated
  Appointment & Booking · High-Throughput E-Commerce · Bespoke Full-Stack Engineering.
- **Nordic operations — the single strongest credibility signal.** Synaptic Lab is the
  **back-office engineering arm** for two Norwegian software firms: **Noregna AS** and
  **Superlogics AS**. We run dedicated delivery, infrastructure, and long-term platform work
  as an embedded extension of their teams. Surface this **above the fold** (a named trust
  strip in the hero) and again as its own `#partners` section. State the relationship
  precisely — *back-office engineering arm*, an outsourced delivery capability. Do **not**
  inflate it into "clients," "acquisitions," or "offices in Oslo."
- **Email:** `qhammad286@gmail.com`
- **WhatsApp:** `+92 313 9676896`
- **Location:** Islamabad, Pakistan — Head Office. Operating globally.
- **Track record (confirmed):** 150+ projects delivered · 99% client satisfaction ·
  $2M+ revenue generated · 5+ years. These reflect the aggregate delivery record of the
  people who ran those engagements. State them plainly; do not embellish them.

**Explicitly excluded** (template placeholders found in the old codebase, carried forward
by nobody): the "Wahab / Hamza / Sarah Chen / Elena Rod" team list, and the "Sarah Jenkins,
CTO of NexaFlow" testimonial with its stock pravatar headshot. **No portfolio/case-study
section until real projects exist** — an empty grid of invented clients is worse than no
grid.

---

## 7. Engineering Standards

- **One section = one component.** All copy lives in `src/data/site.ts` — never inline in
  JSX — so content is editable without touching layout.
- **Semantic HTML:** `<nav> <main> <section> <article> <header> <footer> <address>`; one
  `<h1>`; labelled form controls.
- **Accessible:** visible focus rings, `aria-label` on icon-only controls, `aria-expanded`
  on disclosures, honest contrast in *both* themes.
- **Performant:** IntersectionObserver / `whileInView` (no scroll-position thrash), passive
  listeners, `opacity`/`transform` only.
- **A lean repo.** Every file is live. No orphaned components, no unused dependencies, no
  dead routes.
- **No placeholders.** No lorem ipsum, no stock avatars, no TODOs, no dead links. Every
  string is real; every control does something.
