-- ═══════════════════════════════════════════════════════════════════════════
-- Synaptic Lab — Finance module schema (v1)
--
-- Run in the Supabase SQL Editor AFTER schema.sql (it reuses is_admin()).
-- Safe to re-run: everything is idempotent.
--
-- SECURITY MODEL — identical to the HR schema:
--   money data is admin-only. No anonymous read of any kind, no public views,
--   no verification surface. Every policy checks is_admin(), never merely
--   "authenticated".
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Employees: the two finance concepts the HR table lacked ────────────────
-- staff_type: 'internal' people are on monthly payroll; 'outsource' people are
-- paid per project through the ledger's Outsource category and never appear in
-- a payroll run. Status stays the existing active/inactive pair — the UI shows
-- them as Active/Former.
alter table employees add column if not exists staff_type text not null default 'internal';

-- When the person last got a raise. Stamped automatically when a salary is
-- increased in the app; editable in the employee form.
alter table employees add column if not exists last_raise_at date;

-- The delete rule, enforced at depth: a person with payroll rows or issued
-- documents cannot be deleted by ANY access path — app, SQL editor, script.
-- The app blocks first with a friendly message listing what's linked; these
-- constraints are the guarantee behind it.
alter table payroll_items drop constraint if exists payroll_items_employee_id_fkey;
alter table payroll_items add constraint payroll_items_employee_id_fkey
  foreign key (employee_id) references employees(id) on delete restrict;
alter table documents drop constraint if exists documents_employee_id_fkey;
alter table documents add constraint documents_employee_id_fkey
  foreign key (employee_id) references employees(id) on delete restrict;

-- Tier-1 HR record fields (2026-08): identity + payment details. Bank fields
-- feed the salary slips; blood group feeds the ID card; NTN feeds the salary
-- certificates. All fillable by the employee through a self-service link.
alter table employees add column if not exists father_name text default '';
alter table employees add column if not exists blood_group text default '';
alter table employees add column if not exists ntn        text default '';
alter table employees add column if not exists bank_name  text default '';
alter table employees add column if not exists bank_iban  text default '';

do $$ begin
  alter table employees
    add constraint employees_staff_type_check check (staff_type in ('internal','outsource'));
exception when duplicate_object then null;
end $$;

-- ── Category lists (editable in settings, seeded below) ────────────────────
create table if not exists finance_categories (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('income_source','expense_category')),
  name         text not null check (char_length(name) between 2 and 40),
  -- Chart-of-accounts code (Salary 2998, Legal 6500, customers 0001…). Free
  -- text, editable in settings.
  account_code text default '',
  sort_order   int  default 100,
  is_active    boolean default true,
  created_at   timestamptz default now(),
  unique (kind, name)
);

alter table finance_categories add column if not exists account_code text default '';

-- ── The ledger ──────────────────────────────────────────────────────────────
create table if not exists transactions (
  id          uuid primary key default gen_random_uuid(),

  -- Stable ID from the Excel export (T001…T262). Unique, so re-running the
  -- import can never duplicate a row. NULL for transactions created in-app.
  legacy_id   text unique,

  date        date not null,
  type        text not null check (type in ('income','expense')),
  -- The category NAME, denormalised on purpose: renaming or retiring a category
  -- in settings must never rewrite two years of history.
  category    text not null,
  description text default '',
  -- Free reminder text ("follow up on this", "half still owed") — shown in the
  -- app, separate from the description that goes on reports.
  notes       text default '',
  amount      numeric(14,2) not null check (amount >= 0),

  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Idempotent upgrades for databases created before these columns existed.
alter table transactions add column if not exists notes text default '';
-- System number NNN-YYYY (001-2026…), restarting each year. Assigned by the
-- app on create and backfilled chronologically for imported history.
alter table transactions add column if not exists txn_no text;
create unique index if not exists transactions_txn_no_key
  on transactions (txn_no) where txn_no is not null;

create index if not exists transactions_date_idx on transactions (date);
create index if not exists transactions_type_category_idx on transactions (type, category);

-- ── Payroll register ────────────────────────────────────────────────────────
create table if not exists payroll_items (
  id            uuid primary key default gen_random_uuid(),

  pay_month     date not null,                    -- always the 1st of the month
  employee_id   uuid references employees(id) on delete set null,
  employee_name text not null,                    -- denormalised: survives deletion
  designation   text default '',
  cnic          text default '',

  basic         numeric(12,2) not null default 0,
  bonus         numeric(12,2) not null default 0, -- bonus / allowance
  deduction     numeric(12,2) not null default 0, -- advance / deduction

  pay_date      date,
  payment_mode  text default 'Bank Transfer',
  slip_no       text unique not null,             -- SYN-SS-YYYYMM-NNN
  status        text not null default 'draft' check (status in ('draft','confirmed')),

  -- The Salary expense this row created when it was confirmed. Editing or
  -- deleting the row keeps this ledger entry in sync.
  transaction_id uuid references transactions(id) on delete set null,

  created_at    timestamptz default now()
);

create index if not exists payroll_items_month_idx on payroll_items (pay_month);

-- ── Recurring templates ─────────────────────────────────────────────────────
-- The monthly subscriptions (ChatGPT, Canva, Envato…) and any other repeating
-- entry. Posting one creates a normal ledger transaction; the template is just
-- the memory of what to post.
create table if not exists finance_recurring (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 2 and 60),
  type         text not null check (type in ('income','expense')),
  category     text not null,
  description  text default '',
  amount       numeric(14,2) not null check (amount >= 0),
  is_active    boolean default true,
  created_at   timestamptz default now()
);

alter table finance_recurring enable row level security;

drop policy if exists "admins manage recurring" on finance_recurring;
create policy "admins manage recurring" on finance_recurring
  for all to authenticated using (is_admin()) with check (is_admin());

-- ── Settings (one row) ──────────────────────────────────────────────────────
create table if not exists finance_settings (
  id         text primary key default 'main',
  -- The untouchable minimum balance. "Available" money = net balance − reserve.
  reserve    numeric(14,2) not null default 100000,
  -- The standard note printed on every salary slip (NULL = the app's default
  -- FBR self-filing text). Editable in Finance → Settings.
  slip_note  text,
  updated_at timestamptz default now()
);

insert into finance_settings (id) values ('main') on conflict (id) do nothing;

alter table finance_settings add column if not exists slip_note text;

-- ── Row Level Security — admin allowlist only, nothing public ──────────────
alter table finance_categories enable row level security;
alter table transactions       enable row level security;
alter table payroll_items      enable row level security;
alter table finance_settings   enable row level security;

drop policy if exists "admins manage finance categories" on finance_categories;
create policy "admins manage finance categories" on finance_categories
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "admins manage transactions" on transactions;
create policy "admins manage transactions" on transactions
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "admins manage payroll" on payroll_items;
create policy "admins manage payroll" on payroll_items
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "admins manage finance settings" on finance_settings;
create policy "admins manage finance settings" on finance_settings
  for all to authenticated using (is_admin()) with check (is_admin());

-- ── Seed the category lists ─────────────────────────────────────────────────
insert into finance_categories (kind, name, sort_order) values
  ('income_source', 'Qamar',   10),
  ('income_source', 'Hammad',  20),
  ('income_source', 'Waleed',  30),
  ('income_source', 'Others',  40),
  ('expense_category', 'Salary',       10),
  ('expense_category', 'Outsource',    20),
  ('expense_category', 'Subscription', 30),
  ('expense_category', 'Social Media', 40),
  ('expense_category', 'Legal',        50),
  ('expense_category', 'Accessories',  60),
  ('expense_category', 'Bonus',        70),
  ('expense_category', 'Loan',         80),
  ('expense_category', 'Other',        90)
on conflict (kind, name) do nothing;
