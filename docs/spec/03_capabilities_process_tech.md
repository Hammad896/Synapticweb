# 03 — Capabilities, Process & Technology Stack

> Inherits [`00_MASTER_PROMPT.md`](./00_MASTER_PROMPT.md). Read it first.

Act as a Senior Interaction Designer. Build the three sections that prove the firm can
actually deliver. This is where the **Redstone signature interaction** lives.

## Execute

### 1. Capabilities — an aligned numbered ROW LIST (not a bento)

The centerpiece. Redstone's numbered-service pattern, in our language.

**Do not build this as a bento grid.** It was tried and it failed: spans of `4,2,2,2,4` on a
6-column track pack as `4+2 / 2+2 / 4`, leaving two ragged holes, and the cards needed a
fixed 4rem spacer that pushed each to ~400px — a section you scrolled past instead of read.
**Alignment is the style here. The grid IS the design.**

- **One row per capability**, separated by hairlines (`border-b`, `first:border-t`).
- Each row is a **12-column grid with baseline alignment**, so every index, title,
  description, and detail column lands on the same vertical axis all the way down:
  index `col-span-1` · title `col-span-4` · description `col-span-4` · details `col-span-2`
  · hover arrow `col-span-1`. Sums to exactly 12 — no dead space, no ragged edges.
- **The hover fill — the signature move.** On a row it sweeps **horizontally**
  (`scaleX: 0 → 1`, `transform-origin: left`, 500ms, Apple curve); on a card it sweeps
  vertically. Numeral, title, and description invert to white, and the row's padding eases
  outward a few px. Implement the fill as an absolutely-positioned layer behind the content,
  **never** as a `background` transition — CSS cannot interpolate between gradients.
- Rows collapse to stacked blocks below `lg`; the detail list goes from a column to a
  wrapped inline row.
- Result: the section reads as one clean instrument panel and is roughly a **third** of the
  height of the grid it replaced.

The five product lines:

| # | Line | Sub-capabilities |
|---|------|------------------|
| 01 | Enterprise ERP Systems | Multi-entity ledgers · Role-based access · Audit trails |
| 02 | Automotive Workshop Management | Job-card lifecycle · Parts inventory · Technician dispatch |
| 03 | Automated Appointment Systems | Capacity engines · Automated reminders · Calendar sync |
| 04 | High-Throughput E-Commerce | Peak-load checkout · Payment orchestration · Fulfilment |
| 05 | Bespoke Full-Stack Engineering | Greenfield architecture · Legacy modernization · Integration |

### 2. Process — `01`–`04`

Four steps on a single hairline rail: **Discovery** (business logic and user personas) →
**Architecture** (scalable infrastructure and UI systems) → **Engineering** (clean,
performant code) → **Deployment** (launch with continuous CI/CD). Connect them with one
gradient rule, not four separate boxes.

### 3. Technology stack — tiered

Redstone tiers its stack by engagement complexity. Do the same, with **only technologies we
actually use**:

- **Foundation** — TypeScript, React, Tailwind CSS, Node.js
- **Platform** — Next.js, Express, MongoDB, PostgreSQL, REST/GraphQL APIs
- **Enterprise** — Docker, CI/CD, Cloud Infrastructure, Security Auditing, Microservices

Render the full set as **one infinite marquee** beneath the tiers: CSS `transform` only,
paused on hover, with the duplicated track marked `aria-hidden` so screen readers don't read
it twice.

## Constraints

Hover scale ceiling stays `1.02×`. The gradient fill is the *only* place large color appears
on this page. Grids must collapse cleanly: 6-col → 2-col at `md` → single column at `sm`.
