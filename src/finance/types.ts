export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  /** Stable ID from the Excel export (T001…). Empty for app-created rows. */
  legacyId: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  /** Category NAME (income source or expense category), denormalised on purpose. */
  category: string;
  description: string;
  amount: number;
  createdAt: string;
}

export type TransactionDraft = Omit<Transaction, "id" | "createdAt">;

export const EMPTY_TRANSACTION: TransactionDraft = {
  legacyId: "",
  date: new Date().toISOString().slice(0, 10),
  type: "expense",
  category: "",
  description: "",
  amount: 0,
};

export type CategoryKind = "income_source" | "expense_category";

export interface FinanceCategory {
  id: string;
  kind: CategoryKind;
  name: string;
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

export interface FinanceSettings {
  /** The untouchable minimum balance. Available = net − reserve. */
  reserve: number;
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

/** Salaries are normally paid on the 5th of the FOLLOWING month. */
export const defaultPayDate = (payMonth: string): string => {
  const [year, month] = payMonth.split("-").map(Number);
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  return `${next}-05`;
};
