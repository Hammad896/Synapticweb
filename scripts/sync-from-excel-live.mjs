/**
 * Syncs the LIVE database from the owner's Excel workbook
 * (finance-data-for-import/Synaptic Lab - Finance Manager.xlsx, pre-dumped to
 * graphify-out/.excel_dump.json by openpyxl).
 *
 *   SB_EMAIL=... SB_PASS=... node scripts/sync-from-excel-live.mjs           # dry run
 *   SB_EMAIL=... SB_PASS=... node scripts/sync-from-excel-live.mjs --apply
 *
 * What it does:
 *   - Transactions: multiset-diff on (date,type,category,description,amount).
 *     Missing rows are inserted with fresh NNN-YYYY numbers. Extra DB rows are
 *     REPORTED, never deleted automatically.
 *   - Team: matches people by name tokens (so "Hammad" ↔ "Hammad Sohail"),
 *     updates name/role/status/type/salary, fills blank contact fields.
 *   - Payroll: inserts register rows whose slip number is missing.
 * Idempotent: a second run finds nothing to do.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const db = createClient(
  "https://lhtzvyrbajlxkcvnuchw.supabase.co",
  "sb_publishable_V1IN3-d-DJCCv6uP5puzLg_YBi4LfcA",
);
{
  const { error } = await db.auth.signInWithPassword({
    email: process.env.SB_EMAIL,
    password: process.env.SB_PASS,
  });
  if (error) { console.error("sign-in failed:", error.message); process.exit(1); }
}

const dump = JSON.parse(readFileSync("graphify-out/.excel_dump.json", "utf8"));

/* ── 1. Transactions ──────────────────────────────────────────────────────── */
const excelTx = dump.Transactions.slice(1)
  .filter((r) => r[0] && r[1])
  .map((r) => ({
    date: r[0],
    type: String(r[1]).toLowerCase(),
    category: String(r[2] ?? "").trim(),
    description: String(r[3] ?? "").trim(),
    amount: r[4],
  }));
const skipped = excelTx.filter((t) => typeof t.amount !== "number");
const validTx = excelTx.filter((t) => typeof t.amount === "number");
for (const s of skipped) {
  console.log(`SKIP (no amount): ${s.date} ${s.type} ${s.category} "${s.description}"`);
}

const key = (t) =>
  `${t.date}|${t.type}|${t.category.toLowerCase()}|${t.description.toLowerCase()}|${Math.round(Number(t.amount) * 100)}`;

const { data: dbTx, error: te } = await db
  .from("transactions")
  .select("id,txn_no,date,type,category,description,amount")
  .limit(10000);
if (te) throw te;

const dbCount = new Map();
for (const t of dbTx) {
  const k = key({ ...t, description: t.description ?? "" });
  dbCount.set(k, (dbCount.get(k) ?? 0) + 1);
}
const remaining = new Map(dbCount);
const toInsert = [];
for (const t of validTx) {
  const k = key(t);
  const n = remaining.get(k) ?? 0;
  if (n > 0) remaining.set(k, n - 1);
  else toInsert.push(t);
}
const extras = [];
for (const t of dbTx) {
  const k = key({ ...t, description: t.description ?? "" });
  const n = remaining.get(k) ?? 0;
  if (n > 0) { extras.push(t); remaining.set(k, n - 1); }
}

console.log(`\nexcel valid rows: ${validTx.length} | db rows: ${dbTx.length}`);
console.log(`to INSERT: ${toInsert.length}`);
for (const t of toInsert) console.log(`  + ${t.date} ${t.type} ${t.category} "${t.description}" ${t.amount}`);
console.log(`db rows NOT in excel (reported only, NOT deleted): ${extras.length}`);
for (const t of extras) console.log(`  ? ${t.txn_no ?? ""} ${t.date} ${t.type} ${t.category} "${t.description}" ${t.amount}`);

/* ── 2. Team ──────────────────────────────────────────────────────────────── */
const teamRows = dump.Team.slice(4).filter((r) => r && r[0]);
const excelTeam = teamRows.map((r) => ({
  name: String(r[0]).trim(),
  status: String(r[1]).trim() === "Active" ? "active" : "inactive",
  staffType: String(r[2] ?? "Internal").trim().toLowerCase(),
  role: String(r[3] ?? "").trim(),
  salary: Number(String(r[4] ?? "0").replace(/[^\d]/g, "")) || 0,
  phone: String(r[5] ?? "").trim(),
  cnic: String(r[6] ?? "").trim(),
  address: String(r[7] ?? "").trim(),
  skills: String(r[8] ?? "").trim(),
  emergencyPhone: String(r[9] ?? "").trim(),
  emergencyName: String(r[10] ?? "").trim(),
}));

const { data: employees, error: ee } = await db.from("employees").select("*");
if (ee) throw ee;

const tokens = (name) =>
  name.toLowerCase().replace(/\./g, "").split(/\s+/).filter((t) => t.length > 1);
const matches = (a, b) => {
  const ta = tokens(a); const tb = tokens(b);
  return ta.some((x) => tb.includes(x)) &&
    (ta.every((x) => tb.includes(x)) || tb.every((x) => ta.includes(x)));
};

const teamPlan = [];
for (const person of excelTeam) {
  const match = employees.find((e) => matches(e.full_name, person.name));
  if (!match) {
    teamPlan.push({ action: "CREATE", person });
    continue;
  }
  const patch = {};
  if (match.full_name !== person.name) patch.full_name = person.name;
  if (match.status !== person.status) patch.status = person.status;
  if (match.staff_type !== person.staffType) patch.staff_type = person.staffType;
  if (person.role && match.role !== person.role) patch.role = person.role;
  if (person.salary && Number(match.salary_amount) !== person.salary) patch.salary_amount = person.salary;
  for (const [from, to] of [
    ["phone", "phone"], ["cnic", "cnic"], ["address", "address"],
    ["emergencyPhone", "emergency_phone"], ["emergencyName", "emergency_name"],
  ]) {
    if (person[from] && !match[to]) patch[to] = person[from];
  }
  if (Object.keys(patch).length) teamPlan.push({ action: "UPDATE", id: match.id, name: match.full_name, patch });
}
console.log(`\nteam changes: ${teamPlan.length}`);
for (const p of teamPlan) {
  console.log(`  ${p.action} ${p.name ?? p.person.name}:`, JSON.stringify(p.patch ?? p.person).slice(0, 160));
}

/* ── 3. Payroll ───────────────────────────────────────────────────────────── */
const payrollRows = dump.Payroll.slice(4).filter((r) => r && r[0] && r[10]);
const { data: dbPayroll, error: pe } = await db.from("payroll_items").select("slip_no");
if (pe) throw pe;
const haveSlips = new Set(dbPayroll.map((p) => p.slip_no));
const newPayroll = payrollRows
  .filter((r) => !haveSlips.has(String(r[10]).trim()))
  .map((r) => ({
    pay_month: r[0],
    employee_name: String(r[1]).trim(),
    designation: String(r[2] ?? "").trim(),
    cnic: String(r[3] ?? "").replace(/^0$/, "").trim(),
    basic: Number(r[4]) || 0,
    bonus: Number(r[5]) || 0,
    deduction: Number(r[6]) || 0,
    pay_date: r[8],
    payment_mode: String(r[9] ?? "Bank Transfer").trim(),
    slip_no: String(r[10]).trim(),
    status: "confirmed",
  }));
console.log(`\npayroll rows to insert: ${newPayroll.length}`);
for (const p of newPayroll) console.log(`  + ${p.slip_no} ${p.employee_name} ${p.basic}`);

if (!APPLY) {
  console.log("\nDRY RUN — re-run with --apply to write.");
  process.exit(0);
}

/* ── APPLY ────────────────────────────────────────────────────────────────── */

// Transactions: number then insert, chronologically for stable sequences.
const counters = new Map();
for (const t of dbTx) {
  if (!t.txn_no) continue;
  const year = t.txn_no.slice(-4);
  const n = Number.parseInt(t.txn_no, 10);
  if (Number.isFinite(n)) counters.set(year, Math.max(counters.get(year) ?? 0, n));
}
toInsert.sort((a, b) => a.date.localeCompare(b.date));
const rows = toInsert.map((t) => {
  const year = t.date.slice(0, 4);
  const n = (counters.get(year) ?? 0) + 1;
  counters.set(year, n);
  return {
    txn_no: `${String(n).padStart(3, "0")}-${year}`,
    date: t.date,
    type: t.type,
    category: t.category,
    description: t.description,
    amount: t.amount,
    notes: "",
  };
});
if (rows.length) {
  const { error } = await db.from("transactions").insert(rows);
  if (error) throw error;
}
console.log(`inserted ${rows.length} transactions`);

const nextEmployeeId = () => {
  const year = new Date().getFullYear();
  const prefix = `SL-${year}-`;
  const highest = employees
    .map((e) => e.employee_id ?? "")
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number.parseInt(id.slice(prefix.length), 10))
    .filter((n) => Number.isFinite(n))
    .reduce((max, n) => Math.max(max, n), 0);
  return `${prefix}${String(highest + 1).padStart(3, "0")}`;
};

for (const p of teamPlan) {
  if (p.action === "UPDATE") {
    const { error } = await db
      .from("employees")
      .update({ ...p.patch, updated_at: new Date().toISOString() })
      .eq("id", p.id);
    if (error) throw error;
  } else {
    const person = p.person;
    const row = {
      employee_id: nextEmployeeId(),
      full_name: person.name,
      role: person.role,
      status: person.status,
      staff_type: person.staffType,
      employment_type: "full-time",
      work_mode: "onsite",
      joined_at: "2024-04-01", // company's first ledger month; edit in the app
      salary_amount: person.salary,
      salary_currency: "PKR",
      phone: person.phone,
      cnic: person.cnic,
      address: person.address,
      emergency_phone: person.emergencyPhone,
      emergency_name: person.emergencyName,
      notes: person.skills ? `Skills: ${person.skills}` : "",
    };
    const { data, error } = await db.from("employees").insert(row).select().single();
    if (error) throw error;
    employees.push(data);
    console.log(`created ${row.employee_id} ${row.full_name}`);
  }
}
console.log(`applied ${teamPlan.filter((p) => p.action === "UPDATE").length} team updates`);

if (newPayroll.length) {
  const { data: people } = await db.from("employees").select("id,full_name");
  const withIds = newPayroll.map((p) => ({
    ...p,
    employee_id: people.find((e) => matches(e.full_name, p.employee_name))?.id ?? null,
  }));
  const { error } = await db.from("payroll_items").insert(withIds);
  if (error) throw error;
}
console.log(`inserted ${newPayroll.length} payroll rows`);

/* ── Verify against the workbook dashboard ────────────────────────────────── */
const { data: after } = await db.from("transactions").select("type,amount").limit(10000);
const r2 = (n) => Math.round(n * 100) / 100;
const income = r2(after.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0));
const expenses = r2(after.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0));
console.log(`\nAFTER: ${after.length} rows | income ${income} | expenses ${expenses} | net ${r2(income - expenses)}`);
console.log("workbook says: 262 valid | income 11915314.18 | expenses 11771096 | net 144218.18");
process.exit(0);
