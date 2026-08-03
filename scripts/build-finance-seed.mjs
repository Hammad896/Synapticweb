/**
 * Parses finance-data-for-import/ (the Excel export, as markdown) into
 * src/finance/seed/finance-seed.json — the payload behind the admin panel's
 * one-click "Import previous data" button.
 *
 *   node scripts/build-finance-seed.mjs
 *
 * The script refuses to write the seed unless the parsed data reconciles with
 * the totals published in 04-BUSINESS-RULES.md, so a parsing bug can never
 * become a silently wrong ledger.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "finance-data-for-import");
const OUT = path.join(ROOT, "src", "finance", "seed", "finance-seed.json");

/* ── Reconciliation targets from 04-BUSINESS-RULES.md ─────────────────────── */
const EXPECTED = {
  transactionCount: 262,
  totalIncome: 11_915_314.18,
  totalExpenses: 11_771_096,
  netBalance: 144_218.18,
  employeeCount: 15,
  activeCount: 8,
  payrollRowCount: 30,
};

/* ── CSV parser (quoted fields, embedded commas) ──────────────────────────── */
const parseCsvLine = (line) => {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else current += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { fields.push(current); current = ""; }
    else current += ch;
  }
  fields.push(current);
  return fields;
};

/* ── Transactions ─────────────────────────────────────────────────────────── */
const txMd = readFileSync(path.join(SRC, "02-TRANSACTIONS.md"), "utf8").replace(/\r\n/g, "\n");
const csvMatch = txMd.match(/```csv\n([\s\S]*?)```/);
if (!csvMatch) throw new Error("No ```csv block found in 02-TRANSACTIONS.md");

const [header, ...lines] = csvMatch[1].trim().split("\n");
if (header.trim() !== "id,date,type,category,description,amount") {
  throw new Error(`Unexpected CSV header: ${header}`);
}

const transactions = lines.map((line) => {
  const [legacyId, date, type, category, description, amount] = parseCsvLine(line.trim());
  if (!/^T\d{3}$/.test(legacyId)) throw new Error(`Bad legacy id: ${legacyId}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Bad date on ${legacyId}: ${date}`);
  if (type !== "Income" && type !== "Expense") throw new Error(`Bad type on ${legacyId}: ${type}`);
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) throw new Error(`Bad amount on ${legacyId}: ${amount}`);
  return {
    legacyId,
    date,
    type: type.toLowerCase(),
    category,
    description,
    amount: value,
  };
});

/* ── Markdown table parser ────────────────────────────────────────────────── */
const dash = (v) => (v === "—" || v === "-" || v === "0" ? "" : v);

const parseTable = (markdown, headingPattern) => {
  const section = markdown.split(headingPattern)[1];
  if (!section) throw new Error(`Section ${headingPattern} not found`);
  const rows = [];
  for (const line of section.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) {
      if (rows.length > 0) break; // table ended
      continue; // prose before the table
    }
    if (/^\|[\s\-|]+\|$/.test(trimmed)) continue; // separator row
    rows.push(trimmed.slice(1, -1).split("|").map((c) => c.trim()));
  }
  return { header: rows[0], rows: rows.slice(1) };
};

/* ── Employees ────────────────────────────────────────────────────────────── */
const empMd = readFileSync(path.join(SRC, "03-EMPLOYEES-AND-PAYROLL.md"), "utf8").replace(/\r\n/g, "\n");
const team = parseTable(empMd, "## Team Directory");

const employees = team.rows.map((cells) => {
  const [name, status, type, role, salary, contact, cnic, location, skills, emgPhone, emgName] = cells;
  const salaryNumber = Number((salary.match(/[\d]+/g) ?? ["0"]).join("")) || 0;
  return {
    fullName: name,
    status: status === "Active" ? "active" : "inactive",
    staffType: type.toLowerCase(), // internal | outsource
    role,
    salaryAmount: salaryNumber,
    phone: dash(contact),
    cnic: dash(cnic),
    address: dash(location),
    skills: dash(skills),
    emergencyPhone: dash(emgPhone),
    emergencyName: dash(emgName),
  };
});

/* ── Payroll register ─────────────────────────────────────────────────────── */
const register = parseTable(empMd, "## Payroll Register");

const payroll = register.rows.map((cells) => {
  const [payMonth, employee, designation, cnic, basic, bonus, deduction, net, payDate, mode, slipNo] = cells;
  const row = {
    payMonth,
    employeeName: employee,
    designation,
    cnic: dash(cnic),
    basic: Number(basic),
    bonus: Number(bonus),
    deduction: Number(deduction),
    payDate,
    paymentMode: mode,
    slipNo,
  };
  if (row.basic + row.bonus - row.deduction !== Number(net)) {
    throw new Error(`Net mismatch on ${slipNo}: ${net}`);
  }
  return row;
});

/* ── Employee joined dates, derived from their earliest salary evidence ───── */
const earliestFor = (name) => {
  const needle = name.toLowerCase();
  const fromLedger = transactions
    .filter((t) => t.category === "Salary" && t.description.toLowerCase().includes(needle))
    .map((t) => t.date);
  const fromPayroll = payroll
    .filter((p) => p.employeeName.toLowerCase() === needle)
    .map((p) => p.payMonth);
  const all = [...fromLedger, ...fromPayroll].sort();
  return all[0] ?? "2024-04-01"; // company's first ledger month
};
for (const e of employees) e.joinedAt = earliestFor(e.fullName);

/* ── Categories (from 04-BUSINESS-RULES.md, fixed lists) ──────────────────── */
const categories = {
  incomeSources: ["Qamar", "Hammad", "Waleed", "Others"],
  expenseCategories: [
    "Salary", "Outsource", "Subscription", "Social Media",
    "Legal", "Accessories", "Bonus", "Loan", "Other",
  ],
};

/* ── Reconcile before writing anything ────────────────────────────────────── */
const round2 = (n) => Math.round(n * 100) / 100;
const income = round2(transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0));
const expenses = round2(transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0));
const net = round2(income - expenses);
const active = employees.filter((e) => e.status === "active").length;

const checks = [
  ["transactions", transactions.length, EXPECTED.transactionCount],
  ["total income", income, EXPECTED.totalIncome],
  ["total expenses", expenses, EXPECTED.totalExpenses],
  ["net balance", net, EXPECTED.netBalance],
  ["employees", employees.length, EXPECTED.employeeCount],
  ["active employees", active, EXPECTED.activeCount],
  ["payroll rows", payroll.length, EXPECTED.payrollRowCount],
];

let failed = false;
for (const [label, actual, expected] of checks) {
  const ok = actual === expected;
  if (!ok) failed = true;
  console.log(`${ok ? "OK " : "FAIL"}  ${label}: ${actual}${ok ? "" : ` (expected ${expected})`}`);
}
if (failed) {
  console.error("\nReconciliation failed — seed NOT written.");
  process.exit(1);
}

const seed = {
  exportedAt: "2026-08-03",
  categories,
  employees,
  transactions,
  payroll,
  expected: {
    transactionCount: EXPECTED.transactionCount,
    totalIncome: EXPECTED.totalIncome,
    totalExpenses: EXPECTED.totalExpenses,
    netBalance: EXPECTED.netBalance,
  },
};

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(seed, null, 2) + "\n", "utf8");
console.log(`\nSeed written: ${path.relative(ROOT, OUT)}`);
