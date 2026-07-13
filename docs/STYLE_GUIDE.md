# Synaptic Lab — Style Guide

> The working reference for building and maintaining this site. [`00_MASTER_PROMPT.md`](./00_MASTER_PROMPT.md)
> says *what* to build and *why*; this file says *how*, concretely, with the class names to use.
>
> **The rule that governs all others: never hardcode a color, and never invent a spacing
> value.** Everything below is a token. If you need something that isn't here, add it here
> first, then use it.

---

## 1. Where things live

```
src/
  data/site.ts          ← ALL copy. Every user-facing string. Edit content HERE, never in JSX.
  index.css             ← Token layer (both themes) + the .surface/.bloom/.grain/.rule utilities
  tailwind.config.ts    ← Token → Tailwind class mapping. Also the marquee keyframes.
  hooks/use-theme.tsx   ← Theme provider. Boot script lives in index.html (pre-paint).
  components/
    Reveal.tsx          ← The ONE scroll-reveal primitive. Every section uses it.
    Logo.tsx            ← Theme-aware wordmark. Never <img> the logo directly.
    CountUp.tsx         ← Animated stat numerals.
    LiveStatus.tsx      ← Office clock + availability.
    ScrollProgress.tsx  ← Gradient read-progress hairline.
    Navbar / Footer / Layout / ThemeToggle / WhatsAppButton
    sections/           ← One file per page section. Order is set in App.tsx.
public/
  logo-light.png        ← Black wordmark, transparent. For LIGHT backgrounds.
  logo-dark.png         ← White wordmark + brand-blue prism, transparent. For DARK backgrounds.
```

**To change page order:** edit `App.tsx`. **To change any text:** edit `data/site.ts`.
**To add a nav item:** add to `NAV_LINKS` — the navbar, mobile sheet, and footer all read from it.

---

## 2. Color

### 2.1 The accent is the logo

Sampled directly from `synptic.png`. This ramp is the brand:

| Stop     | Hex       | Use                                        |
| -------- | --------- | ------------------------------------------ |
| Navy     | `#001463` | Gradient origin only.                      |
| **Core** | `#0067AE` | `bg-accent-solid` — buttons. Always white type. |
| Cyan     | `#00C2FF` | `text-accent` in dark — links, indices, eyebrows. |

**The Synapse Gradient** (`.gradient-synapse`) = `linear-gradient(90deg, #001463, #0067AE, #00C2FF)`.
It is the signature. It appears **only** as: card hover-fills, the scroll-progress bar, and
section rules. **Never** as a background wash, and **never** behind body text.

### 2.2 Tokens — use the class, never the hex

| Class                  | Dark      | Light     | Use                      |
| ---------------------- | --------- | --------- | ------------------------ |
| `bg-background`        | `#020202` | `#FBFBFD` | Page canvas              |
| `bg-card`              | `#0A0A0B` | `#FFFFFF` | Elevated surface         |
| `text-foreground`      | `#FFFFFF` | `#020202` | Primary text             |
| `text-muted-foreground`| `#8A8A8E` | `#6B6B70` | **Every** secondary line |
| `border-border`        | `#1C1C1F` | `#E4E6EB` | Hairlines only           |
| `text-accent`          | `#00C2FF` | `#005A9E` | Links, indices, eyebrows |
| `bg-accent-solid`      | `#0067AE` | `#0067AE` | Button fill (+ white type) |

**Two text colors only** — `foreground` and `muted-foreground`. There is no third gray. If a
piece of text feels like it needs one, it is either primary or secondary; decide which.

`text-accent` resolves per theme because **cyan fails contrast on white**. That is why it is a
token and not a constant. Never write `text-[#00C2FF]`.

### 2.3 Light mode obeys different physics

The classic way to wreck a light theme is to invert the dark one literally — white page, gray
cards. That reads **recessed**, like a hole. Real elevation *catches* light.

- **Dark:** elevation = a **lighter surface** (`#0A0A0B` on `#020202`). Shadows are invisible
  on near-black, so there is nothing to cast.
- **Light:** elevation = a **cast shadow**. Soft off-white canvas (`#FBFBFD`), **pure white**
  cards floating above it.
- Shadows are **tinted toward the brand navy, never neutral gray** — gray shadows are what make
  a light UI look like unstyled Bootstrap. Two layers: tight contact + wide ambient.
- This is all in `--elevation` / `--elevation-hover`, consumed by `.surface`. **One class,
  correct in both themes, zero `dark:` variants anywhere in the codebase.**

---

## 3. Typography

One typeface: SF Pro on Apple hardware, Inter everywhere else. No display/body split.

| Role              | Classes                                                        |
| ----------------- | -------------------------------------------------------------- |
| Hero headline     | `type-display text-[clamp(2.25rem,5vw,5rem)] max-w-4xl text-balance` |
| Section heading   | `type-display text-4xl md:text-6xl`                            |
| Card title        | `type-display text-2xl md:text-3xl`                            |
| Index numeral     | `type-display text-4xl tabular-nums text-accent`               |
| Body / description| `text-base leading-relaxed text-muted-foreground` + `.measure`  |
| Eyebrow           | `text-xs uppercase tracking-[0.2em] text-accent`               |
| Micro-label       | `text-xs uppercase tracking-[0.2em] text-muted-foreground`     |

- **`.type-display`** = `font-semibold leading-[0.95] tracking-[-0.04em]`. **Only above ~40px** —
  below that the tight leading reads cramped.
- **`.measure`** = ~68ch cap. Put it on every paragraph of long-form copy.
- **`tabular-nums` on every numeral** (stats, indices, durations) so digits don't jitter.

> ⚠️ **Learned the hard way:** the hero was originally `clamp(2.75rem, 8vw, 7.5rem)`. On a
> laptop that renders ~120px, wraps to four lines, fills the viewport, and **pushes the CTAs
> below the fold.** On a page whose job is to sell, the buy button outranks the type scale.
> Cap the hero at `5rem` / `max-w-4xl` and check it at 1440×900 before shipping.

---

## 4. Space & layout

- **Section rhythm:** `py-32 md:py-40`. Always. If a section feels crowded, **cut content** —
  do not shrink padding.
- **Containers:** `mx-auto max-w-7xl px-6` for grids; `max-w-5xl` / `.measure` for editorial.
- **Gap between cards:** `gap-6`. **Card padding:** `p-10 md:p-12`.
- **Radius:** `rounded-3xl` on every container. Consistency is the point.
- **Borders:** 1px, `border-border`. A border is an *edge*, never a visible gray box.

### Grids: make the columns sum exactly

The capability grid originally used spans of `4,2,2,2,4` on a **6**-column track. That packs as
`4+2 / 2+2 / 4` — leaving **two ragged holes**. If you build a multi-span grid, **do the
arithmetic**: every row must sum to the track width, or use a row list instead.

Aligned row list (the pattern that replaced it — prefer this for any indexed list):

```
grid lg:grid-cols-12 items-baseline
  index  col-span-1
  title  col-span-4
  desc   col-span-4
  detail col-span-2
  arrow  col-span-1     → 12. Exactly.
```

---

## 5. Motion

Motion confirms causality. It never entertains for its own sake.

| Interaction     | Spec                                                                   |
| --------------- | ---------------------------------------------------------------------- |
| Hover — scale   | **`hover:scale-[1.02]` is the ceiling.** No lift, no glow, no rotation. |
| Hover — fill    | `.gradient-synapse` layer, `scale-x-0 → group-hover:scale-x-100` (rows, `origin-left`) or `scale-y` (cards, `origin-bottom`) |
| Easing          | `ease-apple` = `cubic-bezier(0.16, 1, 0.3, 1)`. Fast out, long settle.  |
| Duration        | `duration-300` (small) → `duration-500` (fills, cards)                  |
| Scroll reveal   | `<Reveal index={i}>` — opacity 0→1, y 24→0, staggered, fires **once**   |
| Hero entry      | **Time-based**, not `whileInView` — the hero is already in view on load, so a scroll trigger fires instantly and reads as a glitch |

**Two hard rules:**
1. **Animate only `opacity` and `transform`.** Nothing that triggers layout.
2. **The hover fill must be a separate absolutely-positioned layer**, never a `background`
   transition — **CSS cannot interpolate between gradients.** It will snap, not sweep.

**`prefers-reduced-motion: reduce` kills all of it.** The CSS media query is not enough on its
own: Framer animates inline styles, so a `<Reveal>` would sit at `opacity: 0` forever. That is
why `Reveal`, `CountUp`, and `ScrollProgress` each check `useReducedMotion()` in JS.

---

## 6. Accessibility — this is a differentiator, not a chore

We sell engineering. A site that is flawless in a screen reader *is the portfolio piece.*
Anyone can buy a flashy template; almost nobody ships one that works blind.

- **Skip link** first in the DOM (`Layout.tsx`), visible on focus.
- **Landmarks:** `<nav aria-label>`, `<main id="main">`, `<footer>`, `<address>`. One `<h1>`.
- **Icon-only controls** (theme toggle, menu, WhatsApp) carry an `aria-label`.
- **Disclosures** (FAQ) use real `<button aria-expanded aria-controls>` + a labelled region.
- **Decorative layers** (grid, bloom, grain, progress bar, the duplicated marquee track) are all
  `aria-hidden` — a screen reader must never read the tech list twice.
- **`CountUp`** exposes the *final* value via `sr-only` and hides the animating digits, so it
  announces "150+" once instead of streaming every intermediate number.
- **Focus rings** are visible and accent-colored. Never `outline: none` without a replacement.
- **Contrast:** both themes pass AA. This is *why* `--accent` differs per theme.

---

## 7. Content rules

- **All copy lives in `data/site.ts`.** No exceptions.
- **Sell with specifics, never adjectives.** "European timezone overlap, daily" sells;
  "world-class quality" is noise.
- **No placeholders. Ever.** No lorem ipsum, no stock avatars, no `href="#"`, no invented
  clients or testimonials. The old codebase had a fake team ("Sarah Chen", "Elena Rod") and a
  fake pravatar testimonial — they were deleted, not restyled.
- **Never inflate the Norwegian relationship.** It is a *back-office engineering arm* for
  Noregna AS and Superlogics AS. Not "clients", not "offices in Oslo".
- **No portfolio section until real projects exist.** An empty grid beats invented case studies.

---

## 8. Adding a new section — the checklist

1. Copy → `data/site.ts` (an interface + a typed export).
2. Component → `src/components/sections/YourSection.tsx`.
3. Wrap blocks in `<Reveal index={i}>` for the shared reveal.
4. Shell: `<section id="your-id" className="px-6 py-32 md:py-40">` → `mx-auto max-w-7xl`.
5. Header: eyebrow (`text-accent`) → `type-display` h2 → `.measure` description.
6. Register in `App.tsx`; add to `NAV_LINKS` if it deserves nav.
7. **Check it in both themes**, at 1440×900 and at 390px wide, and with keyboard only.
8. `npm run typecheck && npm run build`.
