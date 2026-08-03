import { netPay, type PayrollItem, type Transaction, type TransactionDraft } from "./types";

/**
 * CSV backup and bulk upload for the ledger. The export is the backup format:
 * what Excel opens is exactly what the importer accepts, so a file can make
 * the round trip app → Excel → app without any editing.
 */

const escape = (value: string | number): string =>
  `"${String(value).replace(/"/g, '""')}"`;

/** id,date,type,category,description,amount — the id doubles as the dedupe key. */
export const transactionsToCsv = (transactions: Transaction[]): string => {
  const header = ["id", "date", "type", "category", "description", "amount"];
  const rows = transactions.map((t) =>
    [t.legacyId || t.id, t.date, t.type === "income" ? "Income" : "Expense", t.category, t.description, t.amount]
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
      date,
      type: rawType,
      category,
      description: col("description") === -1 ? "" : (cells[col("description")] ?? ""),
      amount,
    });
  }

  return { drafts, errors };
};
