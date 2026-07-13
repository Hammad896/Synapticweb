# Architecture — Developer Handoff

> Read this before touching the code. It explains *where everything is* and *why it is
> shaped that way*. For visual rules see [`STYLE_GUIDE.md`](./STYLE_GUIDE.md).

---

## 1. What this is

A **single-page** marketing site. No router, no backend, no CMS, no UI kit. Six runtime
dependencies. Every file under `src/` is reachable from `App.tsx` — if you find one that
isn't, delete it.

**Stack:** React 18 · TypeScript · Vite · Tailwind CSS 3 · Framer Motion.

---

## 2. Tree

```
synapticlab/
├── docs/                            ← All documentation. Start with STYLE_GUIDE.md.
│   ├── ARCHITECTURE.md              ← You are here.
│   ├── STYLE_GUIDE.md               ← Tokens, type, spacing, motion, a11y.
│   ├── 00_MASTER_PROMPT.md          ← Governing spec: brand, verified data, what we must never claim.
│   ├── 01_foundation.md             ← Step spec: design system + shell.
│   ├── 02_hero_engagements_team.md  ← Step spec: hero, engagements, team.
│   ├── 03_capabilities_process_tech.md
│   └── 04_faq_contact_footer.md
│
├── public/                          ← Served verbatim at the site root.
│   ├── logo-light.png               ← Black wordmark. For LIGHT backgrounds.
│   ├── logo-dark.png                ← White wordmark + brand prism. For DARK backgrounds.
│   ├── favicon.png                  ← The prism mark alone (the wordmark is unreadable at 32px).
│   ├── og-image.png                 ← 1200×630 social share card.
│   ├── sitemap.xml
│   └── robots.txt
│
├── src/
│   ├── data/site.ts                 ← ★ ALL COPY. Every user-facing string on the site.
│   ├── index.css                    ← ★ TOKEN LAYER. Both themes + .surface/.bloom/.grain/.rule.
│   ├── App.tsx                      ← Section order. This IS the page outline.
│   ├── main.tsx                     ← Entry.
│   │
│   ├── hooks/
│   │   ├── use-theme.tsx            ← Theme provider (boot script is in index.html).
│   │   └── use-active-section.ts    ← Scroll-spy for the nav.
│   │
│   ├── lib/utils.ts                 ← `cn()` — clsx + tailwind-merge.
│   │
│   └── components/
│       ├── Layout.tsx               ← Shell: skip link, nav, main, footer, WhatsApp, grain.
│       ├── Navbar.tsx               ← Fixed 56px glass bar + mobile sheet + scroll-spy.
│       ├── Footer.tsx
│       ├── Logo.tsx                 ← ★ Theme-aware wordmark. NEVER <img> the logo directly.
│       ├── Reveal.tsx               ← ★ The ONE scroll-reveal primitive. Every section uses it.
│       ├── ThemeToggle.tsx
│       ├── ScrollProgress.tsx       ← Gradient read-progress hairline.
│       ├── CountUp.tsx              ← Animated stat numerals.
│       ├── LiveStatus.tsx           ← Office clock + availability.
│       ├── WhatsAppButton.tsx
│       │
│       └── sections/                ← One file per page section. Order set in App.tsx.
│           ├── Hero.tsx             ← Headline, offer, CTAs, partner trust strip, stats.
│           ├── Engagements.tsx      ← ★ The commercial heart: what you can buy.
│           ├── Capabilities.tsx     ← Numbered row list (01–05).
│           ├── Partners.tsx         ← Noregna AS · Superlogics AS.
│           ├── Leadership.tsx       ← The three-person team.
│           ├── Process.tsx          ← Discovery → Architecture → Engineering → Deployment.
│           ├── Technologies.tsx     ← Four tiers + marquee.
│           ├── Faq.tsx              ← Native accordion.
│           └── ContactEndpoint.tsx  ← Typographic form (mailto).
│
├── index.html                       ← ★ Meta, OG tags, JSON-LD, and the pre-paint theme script.
├── tailwind.config.ts               ← Token → class mapping.
└── vite.config.ts                   ← Alias `@` → `src`. Dev server on :8080.
```

---

## 3. The five things a new dev must know

### 3.1 All copy lives in `src/data/site.ts`
Not one user-facing string is inlined in JSX. To change any text on the site, edit that file.
Sections import a typed export and render it. This is deliberate: content changes must never
require touching layout.

### 3.2 Never hardcode a color
Every color is a CSS variable resolved per theme in `index.css`. Use `text-accent`,
`bg-accent-solid`, `bg-card`, `border-border`. **Never** `text-[#00C2FF]`.

The accent *must* differ per theme — cyan is luminous on near-black and **fails contrast on
white**. That is why it is a token, not a constant.

### 3.3 There are TWO gradients, and they are not interchangeable
- **`.gradient-synapse`** — the full logo ramp, ending in cyan. Only for **thin, textless**
  elements: the scroll-progress bar, the active-nav underline, hairline rules.
- **`.gradient-fill`** — navy → core blue. For any surface that carries **white text** on
  hover (capability rows, engagement cards, partner cards).

Using the full ramp behind text is a **WCAG failure** — white on `#00C2FF` is ~1.9:1. This was
a real bug; do not reintroduce it.

### 3.4 The hover fill is a layer, not a background transition
**CSS cannot interpolate between gradients.** The fill is an absolutely-positioned `-z-10`
element that is `scale-x-0` / `scale-y-0` at rest and scales to `1` on `group-hover`. If you
try to animate `background-image`, it will snap instead of sweep.

### 3.5 Reduced motion is enforced in JS, not just CSS
Framer Motion animates **inline styles**, so a CSS media query alone cannot stop it — a
`<Reveal>` would sit at `opacity: 0` forever for a user with reduced motion enabled. That is
why `Reveal`, `CountUp`, and `ScrollProgress` each call `useReducedMotion()` and bail out.

---

## 4. Theme engine

1. A **blocking inline script in `index.html`** reads `localStorage`, falls back to
   `prefers-color-scheme`, and stamps `.light` on `<html>` **before first paint**. Without it
   the page flashes the wrong theme for a frame. Do not defer or move it into the bundle.
2. `ThemeProvider` (`use-theme.tsx`) *adopts* whatever the boot script decided, persists user
   changes, and follows the OS only until the user chooses explicitly.

---

## 5. Common tasks

| Task | Where |
| ---- | ----- |
| Change any text | `src/data/site.ts` |
| Reorder / remove a section | `src/App.tsx` |
| Add a nav item | `NAV_LINKS` in `site.ts` — nav, mobile sheet, footer and scroll-spy all read from it |
| Change a color | `src/index.css` (`:root` and `.light`) — never in a component |
| Add a capability / FAQ / tech | Append to the typed array in `site.ts` |
| Update contact details | `COMPANY` in `site.ts` |
| Regenerate the logo variants | Source of truth is `synptic.png`; see STYLE_GUIDE §2 |

---

## 6. Known gaps — deliberate, not forgotten

- **The contact form has no backend.** It composes a real `mailto:` draft rather than faking a
  POST and a success toast. When an API exists, only `handleSubmit` in `ContactEndpoint.tsx`
  changes. **A production company site should move to a real form endpoint** (Formspree,
  Resend, or a serverless function) — `mailto:` fails for anyone without a desktop mail client.
- **No portfolio/case-study section.** There are no real projects cleared for publication yet.
  An empty grid beats invented clients.
- **No legal pages.** With EU/Norwegian clients, a **privacy policy is a GDPR requirement** as
  soon as the form collects personal data. This needs a decision.
- **No analytics.** Nothing is tracked. Add Plausible/GA if wanted.

---

## 7. Before you push

```bash
npm run typecheck    # tsc --noEmit
npm run build        # must pass clean
npm test             # vitest
```

Then check the page **in both themes**, at 1440×900 and 390px wide, and **with the keyboard
only** (Tab through it — the skip link should appear first, and every focus ring must be
visible).
