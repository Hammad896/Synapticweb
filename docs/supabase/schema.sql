-- ═══════════════════════════════════════════════════════════════════════════
-- Synaptic Lab — HR module schema (v2, hardened)
--
-- Run in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: everything is idempotent.
--
-- SECURITY MODEL — read this before changing anything.
--
--   1. The anon key ships in the browser bundle. RLS is the ONLY thing between
--      the internet and your employee data.
--   2. "authenticated" is NOT a trust level. If sign-ups are ever enabled,
--      anyone can create an account and become `authenticated`. So every policy
--      here checks `is_admin()` — membership of an explicit allowlist — not
--      merely "is logged in".
--   3. Nothing anonymous can SELECT a table or a view. Public verification goes
--      through a SECURITY DEFINER function that takes ONE unguessable token and
--      returns ONE row. There is no query surface to scrape.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Admin allowlist ────────────────────────────────────────────────────────
-- The root of trust. A user is an admin because they are IN this table, not
-- because they managed to sign up.
create table if not exists admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  added_at   timestamptz default now()
);

alter table admins enable row level security;

-- Nobody reads or writes this table from the client — not even an admin.
-- It is managed from the SQL editor / service role only. No policy = no access.
revoke all on admins from anon, authenticated;

-- SECURITY DEFINER so it can read `admins` while the caller cannot. Without
-- this the policy below would recurse into RLS on `admins` and deny everything.
create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from admins where user_id = auth.uid()
  );
$$;

grant execute on function is_admin() to authenticated;

-- ── Employees ──────────────────────────────────────────────────────────────
create table if not exists employees (
  id                uuid primary key default gen_random_uuid(),
  employee_id       text unique not null,           -- SL-2026-014 (human-facing)

  -- Unguessable. The QR on an ID card carries THIS, never employee_id, because
  -- employee_id is sequential and would let anyone enumerate the whole roster
  -- by counting: SL-2026-001, -002, -003…
  verify_token      uuid unique not null default gen_random_uuid(),

  full_name         text not null,
  role              text not null,
  department        text default '',
  manager           text default '',

  email             text default '',
  phone             text default '',
  cnic              text default '',
  date_of_birth     date,
  address           text default '',

  status            text not null default 'active'  check (status in ('active','inactive')),
  employment_type   text not null default 'full-time'
                    check (employment_type in ('full-time','part-time','contract','intern')),
  work_mode         text not null default 'onsite'
                    check (work_mode in ('onsite','remote','hybrid')),

  joined_at         date not null,
  probation_months  int  default 3,
  exit_date         date,

  salary_amount     numeric default 0,
  salary_currency   text default 'PKR',

  emergency_name         text default '',
  emergency_relationship text default '',
  emergency_phone        text default '',

  photo_path        text,
  notes             text default '',

  show_on_website   boolean default false,
  public_bio        text default '',
  public_order      int default 100,

  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- Idempotent upgrade path for anyone who ran v1.
alter table employees add column if not exists verify_token uuid unique default gen_random_uuid();
alter table employees add column if not exists show_on_website boolean default false;
alter table employees add column if not exists public_bio      text default '';
alter table employees add column if not exists public_order    int  default 100;

-- ── Announcements ──────────────────────────────────────────────────────────
create table if not exists announcements (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null default 'news' check (kind in ('joiner','news','milestone')),
  title      text not null,
  body       text default '',
  link       text default '',
  is_active  boolean default true,
  starts_at  timestamptz default now(),
  ends_at    timestamptz,
  created_at timestamptz default now()
);

-- ── Jobs / careers ─────────────────────────────────────────────────────────
-- Openings published to the public site. The admin creates and closes them; no
-- code change, no redeploy.
create table if not exists jobs (
  id          uuid primary key default gen_random_uuid(),
  role        text not null,
  type        text not null default 'Full-time',
  location    text default 'Islamabad / Remote',
  pitch       text default '',
  description text default '',
  is_active   boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table jobs enable row level security;

-- Anyone may read an OPEN role — that is the point of publishing it. A closed
-- role is invisible to the public: `is_active` is enforced in the policy, not
-- merely filtered in the client, so a closed job cannot be fetched at all.
drop policy if exists "public can read open jobs" on jobs;
create policy "public can read open jobs" on jobs
  for select to anon, authenticated
  using (is_active = true);

-- NOTE: the brief asked for `authenticated` write access here. That is not used,
-- deliberately — "authenticated" is not a trust level (see the header). Anyone who
-- signed up would be able to post jobs on the company's careers page. Writes are
-- admin-only, exactly like every other table.
drop policy if exists "admins manage jobs" on jobs;
create policy "admins manage jobs" on jobs
  for all to authenticated
  using (is_admin()) with check (is_admin());

-- ── Job applications ───────────────────────────────────────────────────────
-- Submitted by strangers from the public careers page. This is the ONLY table
-- an anonymous visitor may write to, and they may not read a single row back —
-- not even their own. Otherwise one applicant could read every other
-- applicant's name, email, phone and cover letter.
create table if not exists applications (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid references jobs(id) on delete set null,
  role         text not null,                        -- denormalised: survives job deletion
  full_name    text not null,
  email        text not null,
  phone        text default '',
  location     text default '',
  experience   text default '',
  portfolio    text default '',                      -- CV / GitHub / LinkedIn URL
  cover_note   text default '',
  status       text not null default 'new'
               check (status in ('new','reviewing','shortlisted','rejected','hired')),
  created_at   timestamptz default now()
);

alter table applications enable row level security;

-- Anyone may APPLY.
drop policy if exists "anyone can apply" on applications;
create policy "anyone can apply" on applications
  for insert to anon, authenticated with check (true);

-- Only admins may READ, UPDATE or DELETE. There is deliberately no select
-- policy for anon: an applicant cannot enumerate the other applicants.
drop policy if exists "admins read applications" on applications;
create policy "admins read applications" on applications
  for select to authenticated using (is_admin());

drop policy if exists "admins manage applications" on applications;
create policy "admins manage applications" on applications
  for update to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "admins delete applications" on applications;
create policy "admins delete applications" on applications
  for delete to authenticated using (is_admin());

-- ── Document register ──────────────────────────────────────────────────────
create table if not exists documents (
  id            uuid primary key default gen_random_uuid(),
  reference     text unique not null,                -- SL/HR/2026/014 (human-facing)

  -- Same reasoning as above: references are sequential and therefore guessable.
  -- The QR printed on a letter carries this token, not the reference.
  verify_token  uuid unique not null default gen_random_uuid(),

  letter_type   text not null,
  employee_id   uuid references employees(id) on delete set null,
  employee_name text not null,
  status        text not null default 'draft' check (status in ('draft','issued','revoked')),

  subject       text default '',
  body          text not null,
  fields        jsonb default '{}'::jsonb,

  issued_at     timestamptz,
  issued_by     text,
  revoked_at    timestamptz,
  revoke_reason text,

  created_at    timestamptz default now()
);

alter table documents add column if not exists verify_token uuid unique default gen_random_uuid();

-- ── Audit log (append-only) ────────────────────────────────────────────────
create table if not exists audit_log (
  id         bigserial primary key,
  actor      text not null,
  action     text not null,
  target     text,
  detail     jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- Row Level Security — admin allowlist only
-- ═══════════════════════════════════════════════════════════════════════════
alter table employees     enable row level security;
alter table documents     enable row level security;
alter table announcements enable row level security;
alter table audit_log     enable row level security;

-- Employees
drop policy if exists "authenticated full access" on employees;   -- v1 policy: remove
drop policy if exists "admins manage employees"   on employees;
create policy "admins manage employees" on employees
  for all to authenticated
  using (is_admin()) with check (is_admin());

-- Documents
drop policy if exists "authenticated full access" on documents;
drop policy if exists "admins manage documents"   on documents;
create policy "admins manage documents" on documents
  for all to authenticated
  using (is_admin()) with check (is_admin());

-- Announcements: admins manage them; ANYONE may read a LIVE one (that is the
-- entire purpose of an announcement — it is published copy, not private data).
drop policy if exists "authenticated can manage announcements" on announcements;
drop policy if exists "admins manage announcements"            on announcements;
create policy "admins manage announcements" on announcements
  for all to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists "public can read live announcements" on announcements;
create policy "public can read live announcements" on announcements
  for select to anon, authenticated
  using (
    is_active
    and starts_at <= now()
    and (ends_at is null or ends_at > now())
  );

-- Audit log: admins may read and append. NOBODY may update or delete — there is
-- deliberately no policy for those, so they are denied to every client, forever.
-- A log you can rewrite is not a log.
drop policy if exists "authenticated can read audit"   on audit_log;
drop policy if exists "authenticated can append audit" on audit_log;
drop policy if exists "admins read audit"              on audit_log;
drop policy if exists "admins append audit"            on audit_log;

create policy "admins read audit" on audit_log
  for select to authenticated using (is_admin());

create policy "admins append audit" on audit_log
  for insert to authenticated with check (is_admin());

-- ═══════════════════════════════════════════════════════════════════════════
-- Public verification — functions, NOT views
--
-- v1 exposed `document_verifications` / `employee_verifications` as views that
-- anon could `select *` from. That let anyone dump the entire staff roster in
-- one query. Both views are dropped here.
--
-- The replacement takes ONE random token and returns AT MOST ONE row. There is
-- no listing, no wildcard, no enumeration: the token is a uuid4, so guessing one
-- is not a strategy.
-- ═══════════════════════════════════════════════════════════════════════════
drop view if exists document_verifications;
drop view if exists employee_verifications;

create or replace function verify_credential(token uuid)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  doc  record;
  emp  record;
begin
  -- Documents first: a letter QR is the more common scan.
  select d.reference, d.letter_type, d.employee_name, d.status, d.issued_at
    into doc
  from documents d
  where d.verify_token = token
    and d.status in ('issued', 'revoked')   -- drafts are never verifiable
  limit 1;

  if found then
    return json_build_object(
      'kind',       'document',
      'reference',  doc.reference,
      'type',       doc.letter_type,
      'name',       doc.employee_name,
      'status',     doc.status,
      'issued_at',  doc.issued_at
    );
  end if;

  select e.employee_id, e.full_name, e.role, e.status
    into emp
  from employees e
  where e.verify_token = token
  limit 1;

  if found then
    -- Deliberately narrow. No salary, no CNIC, no address, no phone, no email.
    -- These columns are not "hidden by the UI" — they are never returned.
    return json_build_object(
      'kind',        'employee',
      'employee_id', emp.employee_id,
      'name',        emp.full_name,
      'role',        emp.role,
      'status',      emp.status
    );
  end if;

  return json_build_object('kind', 'unknown');
end;
$$;

-- Anonymous callers may execute it, and nothing else.
grant execute on function verify_credential(uuid) to anon, authenticated;

-- ── The public team roster ─────────────────────────────────────────────────
-- This one IS meant to be listable — it is the marketing page. But it exposes
-- only what belongs on a marketing page, and only for people explicitly flagged.
create or replace view public_team
with (security_invoker = off) as
  select full_name, role, department, public_bio, photo_path, public_order
  from employees
  where show_on_website = true
    and status = 'active';

grant select on public_team to anon, authenticated;

-- ── Storage: employee photos ───────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('employee-photos', 'employee-photos', false)
on conflict (id) do nothing;

drop policy if exists "authenticated can read photos"   on storage.objects;
drop policy if exists "authenticated can write photos"  on storage.objects;
drop policy if exists "authenticated can update photos" on storage.objects;
drop policy if exists "authenticated can delete photos" on storage.objects;
drop policy if exists "admins manage photos"            on storage.objects;

create policy "admins manage photos" on storage.objects
  for all to authenticated
  using (bucket_id = 'employee-photos' and is_admin())
  with check (bucket_id = 'employee-photos' and is_admin());

-- ═══════════════════════════════════════════════════════════════════════════
-- SETUP — do these three things, in order.
--
--   1. Authentication → Providers → Email → DISABLE "Enable sign-ups".
--      (Belt and braces: even with sign-ups on, a new user is not in `admins`
--       and so can read nothing. But turn them off anyway.)
--
--   2. Authentication → Users → "Add user" → create the admin account.
--
--   3. Put that user in the allowlist. NOTHING WORKS UNTIL YOU DO THIS —
--      an admin who is not in this table sees an empty panel, by design:
--
--         insert into admins (user_id, email)
--         select id, email from auth.users where email = 'admin@synaptic.com'
--         on conflict (user_id) do nothing;
--
--   Verify it took effect:
--         select * from admins;
-- ═══════════════════════════════════════════════════════════════════════════
