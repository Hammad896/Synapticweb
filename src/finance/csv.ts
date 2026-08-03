import { breakdown, pkr, totalsOf, type PeriodClosing } from "./calc";
import {
  netPay,
  type FinanceCategory,
  type PayrollItem,
  type Transaction,
  type TransactionDraft,
} from "./types";

/**
 * CSV backup and bulk upload for the ledger. The export is the backup format:
 * what Excel opens is exactly what the importer accepts, so a file can make
 * the round trip app → Excel → app without any editing.
 */

const escape = (value: string | number): string =>
  `"${String(value).replace(/"/g, '""')}"`;

/** id,no,date,… — the id doubles as the dedupe key; no is the system NNN-YYYY. */
export const transactionsToCsv = (transactions: Transaction[]): string => {
  const header = ["id", "no", "date", "type", "category", "description", "amount", "notes"];
  const rows = transactions.map((t) =>
    [t.legacyId || t.id, t.txnNo, t.date, t.type === "income" ? "Income" : "Expense", t.category, t.description, t.amount, t.notes]
      .map(escape)
      .join(","),
  );
  return [header.map(escape).join(","), ...rows].join("\n");
};

export const payrollToCsv = (items: PayrollItem[]): string => {
  const header = [
    "slip_no", "pay_month", "employee", "designation", "cnic",
    "basic", "bonus_allowance", "advance_deduction", "net_pay",
    "pay_date", "mode", "status",
  ];
  const rows = items.map((p) =>
    [
      p.slipNo, p.payMonth.slice(0, 7), p.employeeName, p.designation, p.cnic,
      p.basic, p.bonus, p.deduction, netPay(p),
      p.payDate, p.paymentMode, p.status,
    ]
      .map(escape)
      .join(","),
  );
  return [header.map(escape).join(","), ...rows].join("\n");
};

export const downloadCsv = (filename: string, content: string) => {
  // BOM so Excel opens it as UTF-8 instead of mangling anything non-ASCII.
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

/** Monthly or yearly closing table, exactly as shown in Reports. */
export const closingsToCsv = (
  rows: PeriodClosing[],
  labelOf: (period: string) => string,
): string => {
  const header = ["period", "opening", "income", "expenses", "net", "closing"];
  const lines = rows.map((r) =>
    [labelOf(r.period), r.opening, r.income, r.expenses, r.net, r.closing].map(escape).join(","),
  );
  return [header.map(escape).join(","), ...lines].join("\n");
};

/**
 * The financial report: totals, then income by source and expenses by
 * category, each line carrying its chart-of-accounts code. One file an
 * accountant can open and read top to bottom.
 */
export const financialReportToCsv = (
  transactions: Transaction[],
  categories: FinanceCategory[],
  scopeLabel: string,
): string => {
  const codeOf = (kind: FinanceCategory["kind"], name: string) =>
    categories.find(
      (c) => c.kind === kind && c.name.toLowerCase() === name.toLowerCase(),
    )?.accountCode ?? "";

  const totals = totalsOf(transactions);
  const lines: string[] = [];
  const row = (...cells: Array<string | number>) => lines.push(cells.map(escape).join(","));

  row("SYNAPTIC LAB — FINANCIAL REPORT");
  row("Scope", scopeLabel);
  row("Transactions", totals.count);
  row("Total income (PKR)", pkr(totals.income));
  row("Total expenses (PKR)", pkr(totals.expenses));
  row("Net (PKR)", pkr(totals.net));
  row("");

  row("INCOME BY SOURCE");
  row("account", "source", "amount");
  for (const item of breakdown(transactions, "income")) {
    row(codeOf("income_source", item.category), item.category, item.amount);
  }
  row("");

  row("EXPENSES BY CATEGORY");
  row("account", "category", "amount");
  for (const item of breakdown(transactions, "expense")) {
    row(codeOf("expense_category", item.category), item.category, item.amount);
  }

  return lines.join("\n");
};

/**
 * The general ledger: every transaction grouped under its account (category),
 * with a running balance per account. The format an accountant expects.
 */
export const generalLedgerToCsv = (
  transactions: Transaction[],
  categories: FinanceCategory[],
  scopeLabel: string,
): string => {
  const codeOf = (t: Transaction) =>
    categories.find(
      (c) =>
        c.kind === (t.type === "income" ? "income_source" : "expense_category") &&
        c.name.toLowerCase() === t.category.toLowerCase(),
    )?.accountCode ?? "";

  const lines: string[] = [];
  const row = (...cells: Array<string | number>) => lines.push(cells.map(escape).join(","));

  row("SYNAPTIC LAB — GENERAL LEDGER");
  row("Scope", scopeLabel);
  row("");

  const accounts = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const key = `${t.type}|${t.category}`;
    accounts.set(key, [...(accounts.get(key) ?? []), t]);
  }
  const sortedAccounts = [...accounts.entries()].sort((a, b) => {
    const codeA = codeOf(a[1][0]);
    const codeB = codeOf(b[1][0]);
    return (codeA || "9999").localeCompare(codeB || "9999") || a[0].localeCompare(b[0]);
  });

  for (const [key, items] of sortedAccounts) {
    const [type, category] = key.split("|");
    const code = codeOf(items[0]);
    row(`ACCOUNT ${code || "—"} · ${category} (${type})`);
    row("no", "date", "description", "amount", "running total");
    let running = 0;
    for (const t of [...items].sort((a, b) => a.date.localeCompare(b.date))) {
      running = Math.round((running + t.amount) * 100) / 100;
      row(t.txnNo || t.legacyId || t.id, t.date, t.description, t.amount, running);
    }
    row("TOTAL", "", "", running, "");
    row("");
  }
  return lines.join("\n");
};

/** Trial balance: one row per account — income as credits, expenses as debits. */
export const trialBalanceToCsv = (
  transactions: Transaction[],
  categories: FinanceCategory[],
  scopeLabel: string,
): string => {
  const lines: string[] = [];
  const row = (...cells: Array<string | number>) => lines.push(cells.map(escape).join(","));

  row("SYNAPTIC LAB — TRIAL BALANCE");
  row("Scope", scopeLabel);
  row("");
  row("account", "name", "debit (expenses)", "credit (income)");

  let debits = 0;
  let credits = 0;
  const seen = new Map<string, { code: string; name: string; debit: number; credit: number }>();
  for (const t of transactions) {
    const kind = t.type === "income" ? "income_source" : "expense_category";
    const code =
      categories.find((c) => c.kind === kind && c.name.toLowerCase() === t.category.toLowerCase())
        ?.accountCode ?? "";
    const key = `${kind}:${t.category}`;
    const entry = seen.get(key) ?? { code, name: t.category, debit: 0, credit: 0 };
    if (t.type === "expense") { entry.debit += t.amount; debits += t.amount; }
    else { entry.credit += t.amount; credits += t.amount; }
    seen.set(key, entry);
  }
  for (const entry of [...seen.values()].sort((a, b) => (a.code || "9999").localeCompare(b.code || "9999"))) {
    row(entry.code || "—", entry.name, Math.round(entry.debit * 100) / 100, Math.round(entry.credit * 100) / 100);
  }
  row("");
  const r2 = (n: number) => Math.round(n * 100) / 100;
  row("", "TOTALS", r2(debits), r2(credits));
  row("", "NET (cash movement)", "", r2(credits - debits));
  return lines.join("\n");
};

/* ── Parsing ──────────────────────────────────────────────────────────────── */

const parseLine = (line: string): string[] => {
  const fields: string[] = [];
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
  return fields.map((f) => f.trim());
};

const isRealDay = (month: number, day: number): boolean =>
  month >= 1 && month <= 12 && day >= 1 && day <= 31;

/** YYYY-MM-DD as-is; DD/MM/YYYY and DD-MM-YYYY (day first — PK locale) converted. */
const parseDate = (raw: string): string | null => {
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso && isRealDay(Number(iso[2]), Number(iso[3]))) return raw;
  const dayFirst = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dayFirst) {
    const [, d, m, y] = dayFirst;
    if (isRealDay(Number(m), Number(d))) {
      return `${y}-${String(Number(m)).padStart(2, "0")}-${String(Number(d)).padStart(2, "0")}`;
    }
  }
  return null;
};

export interface CsvParseResult {
  drafts: TransactionDraft[];
  errors: string[];
}

/**
 * Header must contain date, type, category, amount (any order, any case);
 * id and description are optional. An id column becomes the dedupe key, so
 * re-uploading a backup adds nothing twice.
 */
export const parseTransactionsCsv = (text: string): CsvParseResult => {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");

  if (lines.length < 2) {
    return { drafts: [], errors: ["The file has no data rows."] };
  }

  const header = parseLine(lines[0]).map((h) => h.toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const required = ["date", "type", "category", "amount"];
  const missing = required.filter((name) => col(name) === -1);
  if (missing.length) {
    return {
      drafts: [],
      errors: [`Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Expected header: id,date,type,category,description,amount (id and description optional).`],
    };
  }

  const drafts: TransactionDraft[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]);
    const rowNo = i + 1;

    const date = parseDate(cells[col("date")] ?? "");
    if (!date) {
      errors.push(`Row ${rowNo}: bad date "${cells[col("date")] ?? ""}" (use YYYY-MM-DD or DD/MM/YYYY).`);
      continue;
    }

    const rawType = (cells[col("type")] ?? "").toLowerCase();
    if (rawType !== "income" && rawType !== "expense") {
      errors.push(`Row ${rowNo}: type must be Income or Expense, got "${cells[col("type")] ?? ""}".`);
      continue;
    }

    const category = cells[col("category")] ?? "";
    if (!category) {
      errors.push(`Row ${rowNo}: category is empty.`);
      continue;
    }

    const amount = Number((cells[col("amount")] ?? "").replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount < 0) {
      errors.push(`Row ${rowNo}: bad amount "${cells[col("amount")] ?? ""}".`);
      continue;
    }

    drafts.push({
      legacyId: col("id") === -1 ? "" : (cells[col("id")] ?? ""),
      txnNo: col("no") === -1 ? "" : (cells[col("no")] ?? ""),
      date,
      type: rawType,
      category,
      description: col("description") === -1 ? "" : (cells[col("description")] ?? ""),
      notes: col("notes") === -1 ? "" : (cells[col("notes")] ?? ""),
      amount,
    });
  }

  return { drafts, errors };
};
