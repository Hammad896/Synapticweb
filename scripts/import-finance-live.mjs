/**
 * One-time server-side import of the Excel history into the LIVE Supabase
 * project, signed in as the admin (RLS applies — this uses no master key).
 *
 *   SB_EMAIL=admin@... SB_PASS=... node scripts/import-finance-live.mjs
 *
 * Mirrors src/finance/importSeed.ts exactly: idempotent (transactions dedupe
 * on legacy_id, payroll on slip_no, employees match by name and are never
 * duplicated or deleted), and it ends by reconciling the ledger against the
 * workbook's published totals.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(import.meta.dirname, "..");
const seed = JSON.parse(
  readFileSync(path.join(ROOT, "src", "finance", "seed", "finance-seed.json"), "utf8"),
);

const URL = "https://lhtzvyrbajlxkcvnuchw.supabase.co";
const ANON = "sb_publishable_V1IN3-d-DJCCv6uP5puzLg_YBi4LfcA";

const email = process.env.SB_EMAIL;
const password = process.env.SB_PASS;
if (!email || !password) {
  console.error("SB_EMAIL / SB_PASS are not set.");
  process.exit(1);
}

const db = createClient(URL, ANON);
const fail = (label, error) => {
  console.error(`${label}: ${error.message}`);
  process.exit(1);
};

/* ── Sign in ──────────────────────────────────────────────────────────────── */
{
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) fail("sign-in", error);
  console.log(`signed in as ${email}`);
}

/* ── 1. Categories (schema seeds them; add any that are missing) ──────────── */
{
  const { data, error } = await db.from("finance_categories").select("kind,name");
  if (error) fail("categories read", error);
  const have = new Set(data.map((c) => `${c.kind}:${c.name.toLowerCase()}`));
  const wanted = [
    ...seed.categories.incomeSources.map((n, i) => ({ kind: "income_source", name: n, sort_order: (i + 1) * 10 })),
    ...seed.categories.expenseCategories.map((n, i) => ({ kind: "expense_category", name: n, sort_order: (i + 1) * 10 })),
  ].filter((c) => !have.has(`${c.kind}:${c.name.toLowerCase()}`));
  if (wanted.length) {
    const { error: e } = await db.from("finance_categories").insert(wanted);
    if (e) fail("categories insert", e);
  }
  console.log(`categories: ${wanted.length} added, ${have.size} already present`);
}

/* ── 2. Employees, matched by name ────────────────────────────────────────── */
const { data: existingRows, error: empError } = await db.from("employees").select("*");
if (empError) fail("employees read", empError);

const byName = new Map(existingRows.map((e) => [e.full_name.trim().toLowerCase(), e]));

const nextEmployeeId = (rows, joinedAt) => {
  const year = new Date(joinedAt || Date.now()).getFullYear();
  const prefix = `SL-${year}-`;
  const highest = rows
    .map((e) => e.employee_id ?? "")
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number.parseInt(id.slice(prefix.length), 10))
    .filter((n) => Number.isFinite(n))
    .reduce((max, n) => Math.max(max, n), 0);
  return `${prefix}${String(highest + 1).padStart(3, "0")}`;
};

let created = 0;
let updated = 0;
const roster = [...existingRows];

for (const person of seed.employees) {
  const match = byName.get(person.fullName.trim().toLowerCase());
  const staffType = person.staffType === "outsource" ? "outsource" : "internal";

  if (match) {
    // Workbook is authoritative for finance facts; other fields only fill blanks.
    const { error } = await db
      .from("employees")
      .update({
        status: person.status,
        staff_type: staffType,
        salary_amount: person.salaryAmount,
        role: match.role || person.role,
        phone: match.phone || person.phone,
        cnic: match.cnic || person.cnic,
        address: match.address || person.address,
        notes: match.notes || (person.skills ? `Skills: ${person.skills}` : ""),
        emergency_name: match.emergency_name || person.emergencyName,
        emergency_phone: match.emergency_phone || person.emergencyPhone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", match.id);
    if (error) fail(`employee update ${person.fullName}`, error);
    updated++;
  } else {
    const { data, error } = await db
      .from("employees")
      .insert({
        employee_id: nextEmployeeId(roster, person.joinedAt),
        full_name: person.fullName,
        role: person.role,
        phone: person.phone,
        cnic: person.cnic,
        address: person.address,
        status: person.status,
        employment_type: "full-time",
        work_mode: "onsite",
        staff_type: staffType,
        joined_at: person.joinedAt,
        salary_amount: person.salaryAmount,
        salary_currency: "PKR",
        emergency_name: person.emergencyName,
        emergency_phone: person.emergencyPhone,
        notes: person.skills ? `Skills: ${person.skills}` : "",
      })
      .select()
      .single();
    if (error) fail(`employee insert ${person.fullName}`, error);
    roster.push(data);
    byName.set(person.fullName.trim().toLowerCase(), data);
    created++;
  }
}
console.log(`employees: ${created} created, ${updated} updated`);

/* ── 3. The ledger, deduped on legacy_id ──────────────────────────────────── */
{
  const { data, error } = await db
    .from("transactions")
    .select("legacy_id")
    .not("legacy_id", "is", null);
  if (error) fail("transactions read", error);
  const seen = new Set(data.map((r) => r.legacy_id));
  const fresh = seed.transactions.filter((t) => !seen.has(t.legacyId));
  for (let i = 0; i < fresh.length; i += 200) {
    const { error: e } = await db.from("transactions").insert(
      fresh.slice(i, i + 200).map((t) => ({
        legacy_id: t.legacyId,
        date: t.date,
        type: t.type,
        category: t.category,
        description: t.description,
        amount: t.amount,
      })),
    );
    if (e) fail("transactions insert", e);
  }
  console.log(`transactions: ${fresh.length} added, ${seen.size} already present`);
}

/* ── 4. Payroll, deduped on slip_no, linked to people + Salary rows ───────── */
{
  const { data: ledger, error: ledgerError } = await db
    .from("transactions")
    .select("id,date,type,category,description");
  if (ledgerError) fail("ledger read", ledgerError);

  const { data: existing, error } = await db.from("payroll_items").select("slip_no");
  if (error) fail("payroll read", error);
  const seen = new Set(existing.map((r) => r.slip_no));

  const rows = seed.payroll
    .filter((p) => !seen.has(p.slipNo))
    .map((p) => {
      const person = byName.get(p.employeeName.trim().toLowerCase());
      const salary = ledger.find(
        (t) =>
          t.type === "expense" &&
          t.category === "Salary" &&
          t.date === p.payDate &&
          t.description.toLowerCase().includes(p.employeeName.trim().toLowerCase()),
      );
      return {
        pay_month: p.payMonth,
        employee_id: person?.id ?? null,
        employee_name: p.employeeName,
        designation: p.designation,
        cnic: p.cnic,
        basic: p.basic,
        bonus: p.bonus,
        deduction: p.deduction,
        pay_date: p.payDate,
        payment_mode: p.paymentMode,
        slip_no: p.slipNo,
        status: "confirmed",
        transaction_id: salary?.id ?? null,
      };
    });
  if (rows.length) {
    const { error: e } = await db.from("payroll_items").insert(rows);
    if (e) fail("payroll insert", e);
  }
  console.log(`payroll: ${rows.length} added, ${seen.size} already present`);
}

/* ── 5. Reconcile against the workbook ────────────────────────────────────── */
{
  const { data, error } = await db
    .from("transactions")
    .select("type,amount,legacy_id")
    .not("legacy_id", "is", null)
    .limit(10000);
  if (error) fail("verify read", error);

  const round2 = (n) => Math.round(n * 100) / 100;
  const income = round2(data.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0));
  const expenses = round2(data.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0));
  const net = round2(income - expenses);

  const checks = [
    ["count", data.length, seed.expected.transactionCount],
    ["income", income, seed.expected.totalIncome],
    ["expenses", expenses, seed.expected.totalExpenses],
    ["net", net, seed.expected.netBalance],
  ];
  let ok = true;
  for (const [label, actual, expected] of checks) {
    const pass = actual === expected;
    if (!pass) ok = false;
    console.log(`${pass ? "OK " : "FAIL"}  ${label}: ${actual}${pass ? "" : ` (expected ${expected})`}`);
  }
  console.log(ok ? "\nVERIFIED — the live ledger matches the workbook." : "\nDISCREPANCY — see FAIL lines above.");
  process.exit(ok ? 0 : 1);
}
