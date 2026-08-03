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

do $$ begin
  alter table employees
    add constraint employees_staff_type_check check (staff_type in ('internal','outsource'));
exception when duplicate_object then null;
end $$;

-- ── Category lists (editable in settings, seeded below) ────────────────────
create table if not exists finance_categories (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('income_source','expense_category')),
  name       text not null check (char_length(name) between 2 and 40),
  sort_order int  default 100,
  is_active  boolean default true,
  created_at timestamptz default now(),
  unique (kind, name)
);

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

-- Idempotent upgrade for databases created before notes existed.
alter table transactions add column if not exists notes text default '';

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

-- ── Settings (one row) ──────────────────────────────────────────────────────
create table if not exists finance_settings (
  id         text primary key default 'main',
  -- The untouchable minimum balance. "Available" money = net balance − reserve.
  reserve    numeric(14,2) not null default 100000,
  updated_at timestamptz default now()
);

insert into finance_settings (id) values ('main') on conflict (id) do nothing;

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
