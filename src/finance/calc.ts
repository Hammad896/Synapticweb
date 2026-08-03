import type { FinanceCategory, Transaction, TransactionType } from "./types";

/**
 * Every report the finance module shows is derived here, from the ledger
 * alone, with no state of its own. The Excel workbook kept running balances by
 * hand; the app recomputes them on every render so they can never drift.
 */

/** Floating-point money guard: totals are compared to 2 dp everywhere. */
export const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface Totals {
  income: number;
  expenses: number;
  net: number;
  count: number;
}

export const totalsOf = (
  transactions: Array<Pick<Transaction, "type" | "amount">>,
): Totals => {
  let income = 0;
  let expenses = 0;
  for (const t of transactions) {
    if (t.type === "income") income += t.amount;
    else expenses += t.amount;
  }
  return {
    income: round2(income),
    expenses: round2(expenses),
    net: round2(income - expenses),
    count: transactions.length,
  };
};

export interface PeriodClosing {
  /** "2026-07" for a month, "2026" for a year. */
  period: string;
  opening: number;
  income: number;
  expenses: number;
  net: number;
  closing: number;
}

const closings = (
  transactions: Transaction[],
  keyOf: (date: string) => string,
): PeriodClosing[] => {
  if (transactions.length === 0) return [];

  const byPeriod = new Map<string, { income: number; expenses: number }>();
  for (const t of transactions) {
    const key = keyOf(t.date);
    const bucket = byPeriod.get(key) ?? { income: 0, expenses: 0 };
    if (t.type === "income") bucket.income += t.amount;
    else bucket.expenses += t.amount;
    byPeriod.set(key, bucket);
  }

  // Every period from the first to the last, INCLUDING empty ones — a month
  // with no transactions still carries the balance forward, and a closing
  // table with silent gaps reads as if money vanished.
  const keys = [...byPeriod.keys()].sort();
  const all = fillRange(keys[0], keys[keys.length - 1]);

  const rows: PeriodClosing[] = [];
  let opening = 0;
  for (const period of all) {
    const bucket = byPeriod.get(period) ?? { income: 0, expenses: 0 };
    const net = round2(bucket.income - bucket.expenses);
    const closing = round2(opening + net);
    rows.push({
      period,
      opening,
      income: round2(bucket.income),
      expenses: round2(bucket.expenses),
      net,
      closing,
    });
    opening = closing;
  }
  return rows;
};

/** "2024-04" … "2026-08" inclusive, or plain years when keys have no month. */
const fillRange = (first: string, last: string): string[] => {
  if (!first.includes("-")) {
    const start = Number(first);
    const end = Number(last);
    return Array.from({ length: end - start + 1 }, (_, i) => String(start + i));
  }
  const result: string[] = [];
  let [y, m] = first.split("-").map(Number);
  const [endY, endM] = last.split("-").map(Number);
  while (y < endY || (y === endY && m <= endM)) {
    result.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return result;
};

/** One row per calendar month, opening carried forward from the previous. */
export const monthlyClosings = (transactions: Transaction[]): PeriodClosing[] =>
  closings(transactions, (date) => date.slice(0, 7));

/** Same carry-forward per calendar year. */
export const yearlyClosings = (transactions: Transaction[]): PeriodClosing[] =>
  closings(transactions, (date) => date.slice(0, 4));

/* ── Custom periods & the FBR fiscal year (1 July – 30 June) ─────────────── */

/** "2025-26" for any date from 2025-07-01 through 2026-06-30. */
export const fiscalYearOf = (date: string): string => {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const start = month >= 7 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
};

/** ["2025-07-01", "2026-06-30"] for the "2025-26" fiscal year. */
export const fiscalYearRange = (fy: string): [string, string] => {
  const start = Number(fy.slice(0, 4));
  return [`${start}-07-01`, `${start + 1}-06-30`];
};

/** Carry-forward closings per FBR fiscal year — the returns table. */
export const fiscalYearClosings = (transactions: Transaction[]): PeriodClosing[] => {
  // fillRange can't interpolate "2025-26" keys, so build the chain directly:
  // fiscal keys sort correctly as strings and money never skips a year here
  // without also skipping it in the data.
  if (transactions.length === 0) return [];
  const byFy = new Map<string, { income: number; expenses: number }>();
  for (const t of transactions) {
    const key = fiscalYearOf(t.date);
    const bucket = byFy.get(key) ?? { income: 0, expenses: 0 };
    if (t.type === "income") bucket.income += t.amount;
    else bucket.expenses += t.amount;
    byFy.set(key, bucket);
  }
  const rows: PeriodClosing[] = [];
  let opening = 0;
  for (const key of [...byFy.keys()].sort()) {
    const bucket = byFy.get(key)!;
    const net = round2(bucket.income - bucket.expenses);
    const closing = round2(opening + net);
    rows.push({
      period: key,
      opening,
      income: round2(bucket.income),
      expenses: round2(bucket.expenses),
      net,
      closing,
    });
    opening = closing;
  }
  return rows;
};

/** Transactions inside [from, to], inclusive; open ends allowed. */
export const inRange = (
  transactions: Transaction[],
  from: string,
  to: string,
): Transaction[] =>
  transactions.filter(
    (t) => (!from || t.date >= from) && (!to || t.date <= to),
  );

/** The cash position the period STARTS with: net of everything before it. */
export const openingBalance = (transactions: Transaction[], from: string): number => {
  if (!from) return 0;
  return totalsOf(transactions.filter((t) => t.date < from)).net;
};

/**
 * The cash-basis balance sheet as of a date. This is a cash book, so the
 * statement is what a cash book can honestly assert: cash on hand, loans
 * given out of it, and how the pair was funded. It balances by construction.
 */
export interface BalanceSheet {
  asOf: string;
  cash: number;
  loansReceivable: number;
  totalAssets: number;
  /** All money received (contributions, revenue, loan repayments received). */
  totalReceipts: number;
  /** All money paid out EXCLUDING loans given (those are still assets). */
  operatingPayments: number;
}

export const balanceSheetAsOf = (
  transactions: Transaction[],
  asOf: string,
): BalanceSheet => {
  const upTo = transactions.filter((t) => !asOf || t.date <= asOf);
  const totals = totalsOf(upTo);
  const loans = round2(
    upTo
      .filter((t) => t.type === "expense" && t.category === "Loan")
      .reduce((sum, t) => sum + t.amount, 0),
  );
  return {
    asOf: asOf || new Date().toISOString().slice(0, 10),
    cash: totals.net,
    loansReceivable: loans,
    totalAssets: round2(totals.net + loans),
    totalReceipts: totals.income,
    operatingPayments: round2(totals.expenses - loans),
  };
};

/** Category name → total, sorted largest first. Used for both breakdowns. */
export const breakdown = (
  transactions: Transaction[],
  type: Transaction["type"],
): Array<{ category: string; amount: number }> => {
  const byCategory = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== type) continue;
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
  }
  return [...byCategory.entries()]
    .map(([category, amount]) => ({ category, amount: round2(amount) }))
    .sort((a, b) => b.amount - a.amount);
};

export interface TransactionFilter {
  year: string;      // "" = all
  month: string;     // "01".."12", "" = all
  type: string;      // "income" | "expense" | ""
  category: string;  // exact name, "" = all
  search: string;    // free text over description + category
}

export const EMPTY_FILTER: TransactionFilter = {
  year: "",
  month: "",
  type: "",
  category: "",
  search: "",
};

export const applyFilter = (
  transactions: Transaction[],
  filter: TransactionFilter,
): Transaction[] => {
  const needle = filter.search.trim().toLowerCase();
  return transactions.filter((t) => {
    if (filter.year && t.date.slice(0, 4) !== filter.year) return false;
    if (filter.month && t.date.slice(5, 7) !== filter.month) return false;
    if (filter.type && t.type !== filter.type) return false;
    if (filter.category && t.category !== filter.category) return false;
    if (
      needle &&
      !t.description.toLowerCase().includes(needle) &&
      !t.category.toLowerCase().includes(needle) &&
      !t.txnNo.toLowerCase().includes(needle) &&
      !t.legacyId.toLowerCase().includes(needle) &&
      !t.notes.toLowerCase().includes(needle)
    )
      return false;
    return true;
  });
};

/** PKR, grouped thousands, decimals only when the amount actually has them. */
export const pkr = (amount: number): string =>
  new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: Number.isInteger(round2(amount)) ? 0 : 2,
  }).format(round2(amount));

export const monthLabel = (period: string): string => {
  const [year, month] = period.split("-").map(Number);
  if (!month || month < 1 || month > 12) return period;
  return new Date(year, month - 1).toLocaleDateString("en", {
    month: "short",
    year: "numeric",
  });
};

/** Distinct years present in the ledger, newest first. */
export const yearsOf = (transactions: Array<Pick<Transaction, "date">>): string[] =>
  [...new Set(transactions.map((t) => t.date.slice(0, 4)))].sort().reverse();

/** The chart-of-accounts code for a transaction's category, "" when unset. */
export const accountCodeOf = (
  categories: FinanceCategory[],
  type: TransactionType,
  name: string,
): string =>
  categories.find(
    (c) =>
      c.kind === (type === "income" ? "income_source" : "expense_category") &&
      c.name.toLowerCase() === name.toLowerCase(),
  )?.accountCode ?? "";

/**
 * The ledger's name-matching discipline: the first meaningful token of a
 * person's name ("M. Farhan" → "farhan"). The delete guard, the salary
 * certificate, and reconciliation must all agree on this — one definition.
 */
export const nameNeedle = (fullName: string): string => {
  const tokens = fullName
    .toLowerCase()
    .replace(/\./g, "")
    .split(/\s+/)
    .filter((t) => t.length > 2);
  return tokens[0] ?? fullName.toLowerCase();
};
