# 01 — Foundation: Design System, Shell & Theme Engine

> Inherits [`00_MASTER_PROMPT.md`](./00_MASTER_PROMPT.md). Read it first.

Act as a Principal Frontend Architect. Establish the token layer, the layout shell, and the
theme engine. **No page sections yet** — only the system everything else is built on.

## Execute

### 1. Token layer (`src/index.css`)

Define both themes as CSS variables. Dark is `:root`; light is `.light`.

- Neutrals — dark: `#020202` canvas / `#0A0A0B` surface / `#FFFFFF` text / `#8A8A8E` muted.
  Light: `#FBFBFD` canvas / `#FFFFFF` surface / `#020202` text / `#6B6B70` muted.
- **Light mode obeys different physics — do not invert the dark theme literally.** In dark,
  elevation is a *lighter surface* (shadows are invisible on near-black). In light, elevation
  is a *cast shadow*: a soft off-white canvas with pure-white cards **floating above** it.
  Gray cards on a white page read recessed and cheap. Expose `--elevation` and
  `--elevation-hover` — two layers (tight contact + wide ambient), **tinted toward the brand
  navy, never neutral gray** — so one `.surface` class is correct in both themes with no
  `dark:` variants. Add a `.bloom` utility (a faint radial of the accent) so light mode never
  reads as a blank sheet of paper.
- Accent, extracted from `synptic.png` — navy `#001463`, core `#0067AE`, cyan `#00C2FF`.
  Resolve it per theme: `--accent` is `#00C2FF` in dark and `#005A9E` in light (cyan fails
  contrast on white); `--accent-solid` is `#0067AE` in both, always with white type on it.
- Expose the **Synapse Gradient** as `--gradient-synapse`:
  `linear-gradient(90deg, #001463, #0067AE, #00C2FF)`.

Utilities: `.type-display` (tight leading + negative tracking, for 40px+ only), `.measure`
(~68ch cap), `.surface`, `.rule` (a gradient hairline), `.hover-fill` (the signature
bottom-up gradient sweep), and a `prefers-reduced-motion` block that kills all motion.

### 2. `tailwind.config.ts`

Map every CSS variable to a Tailwind token — `accent`, `accent-solid`, `surface`,
`background`, `foreground`, `muted-foreground`, `border`. Font stack: `-apple-system` →
`SF Pro` → `Inter` → `system-ui`. Add the Apple easing curve as `ease-apple`. Add the
marquee keyframes. **No hardcoded hex in any component — ever.**

### 3. Theme engine

- A **blocking inline script in `index.html`** that reads `localStorage`, falls back to
  `prefers-color-scheme`, and stamps `.light` on `<html>` **before first paint**. Without
  this the page flashes the wrong theme for a frame.
- A `ThemeProvider` + `useTheme()` hook that adopts whatever the boot script decided,
  persists changes, and follows the OS *only* until the user chooses explicitly.
- A `<ThemeToggle>` — icon-only, so the accessible name comes from `aria-label`.

### 4. Shell

- **Navbar:** fixed, ultra-thin (56px), `backdrop-blur-md` over `bg-background/70`, one
  hairline bottom border that resolves in on scroll. It must **not** grow or gain a shadow.
  Anchor links to each section, a theme toggle, and a "Let's talk" CTA. Mobile collapses to
  a full-screen typographic sheet that locks body scroll.
- **Layout:** `<Navbar>` + `<main>` + `<Footer>` + the floating `<WhatsAppButton>`.
- **`<Reveal>`:** the single scroll-reveal primitive for the whole site. Resolve
  `motion(tag)` at **module scope**, not inside render — doing it in render mints a new
  component identity every pass and remounts the subtree.

## Deliverable

The token layer, Tailwind config, theme engine, shell, and motion primitive. Modular and
complete. No section content.
