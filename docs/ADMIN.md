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
