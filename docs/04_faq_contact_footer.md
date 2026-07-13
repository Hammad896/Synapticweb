# 04 — FAQ, Contact, WhatsApp & Footer

> Inherits [`00_MASTER_PROMPT.md`](./00_MASTER_PROMPT.md). Read it first.

Act as a Lead QA and Frontend Polisher. Close the page out, wire the real contact channels,
and leave the repo lean.

## Execute

### 1. FAQ accordion

Six disclosures, built on native `<button aria-expanded>` semantics (or Radix Accordion —
already a dependency). Each row is a hairline; the trigger is typographic, large, and the
indicator rotates 45° rather than swapping icons.

Cover: **pricing model**, **timelines**, **the engagement process**, **post-launch support**,
**how estimates are produced**, and **who owns the code** (answer: the client does — outright).

The FAQ's job is **(c) make it easy to start** — it exists to remove the last objections
standing between a serious buyer and an email. Every answer should read like a commercial
term someone can act on, not a marketing paragraph. If an answer doesn't dissolve a real
hesitation (cost, risk, lock-in, speed), cut it and write one that does.

Answers are written from the firm's actual practice. **The client reviews every answer before
launch** — flag them as draft in the handoff, not on the page.

### 2. Contact — the enterprise endpoint

- Strictly typographic form: borderless inputs on **ultra-thin underlines** that resolve to
  the accent on focus. No boxed fields, no filled inputs, no drop shadows.
- Fields: Name, Email, and "The system" (a brief). All labelled and required.
- **There is no backend.** Do not fake a POST and do not fake a success toast — compose a
  real `mailto:` draft to **`qhammad286@gmail.com`**. It is honest and it works today; when
  an API exists, only `handleSubmit` changes.
- Alongside the form: the email, the WhatsApp number, and the location as a real
  `<address>` block.

### 3. WhatsApp button

Persistent, floating, bottom-right, above all content.

- Number: **`+92 313 9676896`** → `https://wa.me/923139676896` with a pre-filled enquiry
  message, `target="_blank"`, `rel="noopener noreferrer"`.
- **Styled in the site's own language** — near-black/charcoal with a hairline border and the
  brand accent on hover. **Not** the stock green bubble, and **no pulsing ping animation**;
  both belong to a different design system and would be the loudest thing on the page.
- Expands to reveal a "Chat with us" label on hover. `aria-label` on the anchor.

### 4. Footer

Minimal and typographic: brand, tagline, section anchors, real contact channels, hairline
rule, copyright. No social icons that link to `#`.

### 5. Final pass — leave the repo lean

- Delete every orphaned component, unused shadcn UI primitive, and dead route. Every file in
  `src/` must be reachable from `App.tsx`.
- Verify semantic tags, one `<h1>`, labelled controls, and visible focus rings.
- Confirm all motion is `opacity`/`transform` only and dies under `prefers-reduced-motion`.
- `tsc --noEmit` and `npm run build` must both pass clean. Then run the dev server and
  actually look at it in both themes.

## Deliverable

The complete, integrated single-page site. No missing references, no incomplete functions,
no placeholders.
