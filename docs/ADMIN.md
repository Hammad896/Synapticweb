# Admin Panel

Sign in at **`/staff-login`** → **`/admin`**. Linked quietly from the footer ("Staff login").

**This is now backed by a real database with real authentication.** The warnings in earlier
versions of this document about localStorage and a cosmetic login no longer apply: Supabase is
configured, every table has row-level security, and access is granted by an explicit allowlist.

---

## How access actually works

1. Supabase verifies the password **on its server** and issues a JWT. Nothing is checked in
   the browser.
2. Every RLS policy calls `is_admin()`, which checks membership of the **`admins` table**.
3. **"Authenticated" is not a trust level.** A stranger who created an account would be
   authenticated and would still see nothing, because they are not in the allowlist.

Verified against the live database:

```
anonymous  →  employees / audit_log / documents / applications  →  []   (nothing at all)
anonymous  →  site_content / partners / capabilities / jobs     →  200  (public copy only)
admin JWT  →  employees / audit_log                             →  200
```

To add another admin:

```sql
insert into admins (user_id, email)
select id, email from auth.users where email = 'someone@synapticlab.com';
```

---

## Employee PII never goes in the repo

This repository is public and git history is permanent. Salaries, CNICs, phone numbers and
emergency contacts must never be committed.

Use **Employees → Import JSON**: it reads a file from your own disk straight into the database.
Template: `docs/seed-employees.example.json`. Your real file, `seed-employees.local.json`, is
gitignored.

---

## What the panel does

| Tab | |
| --- | --- |
| **Overview** | Headcount, payroll, tenure, letters issued, and the automation alerts. |
| **Employees** | Full profiles with photo. Search, filter, CSV export, ID cards, bulk import. |
| **Letters** | Draft → Issue, rendered onto the real letterhead. |
| **Register** | Every letter ever issued. Revocable, never deletable. |
| **Reports** | Headcount, payroll, attrition, tenure, probation pipeline, document register. |
| **Careers** | Post and close roles. Applications land here with a status pipeline. |
| **Website** | Announcements, partners, capabilities. |
| **Content** | Every word on the public site. |
| **Audit log** | Append-only. Who did what, when. |

See [`HR_MODULE.md`](./HR_MODULE.md) for letters, ID cards, QR verification and the
automations. See [`CONTENT.md`](./CONTENT.md) for editing the website.

---

## The one rule

**The audit log is append-only at the database level.** There is a `select` policy and an
`insert` policy, and deliberately **no `update` or `delete` policy for anyone — including
you.** A log you can rewrite is not a log.

## August 2026 additions

- **Self-service update links** (`docs/supabase/self-service.sql`): the 🔗 icon
  on any employee mints a 24-hour, single-use link; the employee fills their
  own contact/CNIC/bank/emergency details (all required except NTN) at
  `/update-info`, and the submission lands as an old→new diff awaiting
  Approve/Reject. "Add via link" onboards a new hire from just a name the same
  way. Anonymous users touch nothing but two SECURITY DEFINER functions with a
  database-side field whitelist. **Whenever a field is added to
  `SELF_SERVICE_FIELDS`, re-run `self-service.sql` in the Supabase SQL
  editor** — the deployed whitelist silently strips fields it doesn't know.
  In the edit form, values that came from the employee's own submission show
  with a green border; fields still needing a value show amber.
- **Delete protection**: an employee with payroll rows, salary transactions,
  or issued letters cannot be deleted — the app blocks with the exact counts
  and points at Former; the database enforces the same rule with ON DELETE
  RESTRICT on the payroll and document foreign keys.
- **Password recovery**: "Forgot password?" on the sign-in page emails a
  reset link (Supabase, free) landing on `/reset-password`. The admin account
  email is qhammad286@gmail.com.
- **ID cards** come in three templates — Dark, Light (default; the readable
  one in print), Brand — and show blood group when recorded.
- **The black box**: uncaught errors anywhere in the admin become
  `system.error.*` audit entries; Audit log → "Download bug report" exports
  them as JSON to hand to the AI maintaining this codebase.
