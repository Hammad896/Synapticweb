# Synaptic Lab

The company website and internal HR system for **Synaptic Lab** — an enterprise software
engineering firm in Islamabad. We are the back-office engineering arm for Norwegian software
companies (Noregna AS, Superlogics AS), and we build independent platforms end to end.

Two things live in this repo:

1. **The public site** — a multi-page marketing site, high-contrast, dual-theme, built to sell.
2. **The HR module** (`/admin`) — employees, letters on the real company letterhead, ID cards,
   QR verification, reports, careers, and an audit log. Backed by Supabase with row-level
   security.

---

## Quick start

```bash
npm install
cp .env.example .env     # then fill in the Supabase keys
npm run dev              # → http://localhost:8080
```

| Script | Does |
| ------ | ---- |
| `npm run dev` | Dev server on :8080 |
| `npm run build` | Production build. **Fails without Supabase keys**, deliberately. |
| `npm run build:dev` | Offline build with the local-storage fallback |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest |

**Stack:** React 18 · TypeScript · Vite · Tailwind · Framer Motion · Supabase · pdf-lib.

---

## Documentation

| Doc | Read it when |
| --- | ------------ |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | **Start here** if you are new. File tree, the rules that matter, common tasks. |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Deploying to Vercel, environment variables, admin access. |
| [`docs/HR_MODULE.md`](docs/HR_MODULE.md) | The admin panel: letters, ID cards, verification, automations. |
| [`docs/CONTENT.md`](docs/CONTENT.md) | Editing the website's words without touching code. |
| [`docs/STYLE_GUIDE.md`](docs/STYLE_GUIDE.md) | Tokens, type, spacing, motion, accessibility. |
| [`docs/supabase/schema.sql`](docs/supabase/schema.sql) | The database, and the security model. |

---

## The rules that actually matter

**1. Row Level Security is the security model.**
The Supabase anon key ships inside the browser bundle. That is fine — it identifies the
project, it does not grant access. **RLS is the only thing standing between the internet and
your employees' salaries.** Every table has it on. If someone disables it "just to test
something", the key becomes a public door.

**2. "Authenticated" is not a trust level.**
Anyone who signs up is `authenticated`. Access is granted by membership of the `admins`
table, checked by `is_admin()` in every policy.

**3. Never hardcode content, and never hardcode a colour.**
All website copy lives in the database and is edited from **Admin → Content**. `src/data/site.ts`
is only the *seed*. Colours are CSS variables resolved per theme — the accent is cyan on dark
and a deeper blue on light, because cyan fails contrast on white.

**4. Employee PII never enters this repository.**
It is public, and git history is permanent. Salaries, CNICs and emergency contacts go into the
database via **Admin → Employees → Import JSON**, reading a file from your own disk. There is a
gitignored `seed-employees.local.json` for exactly this.

**5. Two gradients, not interchangeable.**
`.gradient-synapse` (the full logo ramp, ending in cyan) is for thin, textless things only.
`.gradient-fill` (navy → core blue) is for anything carrying white text. White on cyan is
~1.9:1 and fails WCAG.

---

## What is where

```
src/
  data/site.ts        seed content (the DB is the live source)
  data/content.ts     the shape of every editable string
  index.css           the token layer, both themes
  components/
    kit/              the theme kit — build new pages from these
    sections/         one file per page section
  pages/              one file per route
  admin/              the HR module
  hr/                 letters, PDF rendering, ID cards, automations
  auth/               Supabase auth + route guard
docs/supabase/schema.sql
scripts/supabase-setup.mjs   applies the schema, asserts RLS is on
```

---

## Notable pieces

- **Letters** render onto the *real* `Letterhead.pdf` via pdf-lib. A **draft covers the
  signature and stamps a watermark**; only issuing applies the real signature, mints a
  permanent reference, embeds a verification QR, and writes it to the register. An unsigned
  letter can never pass for a signed one.
- **QR codes carry an unguessable token**, never the sequential employee ID — otherwise anyone
  could enumerate the whole roster by counting upward.
- **Lab Assist** is deliberately *not* an LLM. Its answers are compiled from the live content,
  so it cannot invent a price, a timeline or a client, and it cannot drift out of date.
- **Accessibility is a feature, not a chore.** Skip link, landmarks, real `aria-expanded`
  disclosures, reduced-motion honoured in JS (Framer animates inline styles, so CSS alone is
  not enough).

---

## Known gaps — deliberate, not forgotten

- **No privacy policy.** With EU clients this is a GDPR requirement now that forms collect
  personal data.
- **No portfolio section.** There are no client projects cleared for publication. An empty grid
  beats invented case studies.
- **Eid dates are not seeded** in the office-closure list. They are lunar and announced locally;
  a confidently wrong closure date on the homepage is worse than none. Add them in
  Admin → Content.
- **No analytics.**
