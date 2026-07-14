# HR Module — Synaptic Lab

The internal HR system: employee records, letter generation on the company letterhead,
ID cards, a document register, reports, an audit log, and a live bridge to the public website.

**Sign in:** `/staff-login` → **`/admin`**

---

## 1. Setup (once)

The module runs on **Supabase** — Postgres, real authentication, private file storage, and
Row Level Security. Without it, the panel falls back to browser-local storage and shows a
permanent warning, because local storage is not a safe place for salaries.

1. **Run the schema.** Supabase Dashboard → SQL Editor → paste all of
   [`docs/supabase/schema.sql`](./supabase/schema.sql) → Run.
2. **Close the door.** Authentication → Providers → Email → **disable "Enable sign-ups"**.
   Otherwise anyone on the internet could register an account and read every record.
3. **Create the admin.** Authentication → Users → *Add user* → e.g. `admin@synaptic.com`,
   with a password. This is now the only account that exists.
4. **Wire the keys.** In `.env`:

   ```
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon public key>
   ```

   The anon key is *meant* to be public — **but only because RLS protects the rows.** The
   schema enables it on every table. Never disable it "just to test something".

The header shows a **Supabase** badge when it is live, and **Local only** when it is not.

---

## 2. What's in it

| Tab | Does |
| --- | ---- |
| **Overview** | Headcount, payroll, average tenure, letters issued — plus the automation alerts (below). |
| **Employees** | Full profiles with photo, CNIC, address, emergency contact, salary. Search, filter, CSV export, ID cards. |
| **Letters** | Draft → Issue, rendered onto the real letterhead. |
| **Register** | Every letter ever issued, with permanent references. Revocable, never deletable. |
| **Reports** | Headcount, payroll, attrition, tenure, probation pipeline, document register. Print + CSV. |
| **Website** | Who is published to the public site, and the announcements running on it. |
| **Audit log** | Append-only record of every change: who, what, when. |

---

## 3. Letters — the Draft → Issue model

**This is the most important thing in the module to understand.**

Your `Letterhead.pdf` has the company's **real signature and stamp** on it. That means
generating a letter is not a neutral act — it mints an officially-signed company document.
So the flow is deliberately two-step:

| | **Draft** | **Issued** |
| --- | --- | --- |
| Signature & stamp | **Covered with white**, "DRAFT — NOT SIGNED" printed over it | Applied — the real ones |
| Watermark | Large diagonal "DRAFT" | None |
| Reference | None | Permanent, e.g. `SL/HR/2026/014` |
| QR code | None | Verification QR, bottom-right |
| Register | Not recorded | Written to the register + audit log |
| Reversible? | Just close it | **Never un-issued — only revoked** |

A draft therefore *cannot* be passed off as a signed letter, which is the whole safety
property. Issuing asks for explicit confirmation and tells you the reference it is about
to burn.

**Letters available:** Offer · Appointment/Joining · Internship · Internship Completion ·
Experience/Service · Relieving · Termination · Resignation Acceptance · Warning ·
Show-Cause. The last four are marked *sensitive*: they require a written reason, which is
recorded permanently.

**The PDF is generated with `pdf-lib` by embedding your actual letterhead page** — not by
recreating it. The artwork is therefore pixel-exact and can never drift from the real thing.
Swapping the letterhead = replacing `public/letterhead.pdf`.

> ⚠️ **One thing you must check on the first letter.** The text margins in
> `src/hr/pdf.ts` (`LAYOUT`) are set to clear the logo at the top and the signature block at
> the bottom. I could not visually render the PDF in this environment, so **preview one draft
> and confirm the body text doesn't collide with the artwork.** If it does, adjust only the
> numbers in `LAYOUT` — nothing else depends on them.

---

## 4. Employee IDs, ID cards, and QR verification

- **Employee ID** is assigned automatically: `SL-2026-014` — company, joining year, sequence.
  It is derived from the highest existing number *for that year*, not a row count, so deleting
  someone can never cause a collision.
- **ID card** prints at CR80 (85.6 × 54 mm) — real card size, fits a lanyard holder. Uses the
  browser's print dialog, so "Save as PDF" and card stock both work.
- **QR codes** are *self-verifying*. Scanning one opens `/verify` on the public site:
  - ID card → `…/verify?e=SL-2026-014` → name, role, and whether they are **currently staff**.
  - Letter → `…/verify?d=SL/HR/2026/014` → reference, type, recipient, issue date, validity.

The verify page is **public and unauthenticated** — a bank or a future employer must be able
to use it. It reads two narrow database views that expose *only* what proves authenticity.
**Salary, CNIC, address and phone are not hidden by the UI — they are never sent to that page
at all.** That distinction is the point.

---

## 5. Automations

These are what make it a system rather than a spreadsheet. All are **derived live** — nothing
is stored, so an alert can never go stale or contradict the record it came from.

| Automation | Why it exists |
| ---------- | ------------- |
| **Employee ID assignment** | Nobody has to remember the sequence, and it cannot collide. |
| **Probation confirmation due** | The most-missed HR deadline in a small company: someone quietly passes probation, nobody confirms it, and their terms stay ambiguous. |
| **Contract / internship expiring** | Flags at 30 days, then goes critical once it lapses. |
| **"Left but still marked active"** | A leaver left on the books keeps drawing salary in every report you run. |
| **Incomplete record** | Missing emergency contact, photo, CNIC or ID. You discover a missing emergency contact on the one day you need it. |
| **Work anniversaries & birthdays** | The good kind of alert. |
| **Publish → announce** | Ticking "Show on website" adds them to the Team section *and* posts a "has joined" announcement — but only on the transition, so editing a published employee doesn't re-announce them. |

---

## 6. The website bridge

The admin panel **drives the public site**. No code change, no redeploy.

- Tick **"Show on the public website"** on an employee → they appear in the **Team** section
  and a **"has joined"** announcement runs in the bar beneath the site header.
- The Team section reads the `public_team` view: **name, role, department, bio, photo. Nothing
  else.** Salary and personal data are structurally unreachable from the public site.
- The announcement bar is dismissible, and remembers being dismissed *per announcement*, so a
  new one still shows. A banner that reappears on every load teaches people to ignore it.
- If nobody is published, the Team section **renders nothing** — an empty "Our Team" heading is
  the worst possible look for a firm claiming to have one.

---

## 7. Audit log

Append-only, enforced at the database level: there is `select` and `insert`, and **no `update`
or `delete` policy — for anyone, including the admin.** A log you can rewrite is not a log.

Records every employee create/update/delete, every letter issued or revoked (with reason), and
every website publish/unpublish.

---

## 8. Structure

```
src/
  admin/
    AdminPage.tsx      ← Shell + tabs
    EmployeeForm.tsx   ← Profile, photo upload, publish toggle
    LetterComposer.tsx ← Draft → Issue
    Reports.tsx        ← Six reports, print + CSV
    repository.ts      ← ★ The data seam: Supabase adapter + local fallback
    types.ts           ← Employee model + ID generator
  hr/
    letters.ts         ← Letter templates (the prose lives here)
    pdf.ts             ← ★ pdf-lib rendering onto the real letterhead + LAYOUT constants
    automations.ts     ← Derived alerts
    IdCard.tsx         ← CR80 printable card
  auth/                ← Supabase auth + route guard
  pages/Verify.tsx     ← Public QR landing page
  lib/supabase.ts      ← Client (null when unconfigured → local fallback)
docs/supabase/schema.sql
public/letterhead.pdf  ← Swap this file to change the letterhead
```

---

## 9. Adding a letter type

1. Append a `LetterTemplate` to `LETTER_TEMPLATES` in `src/hr/letters.ts`. Declare the extra
   `fields` it needs; write the `build()` prose as a real letter, not a stub.
2. That's it. It appears in the composer, gets a reference on issue, and lands in the register.

Financial letters (salary certificate, payslip) and promotion/increment letters were scoped
out of this round — they are a `LETTER_TEMPLATES` entry each, nothing more.
