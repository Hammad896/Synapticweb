import type { Transaction } from "./types";

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

export const totalsOf = (transactions: Transaction[]): Totals => {
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
      !t.category.toLowerCase().includes(needle)
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
  const [year, month] = period.split("-");
  if (!month) return period;
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[Number(month) - 1]} ${year}`;
};
