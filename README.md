# Synaptic Lab

The company website for **Synaptic Lab** — an enterprise software engineering firm based in
Islamabad. We operate as the back-office engineering arm for Norwegian software companies
(Noregna AS, Superlogics AS) and build independent platforms end to end.

A single-page React site — high-contrast, motion-forward, dual-theme, built to sell — plus an
internal admin panel for employee records.

---

## Quick start

```bash
npm install
npm run dev          # → http://localhost:8080
```

| Script              | Does                       |
| ------------------- | -------------------------- |
| `npm run dev`       | Dev server on :8080        |
| `npm run build`     | Production build → `dist/` |
| `npm run preview`   | Serve the production build |
| `npm run typecheck` | `tsc --noEmit`             |
| `npm run lint`      | ESLint                     |
| `npm test`          | Vitest                     |

**Stack:** React 18 · TypeScript · Vite · Tailwind CSS · Framer Motion · React Router.
No UI kit — seven runtime dependencies total.

---

## Routes

| Route | What |
| ----- | ---- |
| `/` | The public marketing site. |
| `/admin` | **Internal** employee records. Not linked publicly. **[Read `docs/ADMIN.md` before entering real data.](docs/ADMIN.md)** |

---

## Documentation

**Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) first if you are new to the codebase.**

| Doc | What it's for |
| --- | ------------- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | File tree, the 5 things every dev must know, common tasks, known gaps. |
| [`docs/STYLE_GUIDE.md`](docs/STYLE_GUIDE.md) | Tokens, typography, spacing, motion, accessibility, "adding a section" checklist. |
| [`docs/ADMIN.md`](docs/ADMIN.md) | ⚠️ The admin panel, its storage limits, and how to make it production-safe. |
| [`docs/00_MASTER_PROMPT.md`](docs/00_MASTER_PROMPT.md) | The governing spec — brand, verified company data, what the site must never claim. |
| [`docs/01_foundation.md`](docs/01_foundation.md) → [`04`](docs/04_faq_contact_footer.md) | Step-by-step build specs per section group. |

---

## The rules that matter most

1. **All site copy lives in [`src/data/site.ts`](src/data/site.ts).** Never inline a
   user-facing string in JSX. To change any text, edit that one file.
2. **Never hardcode a color.** Every color is a CSS variable resolved per theme. The accent is
   *cyan* on dark and a *deeper blue* on light — because cyan fails contrast on white. Use
   `text-accent` / `bg-accent-solid` / `bg-card`, never a hex.
3. **Two gradients, not interchangeable.** `.gradient-synapse` (full ramp, ends in cyan) is for
   **thin, textless** elements only — the progress bar, rules, the nav underline.
   `.gradient-fill` (navy → core blue) is for any surface carrying **white text** on hover.
   White on cyan is ~1.9:1 and fails WCAG.
4. **No placeholders, ever.** No lorem ipsum, no stock avatars, no invented clients, no dead
   links. No portfolio section until there are real projects to show.

---

## Brand

The accent is sampled from the logo itself: navy `#001463` → core `#0067AE` → cyan `#00C2FF`.

The wordmark ships as two transparent variants generated from `synptic.png`:
`public/logo-light.png` (black letterforms) and `public/logo-dark.png` (white letterforms, prism
gradient preserved). The `<Logo>` component picks the right one per theme — never `<img>` the
logo directly, and never recolor it with a CSS filter.

---

## Notable pieces

- **Lab Assist** (`src/components/LabAssist.tsx`) — the on-site assistant. Deliberately *not* an
  LLM: every answer is derived from `data/site.ts`, so it cannot invent a price, a timeline, or
  a client, and it hands off to a human when it doesn't know. See `src/data/assistant.ts`.
- **Theme engine** — a blocking inline script in `index.html` applies the theme *before first
  paint*, so the page never flashes the wrong one.
- **Accessibility is a feature, not a chore** — skip link, landmarks, real `aria-expanded`
  disclosures, decorative layers `aria-hidden`, reduced-motion honoured in JS (Framer animates
  inline styles, so CSS alone is not enough).

---

## Known gaps — deliberate, not forgotten

- The contact form has **no backend**; it composes a real `mailto:` draft rather than faking a
  submit. A production site should move to a real form endpoint.
- The admin panel stores data in **localStorage only** — see [`docs/ADMIN.md`](docs/ADMIN.md).
- **No privacy policy.** With EU/Norwegian clients this is a GDPR requirement once the form
  collects personal data.
- No analytics.
