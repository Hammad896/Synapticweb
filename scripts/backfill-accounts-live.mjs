/**
 * One-time backfill after the account_code / txn_no migration:
 *
 *   - assigns system numbers (NNN-YYYY, chronological per year) to every
 *     transaction that has none
 *   - seeds the chart-of-accounts codes the owner specified: Salary 2998,
 *     Legal 6500, Accessories 6550, Subscription 6551, and customers
 *     (income sources) 0001, 0002, … in list order — only where empty,
 *     never overwriting a code set in the app
 *
 *   SB_EMAIL=... SB_PASS=... node scripts/backfill-accounts-live.mjs
 */
import { createClient } from "@supabase/supabase-js";

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

/* ── Account codes ────────────────────────────────────────────────────────── */
const EXPENSE_CODES = {
  Salary: "2998",
  Legal: "6500",
  Accessories: "6550",
  Subscription: "6551",
};

const { data: categories, error: ce } = await db
  .from("finance_categories")
  .select("*")
  .order("sort_order");
if (ce) throw ce;

let customerSeq = 0;
let codesSet = 0;
for (const category of categories) {
  if (category.kind === "income_source") customerSeq++;
  if (category.account_code) continue; // never overwrite the owner's edits

  const code =
    category.kind === "income_source"
      ? String(customerSeq).padStart(4, "0")
      : (EXPENSE_CODES[category.name] ?? "");
  if (!code) continue;

  const { error } = await db
    .from("finance_categories")
    .update({ account_code: code })
    .eq("id", category.id);
  if (error) throw error;
  console.log(`code ${code}  ${category.name}`);
  codesSet++;
}
console.log(`account codes set: ${codesSet}`);

/* ── Transaction numbers ──────────────────────────────────────────────────── */
const { data: transactions, error: te } = await db
  .from("transactions")
  .select("id,date,created_at,txn_no")
  .limit(10000);
if (te) throw te;

const counters = new Map();
for (const t of transactions) {
  if (!t.txn_no) continue;
  const year = t.txn_no.slice(-4);
  const n = Number.parseInt(t.txn_no, 10);
  if (Number.isFinite(n)) counters.set(year, Math.max(counters.get(year) ?? 0, n));
}

const unnumbered = transactions
  .filter((t) => !t.txn_no)
  .sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at));

let numbered = 0;
for (const t of unnumbered) {
  const year = t.date.slice(0, 4);
  const n = (counters.get(year) ?? 0) + 1;
  counters.set(year, n);
  const txnNo = `${String(n).padStart(3, "0")}-${year}`;
  const { error } = await db.from("transactions").update({ txn_no: txnNo }).eq("id", t.id);
  if (error) throw error;
  numbered++;
}
console.log(`transactions numbered: ${numbered} (of ${transactions.length} total)`);
process.exit(0);
