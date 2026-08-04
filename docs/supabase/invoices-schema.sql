-- ═══════════════════════════════════════════════════════════════════════════
-- Synaptic Lab — Customers & Invoices schema
--
-- Run in the Supabase SQL Editor AFTER finance-schema.sql (reuses is_admin()).
-- Idempotent; safe to re-run.
--
-- SECURITY MODEL — identical to the rest of finance: admin-only, RLS on
-- everything, no anonymous surface of any kind.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Customers ───────────────────────────────────────────────────────────────
create table if not exists clients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique check (char_length(name) between 2 and 80),
  -- Billing block printed under the name; one address line per text line.
  address       text default '',
  email         text default '',
  -- Default currency for this customer's invoices (NOK, USD, PKR…).
  currency      text not null default 'PKR',
  -- The ledger income source their payments post to (a finance_categories
  -- income_source NAME, denormalised like transaction categories are).
  income_source text default '',
  notes         text default '',
  is_active     boolean default true,
  created_at    timestamptz default now()
);

-- ── Invoices ────────────────────────────────────────────────────────────────
create table if not exists invoices (
  id             uuid primary key default gen_random_uuid(),

  -- INV-00217… — the sequence continues from the old tool's last invoice
  -- (INV-00216). Suggested by the app, editable before saving, unique forever.
  invoice_no     text not null unique,

  -- A customer with invoices cannot be deleted (same delete-protection rule
  -- as employees with payroll). The app blocks first with a friendly message.
  client_id      uuid references clients(id) on delete restrict,
  -- Snapshot at issue time: the invoice reads as issued even if the customer
  -- record is later edited.
  client_name    text not null,
  client_address text default '',

  date           date not null,
  terms          text default 'Net 30',
  due_date       date,
  -- The INVOICE currency (what the customer pays in), not the books' PKR.
  currency       text not null default 'PKR',

  -- [{"description": "IT Support Services", "qty": 1, "rate": 12780}, …]
  lines          jsonb not null default '[]',
  -- Printed under the table — bank details by default.
  notes          text default '',

  status         text not null default 'draft' check (status in ('draft','sent','paid')),

  -- The income ledger entry created when payment was recorded. Deleting that
  -- transaction reverts the invoice to 'sent' (app-enforced, audited).
  transaction_id uuid references transactions(id) on delete set null,
  -- What actually landed in the bank, in PKR — that is what the books hold.
  paid_amount    numeric(14,2) not null default 0,
  paid_date      date,

  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create index if not exists invoices_client_idx on invoices (client_id);
create index if not exists invoices_status_idx on invoices (status);

-- ── Row Level Security — admin allowlist only ───────────────────────────────
alter table clients  enable row level security;
alter table invoices enable row level security;

drop policy if exists "admins manage clients" on clients;
create policy "admins manage clients" on clients
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "admins manage invoices" on invoices;
create policy "admins manage invoices" on invoices
  for all to authenticated using (is_admin()) with check (is_admin());

-- ── What every invoice says about US ────────────────────────────────────────
-- The "Bill From" block printed under the letterhead logo, and the default
-- notes (bank details) prefilled into each new invoice. Both editable in
-- Finance → Settings, because an address change must not need a code change.
alter table finance_settings add column if not exists invoice_from text;
alter table finance_settings add column if not exists invoice_note text;

-- ── Seed the first customer — the remittance sender ─────────────────────────
insert into clients (name, address, currency, income_source) values (
  'Superlogics AS',
  E'c/o Regnskapskontoret Oslo AS\nØstre Aker vei 17\n0581 Oslo\nNorway',
  'NOK',
  'Others'
) on conflict (name) do nothing;
