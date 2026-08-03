import { supabase } from "@/lib/supabase";
import type {
  CategoryKind,
  FinanceCategory,
  FinanceSettings,
  PayrollDraft,
  PayrollItem,
  Transaction,
  TransactionDraft,
} from "./types";

/**
 * The finance seam — the same shape as HrRepository: one interface, a Supabase
 * adapter that is the real thing, and a localStorage adapter so a fresh clone
 * still runs. Money math lives in calc.ts; this file only moves rows.
 */
export interface FinanceRepository {
  listTransactions(): Promise<Transaction[]>;
  createTransaction(draft: TransactionDraft): Promise<Transaction>;
  updateTransaction(id: string, draft: TransactionDraft): Promise<void>;
  removeTransaction(id: string): Promise<void>;
  /** Bulk import. Rows whose legacyId already exists are skipped — idempotent. */
  insertTransactions(drafts: TransactionDraft[]): Promise<number>;

  listCategories(): Promise<FinanceCategory[]>;
  saveCategory(kind: CategoryKind, name: string, id?: string): Promise<void>;
  toggleCategory(id: string, isActive: boolean): Promise<void>;
  removeCategory(id: string): Promise<void>;
  /** Seeds any of the given names that are missing. Never deletes. */
  ensureCategories(kind: CategoryKind, names: string[]): Promise<void>;

  listPayroll(): Promise<PayrollItem[]>;
  createPayrollItem(draft: PayrollDraft): Promise<PayrollItem>;
  updatePayrollItem(id: string, patch: Partial<PayrollDraft>): Promise<void>;
  removePayrollItem(id: string): Promise<void>;
  /** Bulk import. Rows whose slipNo already exists are skipped — idempotent. */
  insertPayroll(drafts: PayrollDraft[]): Promise<number>;

  getSettings(): Promise<FinanceSettings>;
  saveSettings(settings: FinanceSettings): Promise<void>;
}

/* ── Row coercion, same discipline as the HR adapter ──────────────────────── */

type Row = Record<string, unknown>;

const str = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const num = (value: unknown, fallback = 0): number =>
  typeof value === "number" ? value : Number(value ?? fallback) || fallback;

const bool = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

const toTransaction = (row: Row): Transaction => ({
  id: str(row.id),
  legacyId: str(row.legacy_id),
  date: str(row.date),
  type: str(row.type, "expense") as Transaction["type"],
  category: str(row.category),
  description: str(row.description),
  amount: num(row.amount),
  createdAt: str(row.created_at),
});

const toTransactionRow = (draft: TransactionDraft) => ({
  legacy_id: draft.legacyId || null,
  date: draft.date,
  type: draft.type,
  category: draft.category,
  description: draft.description,
  amount: draft.amount,
});

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

  async updateTransaction(id: string, draft: TransactionDraft): Promise<void> {
    const { error } = await this.db
      .from("transactions")
      .update({ ...toTransactionRow(draft), updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  }

  async removeTransaction(id: string): Promise<void> {
    const { error } = await this.db.from("transactions").delete().eq("id", id);
    if (error) throw error;
  }

  async insertTransactions(drafts: TransactionDraft[]): Promise<number> {
    const { data: existing, error: readError } = await this.db
      .from("transactions")
      .select("legacy_id")
      .not("legacy_id", "is", null);
    if (readError) throw readError;

    const seen = new Set((existing ?? []).map((r: Row) => str(r.legacy_id)));
    const fresh = drafts.filter((d) => d.legacyId && !seen.has(d.legacyId));
    if (fresh.length === 0) return 0;

    // Chunked so one giant statement can't hit a payload limit mid-import.
    for (let i = 0; i < fresh.length; i += 200) {
      const { error } = await this.db
        .from("transactions")
        .insert(fresh.slice(i, i + 200).map(toTransactionRow));
      if (error) throw error;
    }
    return fresh.length;
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
      sortOrder: num(row.sort_order, 100),
      isActive: bool(row.is_active, true),
    }));
  }

  async saveCategory(kind: CategoryKind, name: string, id?: string): Promise<void> {
    const { error } = id
      ? await this.db.from("finance_categories").update({ name }).eq("id", id)
      : await this.db.from("finance_categories").insert({ kind, name });
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

  async removePayrollItem(id: string): Promise<void> {
    const { error } = await this.db.from("payroll_items").delete().eq("id", id);
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
      .select("reserve")
      .eq("id", "main")
      .maybeSingle();
    return { reserve: num(data?.reserve, 100000) };
  }

  async saveSettings(settings: FinanceSettings): Promise<void> {
    const { error } = await this.db
      .from("finance_settings")
      .upsert({ id: "main", reserve: settings.reserve, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
}

/* ── Local adapter ────────────────────────────────────────────────────────── */

const KEY = {
  transactions: "synapticlab.finance.transactions",
  categories: "synapticlab.finance.categories",
  payroll: "synapticlab.finance.payroll",
  settings: "synapticlab.finance.settings",
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
    return read<Transaction>(KEY.transactions).sort(
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

  async updateTransaction(id: string, draft: TransactionDraft) {
    write(
      KEY.transactions,
      read<Transaction>(KEY.transactions).map((t) =>
        t.id === id ? { ...t, ...draft } : t,
      ),
    );
  }

  async removeTransaction(id: string) {
    write(
      KEY.transactions,
      read<Transaction>(KEY.transactions).filter((t) => t.id !== id),
    );
  }

  async insertTransactions(drafts: TransactionDraft[]) {
    const existing = read<Transaction>(KEY.transactions);
    const seen = new Set(existing.map((t) => t.legacyId).filter(Boolean));
    const fresh = drafts
      .filter((d) => d.legacyId && !seen.has(d.legacyId))
      .map((d) => ({
        ...d,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      }));
    write(KEY.transactions, [...existing, ...fresh]);
    return fresh.length;
  }

  async listCategories() {
    return read<FinanceCategory>(KEY.categories).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async saveCategory(kind: CategoryKind, name: string, id?: string) {
    const all = read<FinanceCategory>(KEY.categories);
    if (id) {
      write(KEY.categories, all.map((c) => (c.id === id ? { ...c, name } : c)));
    } else {
      write(KEY.categories, [
        ...all,
        { id: crypto.randomUUID(), kind, name, sortOrder: 1000, isActive: true },
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

  async removePayrollItem(id: string) {
    write(
      KEY.payroll,
      read<PayrollItem>(KEY.payroll).filter((p) => p.id !== id),
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
      const parsed = raw ? (JSON.parse(raw) as FinanceSettings) : null;
      return { reserve: parsed?.reserve ?? 100000 };
    } catch {
      return { reserve: 100000 };
    }
  }

  async saveSettings(settings: FinanceSettings) {
    localStorage.setItem(KEY.settings, JSON.stringify(settings));
  }
}

let instance: FinanceRepository | null = null;

export const getFinanceRepository = (): FinanceRepository => {
  if (!instance) {
    instance = supabase ? new SupabaseFinanceRepository() : new LocalFinanceRepository();
  }
  return instance;
};
