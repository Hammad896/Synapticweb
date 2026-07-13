# Synaptic Lab

The corporate website for **Synaptic Lab** — an enterprise software engineering firm based in
Islamabad, operating as the back-office engineering arm for Norwegian software companies
(Noregna AS, Superlogics AS) and building independent platforms end to end.

A single-page React site: high-contrast, motion-forward, dual-theme, and built to sell.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:8080
```

| Script              | Does                                        |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Dev server on :8080                         |
| `npm run build`     | Production build → `dist/`                  |
| `npm run preview`   | Serve the production build                  |
| `npm run typecheck` | `tsc --noEmit`                              |
| `npm run lint`      | ESLint                                      |
| `npm test`          | Vitest                                      |

**Stack:** React 18 · TypeScript · Vite · Tailwind CSS · Framer Motion. Six runtime
dependencies, no UI kit.

---

## Documentation — read before changing anything

| Doc | What it's for |
| --- | ------------- |
| [`docs/STYLE_GUIDE.md`](docs/STYLE_GUIDE.md) | **Start here.** Tokens, typography, spacing, motion, a11y, and the checklist for adding a section. |
| [`docs/00_MASTER_PROMPT.md`](docs/00_MASTER_PROMPT.md) | The governing spec — design language, verified company data, what the site must never claim. |
| [`docs/01_foundation.md`](docs/01_foundation.md) | Design system, theme engine, shell. |
| [`docs/02_hero_engagements_team.md`](docs/02_hero_engagements_team.md) | Hero, engagement models, team. |
| [`docs/03_capabilities_process_tech.md`](docs/03_capabilities_process_tech.md) | Capabilities, process, technology tiers. |
| [`docs/04_faq_contact_footer.md`](docs/04_faq_contact_footer.md) | FAQ, contact, WhatsApp, footer. |

---

## The two rules that matter most

1. **All copy lives in [`src/data/site.ts`](src/data/site.ts).** Never inline a user-facing
   string in JSX. To change any text on the site, edit that one file.
2. **Never hardcode a color.** Every color is a CSS variable resolved per theme — the brand
   accent is *cyan* on dark and a *deeper blue* on light, because cyan fails contrast on white.
   Use `text-accent` / `bg-accent-solid` / `bg-card`, never a hex.

---

## Brand

The accent is sampled from the logo itself: navy `#001463` → core `#0067AE` → cyan `#00C2FF`.
That ramp — the **Synapse Gradient** — is the signature, and it appears only as card
hover-fills, the scroll-progress bar, and section rules.

The wordmark ships as two transparent variants generated from `synptic.png`:
`public/logo-light.png` (black letterforms) and `public/logo-dark.png` (white letterforms, prism
gradient preserved). The `<Logo>` component picks the right one per theme — never `<img>` the
logo directly, and never recolor it with a CSS filter.

---

## Content policy

No placeholders, ever. No lorem ipsum, no stock avatars, no invented clients, no dead links.
No portfolio section until there are real projects to show. And the Norwegian relationship is
stated precisely — a **back-office engineering arm**, never inflated into "clients" or
"offices in Oslo".
