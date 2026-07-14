# Deployment

## Vercel settings

Importing the repo from GitHub, the answers are:

| Field | Value |
| ----- | ----- |
| **Framework preset** | **Vite** (Vercel detects this correctly) |
| **Root directory** | `./` |
| **Build command** | `npm run build` (leave as the preset default) |
| **Output directory** | `dist` |
| **Branch** | **`main`** for production. Add `dev` as a preview branch. |

Everything else is already handled by [`vercel.json`](../vercel.json) in the repo:

- **SPA rewrites.** Without them, every route except `/` returns a hard 404 on
  Vercel. `/team`, `/careers`, `/verify` and `/admin` are client-side routes; there is
  no file at those paths, so the rewrite sends everything that is not an asset to
  `index.html` and lets React Router resolve it. This is the single most common way a
  working Vite SPA "breaks" on its first deploy.
- Security headers (`nosniff`, `DENY` framing, referrer policy).
- Immutable caching for hashed assets.

## Environment variables (required — the build FAILS without them)

Add these in Vercel → Project → Settings → Environment Variables, for **Production**
*and* **Preview**:

| Name | Value |
| ---- | ----- |
| `VITE_SUPABASE_URL` | `https://lhtzvyrbajlxkcvnuchw.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | the `sb_publishable_…` key |
| `VITE_WEB3FORMS_KEY` | *(optional)* a free key from web3forms.com — without it, job applications fall back to opening the visitor's mail client |

**The production build deliberately refuses to run without the Supabase keys.**
That is not an obstacle, it is the point: a build without them silently produces an
app that stores employee records in whatever browser opens it, behind a password
embedded in the JavaScript. That failure is invisible until it matters, so the build
stops instead.

Do **not** add `VITE_ADMIN_EMAIL` / `VITE_ADMIN_PASSWORD` to Vercel. They only exist
for the offline dev gate, and with Supabase configured they are never used.

## Is the anon key safe to ship?

Yes — **and only because Row Level Security is switched on for every table.** The key
is designed to be public; it identifies the project, it does not grant access. RLS is
what decides who may read a row. Verified on the live database:

```
anonymous  →  employees / audit_log / documents / applications  →  []   (nothing)
anonymous  →  site_content / partners / capabilities / jobs     →  200  (public copy)
admin JWT  →  employees / audit_log                             →  200
```

If anyone ever disables RLS "just to test something", the anon key becomes a public
door to every salary in the company. It is not optional.

## The database

Already applied and live. To re-apply after a schema change (it is idempotent):

```bash
SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/supabase-setup.mjs
```

That script applies `docs/supabase/schema.sql`, lists the tables, **asserts RLS is on
for every one of them**, and reports the admin allowlist. It exits non-zero if any
table is unprotected.

## Admin access

Sign in at `/staff-login` → `/admin`.

The account is `admin@synaptic.com`. The password was generated at setup and given to
you directly — it is deliberately **not** in this repository, and it is deliberately
**not** the old `synaptic896`, which was committed to a public repo and therefore must
be treated as burned forever.

Access is controlled by the `admins` table, not by "being logged in". Supabase
sign-ups are irrelevant to it: a stranger who somehow created an account would not be
in the allowlist, and would see nothing.

To add another admin:

```sql
insert into admins (user_id, email)
select id, email from auth.users where email = 'someone@synapticlab.com';
```

## Branches

- **`dev`** — where work lands first.
- **`main`** — production. Merge `dev` into it once a change is confirmed.

```bash
git checkout main && git merge dev && git push origin main
```
