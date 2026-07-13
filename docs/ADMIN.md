# Admin Panel — Employee Records

> Route: **`/admin`**. Not linked from the public site.
>
> ## ⚠️ Read this before entering real data
>
> The panel currently stores records in the **browser's localStorage**. That means:
>
> - the data **never leaves the machine it was typed on** — no sync, no backup;
> - **clearing site data destroys it**;
> - and there is **no access control of any kind**.
>
> `Disallow: /admin` in `robots.txt` keeps it out of search results, but robots.txt is a
> *request to crawlers*, not a guard — anyone who types the URL reaches the page.
>
> **Do not enter real salaries or emergency contacts until an authenticated backend is
> wired.** With Norwegian/EU clients, employee PII also puts you in **GDPR** scope, where a
> breach is a reportable event. This is a five-minute fix (below), not a rewrite — but it has
> to happen first.

---

## Why it was built this way

A static site has no server. Any password I could put in the React code ships inside the
JavaScript bundle, where anyone can read it — a curtain, not a lock. Rather than fake
security, the panel is **fully built and fully usable**, with the storage layer isolated
behind one interface so that adding a real backend touches exactly one file.

---

## Structure

```
src/admin/
├── types.ts         ← The Employee model. Change the shape here.
├── repository.ts    ← ★ The storage seam. EmployeeRepository interface + local adapter + CSV.
├── AdminPage.tsx    ← Table, search, status filter, delete confirm, CSV export.
└── EmployeeForm.tsx ← Create/edit form.
```

### The data model (`types.ts`)

| Field | Notes |
| ----- | ----- |
| `fullName`, `role`, `department` | Department is free text, not an enum — stays flexible. |
| `status` | `active` \| `inactive` |
| `email`, `phone` | |
| `joinedAt` | ISO `YYYY-MM-DD`. Tenure is derived, never stored. |
| `salaryAmount` + `salaryCurrency` | Monthly gross. PKR/USD/EUR/NOK/GBP. |
| `emergencyContact` | `{ name, relationship, phone }` |
| `notes` | Free text. |

To add a field: add it to `Employee` and `EMPTY_DRAFT` in `types.ts`, add an input in
`EmployeeForm.tsx`, and a column in `AdminPage.tsx` if it belongs in the table.

---

## What it does today

- List every employee, sorted by name.
- Search across name, role, department, and email.
- Filter by active / inactive.
- Add, edit, and delete (with a confirm step).
- **Export CSV** — the escape hatch, so records are never trapped in one browser. Use it as
  your backup until a real database exists.
- Derived tenure ("1.4 yr", "8 mo", "New") from the join date.

---

## Making it production-safe

The UI talks **only** to the `EmployeeRepository` interface, and every method is already
`async`. So a real backend means writing one new class and changing **one line**.

**Recommended: Supabase** — Postgres + authentication + row-level security, generous free
tier, nothing to host.

1. Create a Supabase project; add an `employees` table matching `types.ts`.
2. Enable Row Level Security; add a policy so only authenticated admin users can
   `select/insert/update/delete`.
3. `npm install @supabase/supabase-js`.
4. Add `src/admin/supabase-repository.ts`:

   ```ts
   export class SupabaseEmployeeRepository implements EmployeeRepository {
     async list() { /* supabase.from("employees").select() */ }
     async create(draft) { /* ...insert */ }
     async update(id, draft) { /* ...update */ }
     async remove(id) { /* ...delete */ }
   }
   ```

5. In `repository.ts`, change the one line in `getRepository()` to return it.
6. Wrap the `/admin` route in a login gate (Supabase Auth), so an unauthenticated visitor
   sees a sign-in screen and the data is never fetched.

Keys go in `.env` as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. The anon key is safe to
ship **only because** row-level security is what actually protects the rows — without RLS,
the anon key is a public door. That is not optional.

---

## Alternatives

| Option | When it fits |
| ------ | ------------ |
| **Supabase** | Recommended. Auth + DB + RLS, no server to run. |
| **Serverless API** (Vercel functions + Postgres/Neon) | You want full control of the API surface. |
| **Keep it off the public site** | Simplest and safest: run the admin build internally, behind your own network/VPN, and never deploy `/admin` publicly. |

If none of these happen soon, the honest move is to **not deploy `/admin` at all** — build it
out of the public bundle — and keep using CSV.
