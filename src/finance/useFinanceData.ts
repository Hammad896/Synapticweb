import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/auth";
import { getRepository } from "@/admin/repository";
import type { Employee } from "@/admin/types";
import { getFinanceRepository } from "./repository";
import { importFinanceSeed, type ImportReport } from "./importSeed";
import { monthLabel } from "./calc";
import {
  defaultPayDate,
  netPay,
  nextSlipNo,
  type CategoryKind,
  type FinanceCategory,
  type FinanceSettings,
  type PayrollItem,
  type Transaction,
  type TransactionDraft,
} from "./types";

/**
 * Every finance read and write, in one place — the same seam useHrData carved
 * for HR. The rules that must never be forgotten live here, not in the views:
 * audit on every mutation, and the payroll↔ledger contract (confirming a run
 * writes Salary expenses; editing or deleting a confirmed row keeps that
 * ledger entry in sync).
 */
export const useFinanceData = () => {
  const finance = getFinanceRepository();
  const hr = getRepository();
  const { user } = useAuth();
  const actor = user?.email ?? "unknown";

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [payroll, setPayroll] = useState<PayrollItem[]>([]);
  const [settings, setSettings] = useState<FinanceSettings>({ reserve: 100000 });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [t, c, p, s] = await Promise.all([
        finance.listTransactions(),
        finance.listCategories(),
        finance.listPayroll(),
        finance.getSettings(),
      ]);
      setTransactions(t);
      setCategories(c);
      setPayroll(p);
      setSettings(s);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? `Could not load finance data: ${caught.message}`
          : "Could not load finance data.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [finance]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /* ── Transactions ──────────────────────────────────────────────────────── */

  const saveTransaction = useCallback(
    async (draft: TransactionDraft, editing: Transaction | null) => {
      if (editing) {
        await finance.updateTransaction(editing.id, draft);
        await hr.audit(actor, "finance.transaction.update", draft.description || draft.category, {
          amount: draft.amount,
          date: draft.date,
        });
      } else {
        await finance.createTransaction(draft);
        await hr.audit(actor, "finance.transaction.create", draft.description || draft.category, {
          amount: draft.amount,
          type: draft.type,
        });
      }
      await refresh();
    },
    [finance, hr, actor, refresh],
  );

  const deleteTransaction = useCallback(
    async (transaction: Transaction) => {
      await finance.removeTransaction(transaction.id);
      await hr.audit(actor, "finance.transaction.delete", transaction.description, {
        amount: transaction.amount,
        date: transaction.date,
      });
      await refresh();
    },
    [finance, hr, actor, refresh],
  );

  /* ── Categories ────────────────────────────────────────────────────────── */

  const saveCategory = useCallback(
    async (kind: CategoryKind, name: string, id?: string) => {
      await finance.saveCategory(kind, name, id);
      await hr.audit(actor, id ? "finance.category.rename" : "finance.category.create", name);
      await refresh();
    },
    [finance, hr, actor, refresh],
  );

  const toggleCategory = useCallback(
    async (category: FinanceCategory) => {
      await finance.toggleCategory(category.id, !category.isActive);
      await hr.audit(
        actor,
        category.isActive ? "finance.category.retire" : "finance.category.restore",
        category.name,
      );
      await refresh();
    },
    [finance, hr, actor, refresh],
  );

  const deleteCategory = useCallback(
    async (category: FinanceCategory) => {
      await finance.removeCategory(category.id);
      await hr.audit(actor, "finance.category.delete", category.name);
      await refresh();
    },
    [finance, hr, actor, refresh],
  );

  /* ── Payroll ───────────────────────────────────────────────────────────── */

  /**
   * One editable draft row per Active + Internal employee, pre-filled from
   * their current salary. People who already have a row this month are
   * skipped, so regenerating is safe.
   */
  const generateRun = useCallback(
    async (payMonth: string, employees: Employee[]) => {
      const eligible = employees.filter(
        (e) => e.status === "active" && e.staffType === "internal",
      );
      const already = new Set(
        payroll
          .filter((p) => p.payMonth.slice(0, 7) === payMonth.slice(0, 7))
          .map((p) => p.employeeName.trim().toLowerCase()),
      );

      const existing = [...payroll];
      let created = 0;
      for (const person of eligible) {
        if (already.has(person.fullName.trim().toLowerCase())) continue;
        const slipNo = nextSlipNo(existing, payMonth);
        const item = await finance.createPayrollItem({
          payMonth,
          employeeId: person.id,
          employeeName: person.fullName,
          designation: person.role,
          cnic: person.cnic,
          basic: person.salaryAmount,
          bonus: 0,
          deduction: 0,
          payDate: defaultPayDate(payMonth),
          paymentMode: "Bank Transfer",
          slipNo,
          status: "draft",
          transactionId: null,
        });
        existing.push(item);
        created++;
      }

      await hr.audit(actor, "finance.payroll.generate", monthLabel(payMonth.slice(0, 7)), {
        rows: created,
      });
      await refresh();
      return created;
    },
    [finance, hr, actor, payroll, refresh],
  );

  const salaryDescription = (item: Pick<PayrollItem, "employeeName" | "payMonth">) =>
    `Salary: ${item.employeeName} — ${monthLabel(item.payMonth.slice(0, 7))}`;

  const savePayrollItem = useCallback(
    async (item: PayrollItem, patch: Partial<PayrollItem>) => {
      await finance.updatePayrollItem(item.id, patch);

      // A confirmed row already wrote a Salary expense — keep it true.
      const next = { ...item, ...patch };
      if (item.status === "confirmed" && item.transactionId) {
        await finance.updateTransaction(item.transactionId, {
          legacyId: "",
          date: next.payDate || next.payMonth,
          type: "expense",
          category: "Salary",
          description: salaryDescription(next),
          amount: netPay(next),
        });
      }

      await hr.audit(actor, "finance.payroll.update", next.slipNo, { net: netPay(next) });
      await refresh();
    },
    [finance, hr, actor, refresh],
  );

  /** Confirming writes one Salary expense per row and links it. */
  const confirmRun = useCallback(
    async (payMonth: string) => {
      const drafts = payroll.filter(
        (p) => p.status === "draft" && p.payMonth.slice(0, 7) === payMonth.slice(0, 7),
      );
      for (const item of drafts) {
        const transaction = await finance.createTransaction({
          legacyId: "",
          date: item.payDate || defaultPayDate(item.payMonth),
          type: "expense",
          category: "Salary",
          description: salaryDescription(item),
          amount: netPay(item),
        });
        await finance.updatePayrollItem(item.id, {
          status: "confirmed",
          transactionId: transaction.id,
        });
      }
      await hr.audit(actor, "finance.payroll.confirm", monthLabel(payMonth.slice(0, 7)), {
        rows: drafts.length,
      });
      await refresh();
      return drafts.length;
    },
    [finance, hr, actor, payroll, refresh],
  );

  const deletePayrollItem = useCallback(
    async (item: PayrollItem) => {
      // The ledger follows the register: removing a confirmed row removes the
      // Salary expense it created. The caller confirms this with the user.
      if (item.status === "confirmed" && item.transactionId) {
        await finance.removeTransaction(item.transactionId);
      }
      await finance.removePayrollItem(item.id);
      await hr.audit(actor, "finance.payroll.delete", item.slipNo, {
        employee: item.employeeName,
        net: netPay(item),
      });
      await refresh();
    },
    [finance, hr, actor, refresh],
  );

  /* ── Settings & import ─────────────────────────────────────────────────── */

  const saveSettings = useCallback(
    async (next: FinanceSettings) => {
      await finance.saveSettings(next);
      await hr.audit(actor, "finance.settings.update", "reserve", { reserve: next.reserve });
      await refresh();
    },
    [finance, hr, actor, refresh],
  );

  const runImport = useCallback(async (): Promise<ImportReport> => {
    const report = await importFinanceSeed(hr, finance);
    await hr.audit(actor, "finance.import", "Excel export 2026-08-03", { ...report });
    await refresh();
    return report;
  }, [finance, hr, actor, refresh]);

  /* ── Derived ───────────────────────────────────────────────────────────── */

  const incomeSources = useMemo(
    () => categories.filter((c) => c.kind === "income_source" && c.isActive),
    [categories],
  );
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.kind === "expense_category" && c.isActive),
    [categories],
  );

  return {
    transactions,
    categories,
    incomeSources,
    expenseCategories,
    payroll,
    settings,
    error,
    isLoading,
    refresh,
    saveTransaction,
    deleteTransaction,
    saveCategory,
    toggleCategory,
    deleteCategory,
    generateRun,
    savePayrollItem,
    confirmRun,
    deletePayrollItem,
    saveSettings,
    runImport,
  };
};

export type FinanceData = ReturnType<typeof useFinanceData>;
