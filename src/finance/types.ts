export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  /** Stable ID from the Excel export (T001…). Empty for app-created rows. */
  legacyId: string;
  /** System number, NNN-YYYY (001-2026…). Restarts each year; assigned on create. */
  txnNo: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  /** Category NAME (income source or expense category), denormalised on purpose. */
  category: string;
  description: string;
  /** Free reminder text, separate from the description that goes on reports. */
  notes: string;
  amount: number;
  createdAt: string;
}

export type TransactionDraft = Omit<Transaction, "id" | "createdAt">;

export const EMPTY_TRANSACTION: TransactionDraft = {
  legacyId: "",
  txnNo: "",
  // Stamped with today's date by the form when it opens — a module-load
  // default would go stale after midnight.
  date: "",
  type: "expense",
  category: "",
  description: "",
  notes: "",
  amount: 0,
};

export type CategoryKind = "income_source" | "expense_category";

export interface FinanceCategory {
  id: string;
  kind: CategoryKind;
  name: string;
  /** Chart-of-accounts code (Salary 2998, Legal 6500, customers 0001…). */
  accountCode: string;
  sortOrder: number;
  isActive: boolean;
}

export type PayrollStatus = "draft" | "confirmed";

export interface PayrollItem {
  id: string;
  payMonth: string; // YYYY-MM-01
  employeeId: string | null;
  employeeName: string;
  designation: string;
  cnic: string;
  basic: number;
  /** Bonus / allowance. */
  bonus: number;
  /** Advance / deduction. */
  deduction: number;
  payDate: string;
  paymentMode: string;
  slipNo: string; // SYN-SS-YYYYMM-NNN
  status: PayrollStatus;
  /** The Salary ledger entry this row created on confirm. */
  transactionId: string | null;
  createdAt: string;
}

export type PayrollDraft = Omit<PayrollItem, "id" | "createdAt">;

export interface RecurringTemplate {
  id: string;
  name: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  isActive: boolean;
}

export type RecurringDraft = Omit<RecurringTemplate, "id">;

export const DEFAULT_SLIP_NOTE =
  "Note: Synaptic Lab does not withhold or deduct any income tax from salaries. " +
  "Each employee is responsible for calculating, declaring and paying their own " +
  "income tax to the FBR as per applicable regulations.";

export interface FinanceSettings {
  /** The untouchable minimum balance. Available = net − reserve. */
  reserve: number;
  /** The standard note printed on every salary slip. Editable in Settings. */
  slipNote: string;
}

export const netPay = (item: Pick<PayrollItem, "basic" | "bonus" | "deduction">): number =>
  item.basic + item.bonus - item.deduction;

/** SYN-SS-YYYYMM-NNN — the sequence restarts at 001 every month. */
export const nextSlipNo = (existing: PayrollItem[], payMonth: string): string => {
  const stamp = payMonth.slice(0, 7).replace("-", "");
  const prefix = `SYN-SS-${stamp}-`;
  const highest = existing
    .filter((p) => p.slipNo.startsWith(prefix))
    .map((p) => Number.parseInt(p.slipNo.slice(prefix.length), 10))
    .filter((n) => Number.isFinite(n))
    .reduce((max, n) => Math.max(max, n), 0);
  return `${prefix}${String(highest + 1).padStart(3, "0")}`;
};

/** NNN-YYYY, restarting at 001 each calendar year — 014-2026 is 2026's 14th. */
export const nextTransactionNo = (
  existing: Array<Pick<Transaction, "txnNo">>,
  date: string,
): string => {
  const year = date.slice(0, 4);
  const suffix = `-${year}`;
  const highest = existing
    .filter((t) => t.txnNo.endsWith(suffix))
    .map((t) => Number.parseInt(t.txnNo, 10))
    .filter((n) => Number.isFinite(n))
    .reduce((max, n) => Math.max(max, n), 0);
  return `${String(highest + 1).padStart(3, "0")}${suffix}`;
};

/** The one payroll-eligibility rule: Active AND Internal. Everything that
 *  generates or previews a run must use this, never re-derive it. */
export const isPayrollEligible = (employee: {
  status: string;
  staffType: string;
}): boolean => employee.status === "active" && employee.staffType === "internal";

/* The pay cycle, in one place: month M's salaries are handled during M+1. */

/** Salaries are normally paid on the 5th of the FOLLOWING month. */
export const defaultPayDate = (payMonth: string): string => {
  const [year, month] = payMonth.split("-").map(Number);
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  return `${next}-05`;
};

/** The month whose salaries are most likely being run now: the previous one. */
export const suggestedPayMonth = (): string => {
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  return now.toISOString().slice(0, 7);
};

/** The inverse: the month a ledger salary payment was EARNED (paid the month
 *  after). Pure string math — Date round-trips shift months in UTC+5. */
export const earnedMonthOf = (ledgerDate: string): string => {
  const [year, month] = ledgerDate.split("-").map(Number);
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
};
