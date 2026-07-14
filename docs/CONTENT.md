# Editing the website

Everything the public site says is edited from the admin panel. **No code change, no
redeploy.** Sign in at `/staff-login`, then use these two tabs.

---

## Admin → Content

The words.

| Group | What it controls |
| ----- | ---------------- |
| **Company** | Name, email, phone, WhatsApp number, location, tagline. Feeds the footer, the contact page, the WhatsApp button, the application emails and every letter. |
| **Hero** | The headline, subheadline, eyebrow, trust-strip label, and the two buttons. |
| **Stats** | The four figures under the hero (`150+`, `99%`, …). The most load-bearing claims on the site — keep them true. |
| **Section headings** | The eyebrow / headline / description at the top of every section. |
| **Office closures** | The next one shows in the hero status bar: *"Closed 14 Aug, Independence Day"*. |
| **Team note** | The closing line on `/team`. The last thing a client reads there. |
| **FAQ** | The ten questions and answers. |

Press **Save & publish**. It is live immediately.

### Office closures, and why Eid is not in the list

Fixed-date national holidays are seeded (Pakistan Day, Independence Day, Iqbal Day…).
**Eid al-Fitr and Eid al-Adha are not**, because they move with the lunar calendar and are
announced locally. Guessing them would put a confidently wrong closure date on the homepage,
which is worse than no date at all. Add them by hand once announced.

---

## Admin → Website

The things that are lists, not sentences.

- **Announcements** — the bar under the header. Create, edit, publish, take down. With more
  than one live, it rotates through them. A visitor who dismisses one still sees the others,
  and a *new* one always shows.
- **Partners** — add, edit, hide, remove.
- **Capabilities** — the numbered product lines. Add, edit, reorder, retire.
- **Team** — read-only here. Someone appears on `/team` by ticking **"Show on the public
  website"** on their employee record.

---

## Length limits are real, and they are enforced

A capability title over 44 characters **wraps and breaks the row it sits in**. An announcement
longer than the bar gets truncated mid-word. So the limits are not advice — they are enforced
in three places that must agree:

1. the form (a live counter that turns amber, then red, and blocks submit),
2. the **database** (a `CHECK` constraint — the real backstop),
3. `src/data/limits.ts`.

If you change one, change all three.

---

## How the team page builds itself

`/team` shows employees with **"Show on the public website"** ticked. The hierarchy is
**derived from the `manager` field**, never stored twice:

- nobody above them → **Leadership** (the CEO)
- reports to the CEO → **Management**
- everyone else → **Engineering**

Only name, role, photo and public bio are published. Salary, CNIC, address, phone and
emergency contacts are *structurally unreachable* from the public site — row-level security
means they are never sent to it at all.

---

## Where the seed content lives

`src/data/site.ts` is **not** the live source any more. It is the seed: the values copied into
the database the first time the admin panel loads. After that, **the database is the only
truth** — including when a list is deliberately empty.

That last part matters. The old behaviour fell back to the built-in partners whenever the
table was empty, which meant the panel said *"No partners added"* while the website still
showed two, and you could never actually remove the last one.
