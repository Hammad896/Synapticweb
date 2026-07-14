# Architecture — Developer Handoff

> Read this before touching the code. It explains *where everything is* and *why it is
> shaped that way*. For visual rules see [`STYLE_GUIDE.md`](./STYLE_GUIDE.md).

---

## 1. What this is

Two applications in one repo, sharing one design system:

1. **A multi-page marketing site** — real routes, server-rendered meta, built to sell.
2. **An HR system** (`/admin`) — employees, letters on the real letterhead, ID cards, QR
   verification, reports, careers, audit log. Behind Supabase auth and row-level security.

**Stack:** React 18 · TypeScript · Vite · Tailwind CSS 3 · Framer Motion · React Router ·
Supabase · pdf-lib.

There is no UI kit and no CSS framework beyond Tailwind. Every file under `src/` is reachable
from `App.tsx`; if you find one that is not, delete it.

---

## 2. Tree

```
synapticlab/
├── docs/
│   ├── ARCHITECTURE.md              ← You are here.
│   ├── STYLE_GUIDE.md               ← Tokens, type, spacing, motion, a11y.
│   ├── DEPLOYMENT.md                ← Vercel, env vars, the database.
│   ├── ADMIN.md                     ← The panel and who may open it.
│   ├── HR_MODULE.md                 ← Letters, ID cards, verification, automations.
│   ├── CONTENT.md                   ← Editing the site's words without code.
│   ├── 00_MASTER_PROMPT.md          ← Governing spec: brand, verified data, what we never claim.
│   └── supabase/schema.sql          ← ★ The database AND the security model.
│
├── public/                          ← Served verbatim.
│   ├── logo-light.png               ← Black wordmark. For LIGHT backgrounds.
│   ├── logo-dark.png                ← White wordmark + prism. For DARK backgrounds.
│   ├── favicon.png · og-image.png · sitemap.xml · robots.txt
│   └── Letterhead.pdf               ← ★ The real letterhead. Letters render onto this file.
│
├── src/
│   ├── data/
│   │   ├── site.ts                  ← ★ SEED content. Not the live source — the DB is.
│   │   ├── content.ts               ← The shape of every editable string + defaults + merge.
│   │   └── limits.ts                ← Length limits. Mirrored by DB CHECK constraints.
│   │
│   ├── index.css                    ← ★ TOKEN LAYER. Both themes, .card-pad, .tap, .bloom.
│   ├── App.tsx                      ← ★ THE ROUTE TABLE. This is the site map.
│   │
│   ├── pages/                       ← One file per route.
│   │   ├── HomePage · CapabilitiesPage · HowWeWorkPage · PartnersPage
│   │   ├── TeamPage · CareersPage · FaqPage · ContactPage
│   │   ├── Verify.tsx               ← Public QR landing. Reads by token, never by ID.
│   │   └── NotFoundPage.tsx
│   │
│   ├── components/
│   │   ├── kit/index.tsx            ← ★ The theme kit. Build new pages from these.
│   │   ├── sections/                ← One file per page section.
│   │   ├── Layout · Navbar · Footer · Logo · Reveal · CountUp · ThemeToggle
│   │   ├── AnnouncementBar · LabAssist · WhatsAppButton · ScrollProgress
│   │   └── Seo.tsx                  ← Per-route title/description/canonical/JSON-LD.
│   │
│   ├── hooks/
│   │   ├── use-theme.tsx            ← Theme provider (boot script lives in index.html).
│   │   └── use-site-content.ts      ← ★ THE SINGLE READ PATH for all website copy.
│   │
│   ├── auth/                        ← Supabase auth + `RequireAuth` route guard.
│   ├── admin/
│   │   ├── AdminPage.tsx            ← Shell only. Tabs do the work.
│   │   ├── repository.ts            ← ★ HrRepository: Supabase adapter + local fallback.
│   │   ├── useHrData.ts             ← All admin state. One hook.
│   │   └── tabs/                    ← Overview · Employees · Letters · Register · Careers
│   │                                  · Website · Content · Audit
│   ├── hr/
│   │   ├── pdf.ts                   ← ★ Renders letters onto the real Letterhead.pdf.
│   │   ├── layout.ts                ← Letterhead geometry. DATA, not constants — see §6.
│   │   └── letters.ts · IdCard.tsx · automations.ts
│   │
│   └── lib/{utils,supabase,mailer}.ts
│
├── scripts/supabase-setup.mjs       ← Applies the schema. ASSERTS RLS is on. Exits non-zero if not.
├── vercel.json                      ← ★ SPA rewrites. Without these, every route but / 404s.
├── index.html                       ← Meta, OG, JSON-LD, and the pre-paint theme script.
└── vite.config.ts                   ← Alias `@` → `src`. Dev server on :8080.
```

---

## 3. The things a new dev must know

### 3.1 Content lives in the database, not in the code
`src/data/site.ts` is the **seed** — the values copied into Supabase the first time the admin
panel loads. After that the **database is the only truth**, and `useSiteContent()` is the only
read path. Editing `site.ts` on a seeded install changes nothing.

The fallback to built-ins is gated on a **`seeded` flag**, not on emptiness. That distinction
is load-bearing: falling back whenever a table was empty meant the admin said *"No partners
added"* while the site still showed two, and you could never remove the last one.

### 3.2 Row Level Security *is* the security model
The Supabase anon key ships inside the JavaScript bundle. That is by design; it identifies the
project, it does not grant access. **RLS is the only thing between the internet and your
employees' salaries.** Every table has it on, every policy calls `is_admin()`, which checks the
`admins` allowlist. "Authenticated" is not a trust level — anyone can sign up.

### 3.3 Never hardcode a colour
Every colour is a CSS variable resolved per theme in `index.css`. Use `text-accent`,
`bg-card`, `border-border`. **Never** `text-[#00C2FF]`. The accent *must* differ per theme:
cyan is luminous on near-black and **fails contrast on white**.

### 3.4 There are TWO gradients, and they are not interchangeable
- **`.gradient-synapse`** — the full logo ramp, ending in cyan. **Thin, textless** things only:
  the scroll bar, the nav underline, hairline rules.
- **`.gradient-fill`** — navy → core blue. Anything that carries **white text**.

White on `#00C2FF` is ~1.9:1. Using the full ramp behind text is a **WCAG failure**. This was a
real bug; do not reintroduce it.

### 3.5 The hover fill is a layer, not a background transition
**CSS cannot interpolate between gradients.** The fill is an absolutely-positioned `-z-10`
element that sits at `scale-x-0` and scales to `1` on `group-hover`. Animate `background-image`
and it will snap instead of sweep.

### 3.6 Reduced motion is enforced in JS, not just CSS
Framer Motion animates **inline styles**, so a media query alone cannot stop it — a `<Reveal>`
would sit at `opacity: 0` forever for a user with reduced motion on. `Reveal`, `CountUp` and
`ScrollProgress` each call `useReducedMotion()` and bail out.

### 3.7 Employee PII never enters this repo
It is public and git history is permanent. Salaries, CNICs, phones and emergency contacts go in
through **Admin → Employees → Import JSON**, which reads a file from your own disk.
`seed-employees.local.json` is gitignored. `docs/seed-employees.example.json` is the template.

---

## 4. Theme engine

1. A **blocking inline script in `index.html`** reads `localStorage`, falls back to
   `prefers-color-scheme`, and stamps `.light` on `<html>` **before first paint**. Without it
   the page flashes the wrong theme for a frame. Do not defer it or move it into the bundle.
2. `ThemeProvider` *adopts* whatever the boot script decided, persists explicit choices, and
   follows the OS only until the user picks one.

---

## 5. Routing

`App.tsx` is the site map. Every page is a real URL, wrapped in `<Layout>`, with its own
`<Seo>` block.

**`vercel.json` is not optional.** These are client-side routes; there is no file at `/team` on
the server. Without the SPA rewrite, every route except `/` returns a hard 404 in production —
the single most common way a working Vite SPA "breaks" on its first deploy.

---

## 6. Letterhead geometry is data, not constants

`src/hr/layout.ts` holds the coordinates letters are drawn at, and `LetterheadSetup.tsx` is a
calibration screen with a 50pt grid overlay and sliders. That indirection exists because the
person who wrote the renderer could not *see* the PDF: the numbers had to be adjustable by
someone who can. **Print one letter and check the margins before issuing anything real.**

---

## 7. Known gaps — deliberate, not forgotten

- **No privacy policy.** With EU/Norwegian clients this is a **GDPR requirement** now that the
  careers and contact forms collect personal data. The biggest outstanding gap.
- **No portfolio/case-study section.** There are no client projects cleared for publication. An
  empty grid beats invented case studies.
- **The contact form still uses `mailto:`.** The *careers* form does not: it records to the
  database and sends a real email via Web3Forms. Contact should move to the same path;
  `mailto:` fails silently for anyone without a desktop mail client.
- **No analytics.**

---

## 8. Before you push

```bash
npm run typecheck    # tsc --noEmit
npm run lint
npm test             # vitest
npm run build        # must pass clean
```

Then check it **in both themes**, at 1440×900 and 390px wide, and **with the keyboard only**
(Tab through it: the skip link should come first, and every focus ring must be visible).
