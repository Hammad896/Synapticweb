# Finance module

The money side of the admin panel — what the Excel workbook used to do, done in
the app: the full transaction ledger, monthly payroll with salary slips, and the
closing reports, all admin-only behind the same RLS allowlist as HR.

## One-time setup

1. **Apply the schema.** Open the Supabase SQL Editor and run
   [`docs/supabase/finance-schema.sql`](supabase/finance-schema.sql) (after the
   main `schema.sql`; it reuses `is_admin()`). Or from a terminal:

   ```bash
   SUPABASE_DB_URL="postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres" \
     node scripts/apply-schema.mjs docs/supabase/finance-schema.sql
   ```

   Idempotent — re-running is safe.

2. **Import the history — from a local checkout.** The Excel export and the
   seed generated from it hold employee PII (CNICs, phones, salaries), and this
   repo is **public** — so both are gitignored and exist only on the owner's
   machine. The production bundle deliberately ships without them.

   On the owner's machine: `npm run dev`, log in at
   `http://localhost:8080/admin` → **Finance** → **Settings** →
   **Import previous data**. Local dev talks to the LIVE Supabase project, so
   this one click puts the history on the server. It brings in the complete
   Excel export (2024-04-10 → 2026-08-03):

   - 262 ledger transactions (verbatim, including the documented quirks)
   - 15 team members — 8 Active, 7 Former — matched by name, never duplicated,
     never deleted
   - 30 payroll rows (Feb–Jul 2026) with their original slip numbers

   The import verifies itself against the workbook's totals and reports either
   *verified* or the exact discrepancy. Expected after import: net cash balance
   **PKR 144,218.18** across 262 transactions.

   Safe to re-run: rows are deduped on the export ID (`T001`…) and slip number.

## What lives where

| Screen | What it does |
|---|---|
| **Finance → Dashboard** | All-time / per-year totals, available-after-reserve, monthly income-vs-expense chart, breakdowns by category and source. |
| **Finance → Transactions** | The ledger. Add/edit/delete with date, type, category, description, amount. Filter by year, month, type, category, and text. The category dropdown follows the type. |
| **Finance → Payroll** | Generate a month's run — one editable row per **Active · Internal** employee, pre-filled from their current salary. Confirming posts one `Salary` expense per row to the ledger and links it. Editing or deleting a confirmed row keeps that ledger entry in sync. Slip PDF per row (`SYN-SS-YYYYMM-NNN`, restarts at 001 monthly, pay date defaults to the 5th of the following month). |
| **Finance → Reports** | Monthly and yearly closing tables: opening carried forward, income, expenses, net, closing — the same math as the Excel closing sheet, recomputed live. |
| **Finance → Settings** | Editable income-source and expense-category lists (rename / retire / delete — history keeps its names), the reserve amount (default 100,000), and the import button. |
| **Employees** | Now defaults to **Active**; a Former filter reveals history. Each person has a payroll type: **Internal** (monthly payroll) or **Outsource** (paid per project through the ledger). Marking someone Former removes them from future runs and keeps everything they ever had. |

## Backups & bulk upload (Excel)

- **Export:** Finance → Transactions → **Export CSV** downloads what's on
  screen (everything when no filter is active) as a UTF-8 CSV Excel opens
  directly. Finance → Payroll → **Export CSV** does the same for the whole
  payroll register, net pay included.
- **Bulk upload:** Finance → Transactions → **Upload CSV**. Required columns
  (any order, any case): `date, type, category, amount`; optional: `id,
  description`. Dates accept `YYYY-MM-DD` or day-first `DD/MM/YYYY`; amounts
  may contain thousand separators. Bad rows are listed individually and
  skipped — never the whole file. Rows with an `id` dedupe against it, so
  **re-uploading your own backup adds nothing twice**; categories seen for the
  first time are added to Settings automatically.
- The export and the importer share one format: a file can round-trip
  app → Excel → app unedited.

## Rules the code enforces

- **Reserve:** available money = all-time net balance − reserve. The reserve is
  never applied to a filtered year, only to the real balance.
- **Payroll ↔ ledger contract:** a confirmed payroll row and its Salary expense
  move together — edit one, the other follows; delete the row, the expense goes
  with it (after an explicit warning).
- **Categories are data, not code:** the dropdown lists live in
  `finance_categories` and are edited in Settings. Renaming or retiring a
  category never rewrites historical transactions — they keep the name they
  were entered with.
- **Nobody with history is hard-deleted.** Former is a status, not a missing row.
- **Salary slips** carry the exact company layout and the FBR self-filing note
  verbatim (see `src/finance/slip.ts`) — that text is policy.

## Where the numbers are tested

`src/test/finance.test.ts` replays the entire imported ledger through
`src/finance/calc.ts` and asserts the workbook's own published totals: all-time
income 11,915,314.18 / expenses 11,771,096 / net 144,218.18, the yearly
closings for 2024–2026, the recent monthly closings, and both breakdowns. If
the closing logic or the seed ever drifts from the Excel truth, `npm test`
fails.

The seed itself (`src/finance/seed/finance-seed.json`) is generated — never
hand-edited — by `node scripts/build-finance-seed.mjs`, which parses
`finance-data-for-import/` and refuses to write unless the parse reconciles.
Both are gitignored (PII in a public repo); a fresh clone without them still
builds and deploys — only the import button and `finance.test.ts` need them.
