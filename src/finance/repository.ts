import { supabase } from "@/lib/supabase";
import { bool, num, str } from "@/admin/repository";
import {
  DEFAULT_INVOICE_FROM,
  DEFAULT_INVOICE_NOTE,
  DEFAULT_SLIP_NOTE,
  type CategoryKind,
  type Client,
  type ClientDraft,
  type FinanceCategory,
  type FinanceSettings,
  type Invoice,
  type InvoiceDraft,
  type InvoiceLine,
  type PayrollDraft,
  type PayrollItem,
  type RecurringDraft,
  type RecurringTemplate,
  type Transaction,
  type TransactionDraft,
} from "./types";

/**
 * The finance seam — the same shape as HrRepository: one interface, a Supabase
 * adapter that is the real thing, and a localStorage adapter so a fresh clone
 * still runs. Money math lives in calc.ts; this file only moves rows.
 */
export interface FinanceRepository {
  listTransactions(): Promise<Transaction[]>;
  createTransaction(draft: TransactionDraft): Promise<Transaction>;
  /** Patch semantics: only the fields present are written — a caller can sync
   *  amount/date without ever touching (or clobbering) notes or numbers. */
  updateTransaction(id: string, patch: Partial<TransactionDraft>): Promise<void>;
  /** Bulk delete; a single delete is just a one-element call. */
  removeTransactions(ids: string[]): Promise<void>;
  /** Bulk import. Rows whose legacyId already exists are skipped — idempotent. */
  insertTransactions(drafts: TransactionDraft[]): Promise<number>;
  /** Plain bulk insert for CSV uploads with no dedupe key. */
  createTransactions(drafts: TransactionDraft[]): Promise<number>;

  listCategories(): Promise<FinanceCategory[]>;
  saveCategory(kind: CategoryKind, name: string, accountCode: string, id?: string): Promise<void>;
  toggleCategory(id: string, isActive: boolean): Promise<void>;
  removeCategory(id: string): Promise<void>;
  /** Seeds any of the given names that are missing. Never deletes. */
  ensureCategories(kind: CategoryKind, names: string[]): Promise<void>;

  listPayroll(): Promise<PayrollItem[]>;
  createPayrollItem(draft: PayrollDraft): Promise<PayrollItem>;
  updatePayrollItem(id: string, patch: Partial<PayrollDraft>): Promise<void>;
  /** Bulk delete; a single delete is just a one-element call. */
  removePayrollItems(ids: string[]): Promise<void>;
  /** Bulk import. Rows whose slipNo already exists are skipped — idempotent. */
  insertPayroll(drafts: PayrollDraft[]): Promise<number>;

  getSettings(): Promise<FinanceSettings>;
  saveSettings(settings: FinanceSettings): Promise<void>;

  listRecurring(): Promise<RecurringTemplate[]>;
  saveRecurring(draft: RecurringDraft, id?: string): Promise<void>;
  removeRecurring(id: string): Promise<void>;

  listClients(): Promise<Client[]>;
  saveClient(draft: ClientDraft, id?: string): Promise<void>;
  removeClient(id: string): Promise<void>;

  listInvoices(): Promise<Invoice[]>;
  createInvoice(draft: InvoiceDraft): Promise<Invoice>;
  /** Patch semantics, same as transactions: absent fields stay untouched. */
  updateInvoice(id: string, patch: Partial<InvoiceDraft>): Promise<void>;
  removeInvoice(id: string): Promise<void>;
}

/* ── Row coercion — the HR adapter's shared helpers ───────────────────────── */

type Row = Record<string, unknown>;

const toTransaction = (row: Row): Transaction => ({
  id: str(row.id),
  legacyId: str(row.legacy_id),
  txnNo: str(row.txn_no),
  date: str(row.date),
  type: str(row.type, "expense") as Transaction["type"],
  category: str(row.category),
  description: str(row.description),
  notes: str(row.notes),
  amount: num(row.amount),
  createdAt: str(row.created_at),
});

const toTransactionRow = (draft: TransactionDraft) => ({
  legacy_id: draft.legacyId || null,
  txn_no: draft.txnNo || null,
  date: draft.date,
  type: draft.type,
  category: draft.category,
  description: draft.description,
  notes: draft.notes,
  amount: draft.amount,
});

/** Patch shape: undefined keys are simply absent, so they stay untouched. */
const toTransactionPatch = (patch: Partial<TransactionDraft>) => {
  const row: Record<string, unknown> = {};
  if (patch.legacyId !== undefined) row.legacy_id = patch.legacyId || null;
  if (patch.txnNo !== undefined) row.txn_no = patch.txnNo || null;
  if (patch.date !== undefined) row.date = patch.date;
  if (patch.type !== undefined) row.type = patch.type;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.amount !== undefined) row.amount = patch.amount;
  return row;
};

const toPayrollItem = (row: Row): PayrollItem => ({
  id: str(row.id),
  payMonth: str(row.pay_month),
  employeeId: row.employee_id ? str(row.employee_id) : null,
  employeeName: str(row.employee_name),
  designation: str(row.designation),
  cnic: str(row.cnic),
  basic: num(row.basic),
  bonus: num(row.bonus),
  deduction: num(row.deduction),
  payDate: str(row.pay_date),
  paymentMode: str(row.payment_mode, "Bank Transfer"),
  slipNo: str(row.slip_no),
  status: str(row.status, "draft") as PayrollItem["status"],
  transactionId: row.transaction_id ? str(row.transaction_id) : null,
  createdAt: str(row.created_at),
});

const toPayrollRow = (draft: Partial<PayrollDraft>) => {
  const row: Record<string, unknown> = {};
  if (draft.payMonth !== undefined) row.pay_month = draft.payMonth;
  if (draft.employeeId !== undefined) row.employee_id = draft.employeeId;
  if (draft.employeeName !== undefined) row.employee_name = draft.employeeName;
  if (draft.designation !== undefined) row.designation = draft.designation;
  if (draft.cnic !== undefined) row.cnic = draft.cnic;
  if (draft.basic !== undefined) row.basic = draft.basic;
  if (draft.bonus !== undefined) row.bonus = draft.bonus;
  if (draft.deduction !== undefined) row.deduction = draft.deduction;
  if (draft.payDate !== undefined) row.pay_date = draft.payDate || null;
  if (draft.paymentMode !== undefined) row.payment_mode = draft.paymentMode;
  if (draft.slipNo !== undefined) row.slip_no = draft.slipNo;
  if (draft.status !== undefined) row.status = draft.status;
  if (draft.transactionId !== undefined) row.transaction_id = draft.transactionId;
  return row;
};

const toClient = (row: Row): Client => ({
  id: str(row.id),
  name: str(row.name),
  address: str(row.address),
  email: str(row.email),
  currency: str(row.currency, "PKR"),
  incomeSource: str(row.income_source),
  notes: str(row.notes),
  isActive: bool(row.is_active, true),
  createdAt: str(row.created_at),
});

const toClientRow = (draft: ClientDraft) => ({
  name: draft.name,
  address: draft.address,
  email: draft.email,
  currency: draft.currency,
  income_source: draft.incomeSource,
  notes: draft.notes,
  is_active: draft.isActive,
});

const toInvoiceLines = (value: unknown): InvoiceLine[] =>
  Array.isArray(value)
    ? value.map((l: Row) => ({
        description: str(l.description),
        qty: num(l.qty, 1),
        rate: num(l.rate),
      }))
    : [];

const toInvoice = (row: Row): Invoice => ({
  id: str(row.id),
  invoiceNo: str(row.invoice_no),
  clientId: row.client_id ? str(row.client_id) : null,
  clientName: str(row.client_name),
  clientAddress: str(row.client_address),
  date: str(row.date),
  terms: str(row.terms, "Net 30"),
  dueDate: str(row.due_date),
  currency: str(row.currency, "PKR"),
  lines: toInvoiceLines(row.lines),
  notes: str(row.notes),
  status: str(row.status, "draft") as Invoice["status"],
  transactionId: row.transaction_id ? str(row.transaction_id) : null,
  paidAmount: num(row.paid_amount),
  paidDate: str(row.paid_date),
  createdAt: str(row.created_at),
});

const toInvoiceRow = (patch: Partial<InvoiceDraft>) => {
  const row: Record<string, unknown> = {};
  if (patch.invoiceNo !== undefined) row.invoice_no = patch.invoiceNo;
  if (patch.clientId !== undefined) row.client_id = patch.clientId;
  if (patch.clientName !== undefined) row.client_name = patch.clientName;
  if (patch.clientAddress !== undefined) row.client_address = patch.clientAddress;
  if (patch.date !== undefined) row.date = patch.date;
  if (patch.terms !== undefined) row.terms = patch.terms;
  if (patch.dueDate !== undefined) row.due_date = patch.dueDate || null;
  if (patch.currency !== undefined) row.currency = patch.currency;
  if (patch.lines !== undefined) row.lines = patch.lines;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.transactionId !== undefined) row.transaction_id = patch.transactionId;
  if (patch.paidAmount !== undefined) row.paid_amount = patch.paidAmount;
  if (patch.paidDate !== undefined) row.paid_date = patch.paidDate || null;
  return row;
};

/* ── Supabase adapter ─────────────────────────────────────────────────────── */

class SupabaseFinanceRepository implements FinanceRepository {
  private get db() {
    if (!supabase) throw new Error("Supabase is not configured.");
    return supabase;
  }

  async listTransactions(): Promise<Transaction[]> {
    const { data, error } = await this.db
      .from("transactions")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10000);
    if (error) throw error;
    return (data ?? []).map(toTransaction);
  }

  async createTransaction(draft: TransactionDraft): Promise<Transaction> {
    const { data, error } = await this.db
      .from("transactions")
      .insert(toTransactionRow(draft))
      .select()
      .single();
    if (error) throw error;
    return toTransaction(data);
  }

  async updateTransaction(id: string, patch: Partial<TransactionDraft>): Promise<void> {
    const { error } = await this.db
      .from("transactions")
      .update({ ...toTransactionPatch(patch), updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  }

  async removeTransactions(ids: string[]): Promise<void> {
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await this.db
        .from("transactions")
        .delete()
        .in("id", ids.slice(i, i + 200));
      if (error) throw error;
    }
  }

  async insertTransactions(drafts: TransactionDraft[]): Promise<number> {
    const { data: existing, error: readError } = await this.db
      .from("transactions")
      .select("legacy_id")
      .not("legacy_id", "is", null);
    if (readError) throw readError;

    const seen = new Set((existing ?? []).map((r: Row) => str(r.legacy_id)));
    const fresh = drafts.filter((d) => d.legacyId && !seen.has(d.legacyId));
    return fresh.length ? this.createTransactions(fresh) : 0;
  }

  async createTransactions(drafts: TransactionDraft[]): Promise<number> {
    // Chunked so one giant statement can't hit a payload limit mid-import.
    for (let i = 0; i < drafts.length; i += 200) {
      const { error } = await this.db
        .from("transactions")
        .insert(drafts.slice(i, i + 200).map(toTransactionRow));
      if (error) throw error;
    }
    return drafts.length;
  }

  async listCategories(): Promise<FinanceCategory[]> {
    const { data, error } = await this.db
      .from("finance_categories")
      .select("*")
      .order("sort_order");
    if (error) throw error;
    return (data ?? []).map((row: Row) => ({
      id: str(row.id),
      kind: str(row.kind, "expense_category") as FinanceCategory["kind"],
      name: str(row.name),
      accountCode: str(row.account_code),
      sortOrder: num(row.sort_order, 100),
      isActive: bool(row.is_active, true),
    }));
  }

  async saveCategory(
    kind: CategoryKind,
    name: string,
    accountCode: string,
    id?: string,
  ): Promise<void> {
    const { error } = id
      ? await this.db
          .from("finance_categories")
          .update({ name, account_code: accountCode })
          .eq("id", id)
      : await this.db
          .from("finance_categories")
          .insert({ kind, name, account_code: accountCode });
    if (error) throw error;
  }

  async toggleCategory(id: string, isActive: boolean): Promise<void> {
    const { error } = await this.db
      .from("finance_categories")
      .update({ is_active: isActive })
      .eq("id", id);
    if (error) throw error;
  }

  async removeCategory(id: string): Promise<void> {
    const { error } = await this.db.from("finance_categories").delete().eq("id", id);
    if (error) throw error;
  }

  async ensureCategories(kind: CategoryKind, names: string[]): Promise<void> {
    const existing = await this.listCategories();
    const have = new Set(
      existing.filter((c) => c.kind === kind).map((c) => c.name.toLowerCase()),
    );
    const missing = names.filter((n) => !have.has(n.toLowerCase()));
    if (missing.length === 0) return;

    const { error } = await this.db
      .from("finance_categories")
      .insert(missing.map((name, i) => ({ kind, name, sort_order: 1000 + i * 10 })));
    if (error) throw error;
  }

  async listPayroll(): Promise<PayrollItem[]> {
    const { data, error } = await this.db
      .from("payroll_items")
      .select("*")
      .order("pay_month", { ascending: false })
      .order("slip_no");
    if (error) throw error;
    return (data ?? []).map(toPayrollItem);
  }

  async createPayrollItem(draft: PayrollDraft): Promise<PayrollItem> {
    const { data, error } = await this.db
      .from("payroll_items")
      .insert(toPayrollRow(draft))
      .select()
      .single();
    if (error) throw error;
    return toPayrollItem(data);
  }

  async updatePayrollItem(id: string, patch: Partial<PayrollDraft>): Promise<void> {
    const { error } = await this.db
      .from("payroll_items")
      .update(toPayrollRow(patch))
      .eq("id", id);
    if (error) throw error;
  }

  async removePayrollItems(ids: string[]): Promise<void> {
    const { error } = await this.db.from("payroll_items").delete().in("id", ids);
    if (error) throw error;
  }

  async insertPayroll(drafts: PayrollDraft[]): Promise<number> {
    const { data: existing, error: readError } = await this.db
      .from("payroll_items")
      .select("slip_no");
    if (readError) throw readError;

    const seen = new Set((existing ?? []).map((r: Row) => str(r.slip_no)));
    const fresh = drafts.filter((d) => !seen.has(d.slipNo));
    if (fresh.length === 0) return 0;

    const { error } = await this.db
      .from("payroll_items")
      .insert(fresh.map(toPayrollRow));
    if (error) throw error;
    return fresh.length;
  }

  async getSettings(): Promise<FinanceSettings> {
    const { data } = await this.db
      .from("finance_settings")
      .select("*")
      .eq("id", "main")
      .maybeSingle();
    return {
      reserve: num(data?.reserve, 100000),
      slipNote: str(data?.slip_note) || DEFAULT_SLIP_NOTE,
      invoiceFrom: str(data?.invoice_from) || DEFAULT_INVOICE_FROM,
      invoiceNote: str(data?.invoice_note) || DEFAULT_INVOICE_NOTE,
    };
  }

  async saveSettings(settings: FinanceSettings): Promise<void> {
    const { error } = await this.db.from("finance_settings").upsert({
      id: "main",
      reserve: settings.reserve,
      slip_note: settings.slipNote,
      invoice_from: settings.invoiceFrom,
      invoice_note: settings.invoiceNote,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  async listRecurring(): Promise<RecurringTemplate[]> {
    const { data, error } = await this.db
      .from("finance_recurring")
      .select("*")
      .order("name");
    if (error) throw error;
    return (data ?? []).map((row: Row) => ({
      id: str(row.id),
      name: str(row.name),
      type: str(row.type, "expense") as RecurringTemplate["type"],
      category: str(row.category),
      description: str(row.description),
      amount: num(row.amount),
      isActive: bool(row.is_active, true),
    }));
  }

  async saveRecurring(draft: RecurringDraft, id?: string): Promise<void> {
    const row = {
      name: draft.name,
      type: draft.type,
      category: draft.category,
      description: draft.description,
      amount: draft.amount,
      is_active: draft.isActive,
    };
    const { error } = id
      ? await this.db.from("finance_recurring").update(row).eq("id", id)
      : await this.db.from("finance_recurring").insert(row);
    if (error) throw error;
  }

  async removeRecurring(id: string): Promise<void> {
    const { error } = await this.db.from("finance_recurring").delete().eq("id", id);
    if (error) throw error;
  }

  async listClients(): Promise<Client[]> {
    const { data, error } = await this.db.from("clients").select("*").order("name");
    if (error) throw error;
    return (data ?? []).map(toClient);
  }

  async saveClient(draft: ClientDraft, id?: string): Promise<void> {
    const { error } = id
      ? await this.db.from("clients").update(toClientRow(draft)).eq("id", id)
      : await this.db.from("clients").insert(toClientRow(draft));
    if (error) throw error;
  }

  async removeClient(id: string): Promise<void> {
    const { error } = await this.db.from("clients").delete().eq("id", id);
    if (error) throw error;
  }

  async listInvoices(): Promise<Invoice[]> {
    const { data, error } = await this.db
      .from("invoices")
      .select("*")
      .order("date", { ascending: false })
      .order("invoice_no", { ascending: false })
      .limit(2000);
    if (error) throw error;
    return (data ?? []).map(toInvoice);
  }

  async createInvoice(draft: InvoiceDraft): Promise<Invoice> {
    const { data, error } = await this.db
      .from("invoices")
      .insert(toInvoiceRow(draft))
      .select()
      .single();
    if (error) throw error;
    return toInvoice(data);
  }

  async updateInvoice(id: string, patch: Partial<InvoiceDraft>): Promise<void> {
    const { error } = await this.db
      .from("invoices")
      .update({ ...toInvoiceRow(patch), updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  }

  async removeInvoice(id: string): Promise<void> {
    const { error } = await this.db.from("invoices").delete().eq("id", id);
    if (error) throw error;
  }
}

/* ── Local adapter ────────────────────────────────────────────────────────── */

const KEY = {
  transactions: "synapticlab.finance.transactions",
  categories: "synapticlab.finance.categories",
  payroll: "synapticlab.finance.payroll",
  settings: "synapticlab.finance.settings",
  recurring: "synapticlab.finance.recurring",
  clients: "synapticlab.finance.clients",
  invoices: "synapticlab.finance.invoices",
};

const read = <T,>(key: string): T[] => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
};
const write = <T,>(key: string, value: T[]) =>
  localStorage.setItem(key, JSON.stringify(value));

class LocalFinanceRepository implements FinanceRepository {
  async listTransactions() {
    // Older local records predate notes and txn numbers.
    return read<Transaction>(KEY.transactions)
      .map((t) => ({ ...t, notes: t.notes ?? "", txnNo: t.txnNo ?? "" }))
      .sort(
        (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
      );
  }

  async createTransaction(draft: TransactionDraft) {
    const saved: Transaction = {
      ...draft,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    write(KEY.transactions, [saved, ...read<Transaction>(KEY.transactions)]);
    return saved;
  }

  async updateTransaction(id: string, patch: Partial<TransactionDraft>) {
    write(
      KEY.transactions,
      read<Transaction>(KEY.transactions).map((t) =>
        t.id === id ? { ...t, ...patch } : t,
      ),
    );
  }

  async removeTransactions(ids: string[]) {
    const gone = new Set(ids);
    write(
      KEY.transactions,
      read<Transaction>(KEY.transactions).filter((t) => !gone.has(t.id)),
    );
  }

  async insertTransactions(drafts: TransactionDraft[]) {
    const seen = new Set(
      read<Transaction>(KEY.transactions).map((t) => t.legacyId).filter(Boolean),
    );
    const fresh = drafts.filter((d) => d.legacyId && !seen.has(d.legacyId));
    return fresh.length ? this.createTransactions(fresh) : 0;
  }

  async createTransactions(drafts: TransactionDraft[]) {
    const saved = drafts.map((d) => ({
      ...d,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }));
    write(KEY.transactions, [...read<Transaction>(KEY.transactions), ...saved]);
    return saved.length;
  }

  async listCategories() {
    return read<FinanceCategory>(KEY.categories)
      .map((c) => ({ ...c, accountCode: c.accountCode ?? "" }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async saveCategory(kind: CategoryKind, name: string, accountCode: string, id?: string) {
    const all = read<FinanceCategory>(KEY.categories);
    if (id) {
      write(
        KEY.categories,
        all.map((c) => (c.id === id ? { ...c, name, accountCode } : c)),
      );
    } else {
      write(KEY.categories, [
        ...all,
        { id: crypto.randomUUID(), kind, name, accountCode, sortOrder: 1000, isActive: true },
      ]);
    }
  }

  async toggleCategory(id: string, isActive: boolean) {
    write(
      KEY.categories,
      read<FinanceCategory>(KEY.categories).map((c) =>
        c.id === id ? { ...c, isActive } : c,
      ),
    );
  }

  async removeCategory(id: string) {
    write(
      KEY.categories,
      read<FinanceCategory>(KEY.categories).filter((c) => c.id !== id),
    );
  }

  async ensureCategories(kind: CategoryKind, names: string[]) {
    const all = read<FinanceCategory>(KEY.categories);
    const have = new Set(
      all.filter((c) => c.kind === kind).map((c) => c.name.toLowerCase()),
    );
    const missing = names
      .filter((n) => !have.has(n.toLowerCase()))
      .map((name, i) => ({
        id: crypto.randomUUID(),
        kind,
        name,
        accountCode: "",
        sortOrder: (i + 1) * 10,
        isActive: true,
      }));
    if (missing.length) write(KEY.categories, [...all, ...missing]);
  }

  async listPayroll() {
    return read<PayrollItem>(KEY.payroll).sort(
      (a, b) => b.payMonth.localeCompare(a.payMonth) || a.slipNo.localeCompare(b.slipNo),
    );
  }

  async createPayrollItem(draft: PayrollDraft) {
    const saved: PayrollItem = {
      ...draft,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    write(KEY.payroll, [saved, ...read<PayrollItem>(KEY.payroll)]);
    return saved;
  }

  async updatePayrollItem(id: string, patch: Partial<PayrollDraft>) {
    write(
      KEY.payroll,
      read<PayrollItem>(KEY.payroll).map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  }

  async removePayrollItems(ids: string[]) {
    const gone = new Set(ids);
    write(
      KEY.payroll,
      read<PayrollItem>(KEY.payroll).filter((p) => !gone.has(p.id)),
    );
  }

  async insertPayroll(drafts: PayrollDraft[]) {
    const existing = read<PayrollItem>(KEY.payroll);
    const seen = new Set(existing.map((p) => p.slipNo));
    const fresh = drafts
      .filter((d) => !seen.has(d.slipNo))
      .map((d) => ({
        ...d,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      }));
    write(KEY.payroll, [...existing, ...fresh]);
    return fresh.length;
  }

  async getSettings(): Promise<FinanceSettings> {
    try {
      const raw = localStorage.getItem(KEY.settings);
      const parsed = raw ? (JSON.parse(raw) as Partial<FinanceSettings>) : null;
      return {
        reserve: parsed?.reserve ?? 100000,
        slipNote: parsed?.slipNote || DEFAULT_SLIP_NOTE,
        invoiceFrom: parsed?.invoiceFrom || DEFAULT_INVOICE_FROM,
        invoiceNote: parsed?.invoiceNote || DEFAULT_INVOICE_NOTE,
      };
    } catch {
      return {
        reserve: 100000,
        slipNote: DEFAULT_SLIP_NOTE,
        invoiceFrom: DEFAULT_INVOICE_FROM,
        invoiceNote: DEFAULT_INVOICE_NOTE,
      };
    }
  }

  async saveSettings(settings: FinanceSettings) {
    localStorage.setItem(KEY.settings, JSON.stringify(settings));
  }

  async listRecurring() {
    return read<RecurringTemplate>(KEY.recurring).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  async saveRecurring(draft: RecurringDraft, id?: string) {
    const all = read<RecurringTemplate>(KEY.recurring);
    if (id) {
      write(KEY.recurring, all.map((r) => (r.id === id ? { ...draft, id } : r)));
    } else {
      write(KEY.recurring, [...all, { ...draft, id: crypto.randomUUID() }]);
    }
  }

  async removeRecurring(id: string) {
    write(
      KEY.recurring,
      read<RecurringTemplate>(KEY.recurring).filter((r) => r.id !== id),
    );
  }

  async listClients() {
    return read<Client>(KEY.clients).sort((a, b) => a.name.localeCompare(b.name));
  }

  async saveClient(draft: ClientDraft, id?: string) {
    const all = read<Client>(KEY.clients);
    if (id) {
      write(KEY.clients, all.map((c) => (c.id === id ? { ...c, ...draft } : c)));
    } else {
      write(KEY.clients, [
        ...all,
        { ...draft, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
      ]);
    }
  }

  async removeClient(id: string) {
    write(KEY.clients, read<Client>(KEY.clients).filter((c) => c.id !== id));
  }

  async listInvoices() {
    return read<Invoice>(KEY.invoices).sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.invoiceNo.localeCompare(a.invoiceNo),
    );
  }

  async createInvoice(draft: InvoiceDraft) {
    const saved: Invoice = {
      ...draft,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    write(KEY.invoices, [saved, ...read<Invoice>(KEY.invoices)]);
    return saved;
  }

  async updateInvoice(id: string, patch: Partial<InvoiceDraft>) {
    write(
      KEY.invoices,
      read<Invoice>(KEY.invoices).map((i) => (i.id === id ? { ...i, ...patch } : i)),
    );
  }

  async removeInvoice(id: string) {
    write(KEY.invoices, read<Invoice>(KEY.invoices).filter((i) => i.id !== id));
  }
}

let instance: FinanceRepository | null = null;

export const getFinanceRepository = (): FinanceRepository => {
  if (!instance) {
    instance = supabase ? new SupabaseFinanceRepository() : new LocalFinanceRepository();
  }
  return instance;
};
