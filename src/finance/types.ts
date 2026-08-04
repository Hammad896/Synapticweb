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

/* ── Customers & invoices ─────────────────────────────────────────────────── */

export interface Client {
  id: string;
  name: string;
  /** Billing block printed under the name — one address line per text line. */
  address: string;
  email: string;
  /** Default currency for this customer's invoices (NOK, USD, PKR…). */
  currency: string;
  /** The ledger income source their payments post to. */
  incomeSource: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
}

export type ClientDraft = Omit<Client, "id" | "createdAt">;

export const EMPTY_CLIENT: ClientDraft = {
  name: "",
  address: "",
  email: "",
  currency: "PKR",
  incomeSource: "",
  notes: "",
  isActive: true,
};

export type InvoiceStatus = "draft" | "sent" | "paid";

export interface InvoiceLine {
  description: string;
  qty: number;
  rate: number;
}

export interface Invoice {
  id: string;
  /** INV-00217… — suggested by the system, editable before saving, unique. */
  invoiceNo: string;
  clientId: string | null;
  /** Denormalised snapshot: the invoice reads as issued even if the customer
   *  record is later edited. */
  clientName: string;
  clientAddress: string;
  date: string; // YYYY-MM-DD
  terms: string; // "Net 30", "Due on receipt", …
  dueDate: string;
  /** The INVOICE currency (what the customer pays in), not the books'. */
  currency: string;
  lines: InvoiceLine[];
  /** Printed under the table — bank details by default. */
  notes: string;
  status: InvoiceStatus;
  /** The income ledger entry created when payment was recorded. */
  transactionId: string | null;
  /** What actually landed in the bank, in PKR — that is what the books hold. */
  paidAmount: number;
  paidDate: string;
  createdAt: string;
}

export type InvoiceDraft = Omit<Invoice, "id" | "createdAt">;

export const invoiceTotal = (invoice: Pick<Invoice, "lines">): number =>
  Math.round(invoice.lines.reduce((sum, l) => sum + l.qty * l.rate, 0) * 100) / 100;

/** The last invoice issued from the old tool — the sequence continues from it. */
export const LAST_LEGACY_INVOICE_NO = 216;

/** INV-NNNNN, continuing the old sequence. Editable on the form; unique. */
export const nextInvoiceNo = (existing: Array<Pick<Invoice, "invoiceNo">>): string => {
  const highest = existing
    .map((i) => /^INV-(\d+)$/.exec(i.invoiceNo.trim())?.[1])
    .filter((n): n is string => Boolean(n))
    .map(Number)
    .reduce((max, n) => Math.max(max, n), LAST_LEGACY_INVOICE_NO);
  return `INV-${String(highest + 1).padStart(5, "0")}`;
};

/** "Net 30" → date + 30 days; "Due on receipt" → the date; else manual. */
export const dueDateFor = (date: string, terms: string): string | null => {
  if (!date) return null;
  if (/^due on receipt$/i.test(terms.trim())) return date;
  const net = /^net\s*(\d+)$/i.exec(terms.trim());
  if (!net) return null;
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(net[1]));
  return d.toISOString().slice(0, 10);
};

/** Overdue is derived, never stored: sent, unpaid, past due. */
export const isOverdue = (
  invoice: Pick<Invoice, "status" | "dueDate">,
  today: string,
): boolean => invoice.status === "sent" && Boolean(invoice.dueDate) && invoice.dueDate < today;

/** The currencies invoices are raised in. NOK and PKR are the standards. */
export const INVOICE_CURRENCIES = ["NOK", "PKR", "USD", "EUR", "GBP", "AED"];

/** Who the invoice is FROM — printed under the letterhead logo. Editable in
 *  Finance → Settings, because a company moves and a phone number changes. */
export const DEFAULT_INVOICE_FROM =
  "Synaptic Lab\n" +
  "Company ID : C629245-1\n" +
  "Office#1, Executive Centre, I-8 Markaz\n" +
  "Islamabad Punjab 46000\n" +
  "Pakistan\n" +
  "+92 313 9676896\n" +
  "qhammad286@gmail.com";

export const DEFAULT_INVOICE_NOTE =
  "Acc Title: SYNAPTIC LAB\n" +
  "A/c: 301800940720001\n" +
  "IBAN: PK27BKIP0301800940720001\n" +
  "\n" +
  "Thanks for your business.";

export const DEFAULT_SLIP_NOTE =
  "Note: Synaptic Lab does not withhold or deduct any income tax from salaries. " +
  "Each employee is responsible for calculating, declaring and paying their own " +
  "income tax to the FBR as per applicable regulations.";

export interface FinanceSettings {
  /** The untouchable minimum balance. Available = net − reserve. */
  reserve: number;
  /** The standard note printed on every salary slip. Editable in Settings. */
  slipNote: string;
  /** The company block printed at the top of every invoice ("Bill From"). */
  invoiceFrom: string;
  /** The default notes block on a new invoice — bank details. */
  invoiceNote: string;
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
