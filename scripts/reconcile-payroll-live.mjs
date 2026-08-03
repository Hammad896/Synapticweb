/**
 * One-time healer: re-links payroll rows to the Salary ledger entries that
 * still exist, and reverts to draft any row whose salary expense was deleted
 * (so "Confirm & post to ledger" can recreate it — no duplicates, no orphans).
 *
 *   SB_EMAIL=... SB_PASS=... node scripts/reconcile-payroll-live.mjs        # dry run
 *   SB_EMAIL=... SB_PASS=... node scripts/reconcile-payroll-live.mjs --apply
 *
 * Matching is deliberately cautious: a ledger entry counts as "this row's
 * salary" only if it is a Salary expense whose description mentions the
 * employee, dated inside the row's pay window (pay month start → +2 months,
 * covering edited dates like "30 Jun" for the June run), and not already
 * claimed by another payroll row. Exact pay-date matches win first.
 */
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const URL = "https://lhtzvyrbajlxkcvnuchw.supabase.co";
const ANON = "sb_publishable_V1IN3-d-DJCCv6uP5puzLg_YBi4LfcA";

const db = createClient(URL, ANON);
const { error: auth } = await db.auth.signInWithPassword({
  email: process.env.SB_EMAIL,
  password: process.env.SB_PASS,
});
if (auth) {
  console.error("sign-in failed:", auth.message);
  process.exit(1);
}

const { data: payroll, error: pe } = await db
  .from("payroll_items")
  .select("*")
  .order("pay_month");
if (pe) throw pe;

const { data: ledger, error: le } = await db
  .from("transactions")
  .select("id,date,type,category,description,amount")
  .eq("type", "expense")
  .eq("category", "Salary")
  .limit(10000);
if (le) throw le;

const ledgerById = new Map(ledger.map((t) => [t.id, t]));
const claimed = new Set(
  payroll.map((p) => p.transaction_id).filter((id) => id && ledgerById.has(id)),
);

const addMonths = (iso, months) => {
  const [y, m] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-01`;
};

const plan = [];
for (const row of payroll) {
  const linkAlive = row.transaction_id && ledgerById.has(row.transaction_id);
  if (linkAlive) continue; // healthy

  const name = row.employee_name.trim().toLowerCase();
  const windowStart = row.pay_month;
  const windowEnd = addMonths(row.pay_month, 2);

  const candidates = ledger.filter(
    (t) =>
      !claimed.has(t.id) &&
      t.description.toLowerCase().includes(name) &&
      t.date >= windowStart &&
      t.date < windowEnd,
  );
  // Exact pay-date match first, then closest amount to the row's net.
  const net = Number(row.basic) + Number(row.bonus) - Number(row.deduction);
  candidates.sort((a, b) => {
    const aExact = a.date === row.pay_date ? 0 : 1;
    const bExact = b.date === row.pay_date ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    return Math.abs(Number(a.amount) - net) - Math.abs(Number(b.amount) - net);
  });

  const match = candidates[0];
  if (match) {
    claimed.add(match.id);
    plan.push({
      slip: row.slip_no,
      name: row.employee_name,
      action: "RELINK",
      detail: `→ ${match.date} "${match.description}" ${match.amount}`,
      update: { id: row.id, transaction_id: match.id, status: "confirmed" },
    });
  } else if (row.status === "confirmed") {
    plan.push({
      slip: row.slip_no,
      name: row.employee_name,
      action: "REVERT TO DRAFT",
      detail: "no matching Salary expense in the ledger",
      update: { id: row.id, transaction_id: null, status: "draft" },
    });
  }
}

if (plan.length === 0) {
  console.log("Nothing to heal — every payroll row is consistent with the ledger.");
  process.exit(0);
}

for (const step of plan) {
  console.log(`${step.action.padEnd(16)} ${step.slip} ${step.name.padEnd(10)} ${step.detail}`);
}

if (!APPLY) {
  console.log(`\nDRY RUN — ${plan.length} change(s) planned. Re-run with --apply to write them.`);
  process.exit(0);
}

for (const step of plan) {
  const { id, ...patch } = step.update;
  const { error } = await db.from("payroll_items").update(patch).eq("id", id);
  if (error) {
    console.error(`failed on ${step.slip}:`, error.message);
    process.exit(1);
  }
}
console.log(`\nApplied ${plan.length} change(s).`);
process.exit(0);
