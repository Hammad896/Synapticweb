import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/auth";
import { getRepository } from "@/admin/repository";
import type { Employee } from "@/admin/types";
import { getFinanceRepository } from "./repository";
import { importFinanceSeed, type ImportReport } from "./importSeed";
import { monthLabel, pkr } from "./calc";
import {
  DEFAULT_SLIP_NOTE,
  defaultPayDate,
  invoiceTotal,
  isPayrollEligible,
  netPay,
  nextInvoiceNo,
  nextSlipNo,
  nextTransactionNo,
  type CategoryKind,
  type Client,
  type ClientDraft,
  type FinanceCategory,
  type FinanceSettings,
  type Invoice,
  type InvoiceDraft,
  type PayrollItem,
  type RecurringDraft,
  type RecurringTemplate,
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
  const [recurring, setRecurring] = useState<RecurringTemplate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<FinanceSettings>({
    reserve: 100000,
    slipNote: DEFAULT_SLIP_NOTE,
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [t, c, p, s, r, cl, inv] = await Promise.all([
        finance.listTransactions(),
        finance.listCategories(),
        finance.listPayroll(),
        finance.getSettings(),
        finance.listRecurring(),
        // Older databases predate the invoices schema — the rest of finance
        // must keep working while docs/supabase/invoices-schema.sql is pending.
        finance.listClients().catch(() => []),
        finance.listInvoices().catch(() => []),
      ]);
      setTransactions(t);
      setCategories(c);
      setPayroll(p);
      setSettings(s);
      setRecurring(r);
      setClients(cl);
      setInvoices(inv);
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
        // The number is permanent — editing (even the date) never renumbers.
        await finance.updateTransaction(editing.id, { ...draft, txnNo: editing.txnNo });
        await hr.audit(actor, "finance.transaction.update", draft.description || draft.category, {
          amount: draft.amount,
          date: draft.date,
        });
      } else {
        const txnNo = nextTransactionNo(transactions, draft.date);
        await finance.createTransaction({ ...draft, txnNo });
        await hr.audit(actor, "finance.transaction.create", draft.description || draft.category, {
          amount: draft.amount,
          type: draft.type,
          txnNo,
        });
      }
      await refresh();
    },
    [finance, hr, actor, transactions, refresh],
  );

  /**
   * Deleting a Salary expense that a payroll row created must not strand that
   * row as "confirmed but paying nothing": the row reverts to draft, so one
   * press of "Confirm & post to ledger" recreates the expense. Returns how
   * many rows were reverted so the UI can say so.
   */
  const revertPayrollLinkedTo = useCallback(
    async (transactionIds: Set<string>): Promise<number> => {
      const linked = payroll.filter(
        (p) => p.transactionId && transactionIds.has(p.transactionId),
      );
      for (const item of linked) {
        await finance.updatePayrollItem(item.id, { status: "draft", transactionId: null });
        await hr.audit(actor, "finance.payroll.revert-to-draft", item.slipNo, {
          reason: "linked salary transaction deleted",
        });
      }
      return linked.length;
    },
    [finance, hr, actor, payroll],
  );

  /** The same stranding rule for invoices: deleting the income entry a
   *  payment created reverts the invoice to "sent" — still owed, in truth. */
  const revertInvoicesLinkedTo = useCallback(
    async (transactionIds: Set<string>): Promise<number> => {
      const linked = invoices.filter(
        (i) => i.transactionId && transactionIds.has(i.transactionId),
      );
      for (const invoice of linked) {
        await finance.updateInvoice(invoice.id, {
          status: "sent",
          transactionId: null,
          paidAmount: 0,
          paidDate: "",
        });
        await hr.audit(actor, "finance.invoice.revert-to-sent", invoice.invoiceNo, {
          reason: "linked payment transaction deleted",
        });
      }
      return linked.length;
    },
    [finance, hr, actor, invoices],
  );

  /** One delete path for one row or many — same audit, same payroll revert. */
  const deleteTransactions = useCallback(
    async (selected: Transaction[]) => {
      await finance.removeTransactions(selected.map((t) => t.id));
      await hr.audit(
        actor,
        selected.length === 1 ? "finance.transaction.delete" : "finance.transaction.bulk-delete",
        selected.length === 1
          ? selected[0].description || selected[0].category
          : `${selected.length} rows`,
        {
          total: selected.reduce((sum, t) => sum + t.amount, 0),
          ids: selected.map((t) => t.txnNo || t.legacyId || t.id),
        },
      );
      const ids = new Set(selected.map((t) => t.id));
      const reverted = await revertPayrollLinkedTo(ids);
      await revertInvoicesLinkedTo(ids);
      await refresh();
      return reverted;
    },
    [finance, hr, actor, refresh, revertPayrollLinkedTo, revertInvoicesLinkedTo],
  );

  const deleteTransaction = useCallback(
    (transaction: Transaction) => deleteTransactions([transaction]),
    [deleteTransactions],
  );

  /* ── Categories ────────────────────────────────────────────────────────── */

  const saveCategory = useCallback(
    async (kind: CategoryKind, name: string, accountCode: string, id?: string) => {
      await finance.saveCategory(kind, name, accountCode, id);
      await hr.audit(actor, id ? "finance.category.update" : "finance.category.create", name, {
        accountCode,
      });
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
      const eligible = employees.filter(isPayrollEligible);
      // Dedupe by person id; the name check applies ONLY to legacy rows that
      // carry no id (else a renamed employee gets a second row) — never to
      // id-linked rows, so two people who share a name each get their own.
      const monthRows = payroll.filter(
        (p) => p.payMonth.slice(0, 7) === payMonth.slice(0, 7),
      );
      const alreadyIds = new Set(monthRows.map((p) => p.employeeId).filter(Boolean));
      const alreadyNames = new Set(
        monthRows
          .filter((p) => !p.employeeId)
          .map((p) => p.employeeName.trim().toLowerCase()),
      );

      const existing = [...payroll];
      let created = 0;
      for (const person of eligible) {
        if (alreadyIds.has(person.id) || alreadyNames.has(person.fullName.trim().toLowerCase()))
          continue;
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

      // A confirmed row already wrote a Salary expense — keep it true. The
      // patch touches only what the row controls; the entry's number and any
      // note the owner added stay untouched by construction.
      const next = { ...item, ...patch };
      if (item.status === "confirmed" && item.transactionId) {
        await finance.updateTransaction(item.transactionId, {
          date: next.payDate || next.payMonth,
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
      const createdThisRun: Array<Pick<Transaction, "txnNo">> = [];
      for (const item of drafts) {
        const date = item.payDate || defaultPayDate(item.payMonth);
        const transaction = await finance.createTransaction({
          legacyId: "",
          txnNo: nextTransactionNo([...transactions, ...createdThisRun], date),
          date,
          type: "expense",
          category: "Salary",
          description: salaryDescription(item),
          notes: "",
          amount: netPay(item),
        });
        createdThisRun.push({ txnNo: transaction.txnNo });
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
    [finance, hr, actor, payroll, transactions, refresh],
  );

  /** One delete path for one row or many. The ledger follows the register:
   *  removing confirmed rows removes the Salary expenses they created. The
   *  caller confirms this with the user. */
  const deletePayrollItems = useCallback(
    async (items: PayrollItem[]) => {
      const linkedTransactions = items
        .filter((i) => i.status === "confirmed" && i.transactionId)
        .map((i) => i.transactionId as string);
      if (linkedTransactions.length) {
        await finance.removeTransactions(linkedTransactions);
      }
      await finance.removePayrollItems(items.map((i) => i.id));
      await hr.audit(
        actor,
        items.length === 1 ? "finance.payroll.delete" : "finance.payroll.bulk-delete",
        items.length === 1 ? items[0].slipNo : `${items.length} rows`,
        {
          employees: items.map((i) => i.employeeName),
          totalNet: items.reduce((sum, i) => sum + netPay(i), 0),
          ledgerEntriesRemoved: linkedTransactions.length,
        },
      );
      await refresh();
    },
    [finance, hr, actor, refresh],
  );

  const deletePayrollItem = useCallback(
    (item: PayrollItem) => deletePayrollItems([item]),
    [deletePayrollItems],
  );

  /**
   * CSV bulk upload. Rows carrying an id dedupe against it (so re-uploading a
   * backup adds nothing twice); rows without one are plain inserts. Categories
   * seen for the first time are added to the settings lists automatically —
   * a bulk upload should never silently strand rows outside the dropdowns.
   */
  const importTransactionsCsv = useCallback(
    async (drafts: TransactionDraft[]) => {
      const known = new Set(categories.map((c) => `${c.kind}:${c.name.toLowerCase()}`));
      const newCategories: string[] = [];
      for (const [type, kind] of [
        ["income", "income_source"],
        ["expense", "expense_category"],
      ] as const) {
        const fresh = [...new Set(
          drafts
            .filter((d) => d.type === type && !known.has(`${kind}:${d.category.toLowerCase()}`))
            .map((d) => d.category),
        )];
        if (fresh.length) await finance.ensureCategories(kind, fresh);
        newCategories.push(...fresh);
      }

      // Assign system numbers up front, continuing each year's sequence. A
      // number from the file is honoured only on rows that also carry a backup
      // id (a restore); anything else gets a fresh number, so hand-made CSVs
      // can never collide with the sequence.
      const numbered: TransactionDraft[] = [];
      const pool: Array<Pick<Transaction, "txnNo">> = [...transactions];
      for (const draft of drafts) {
        const txnNo =
          draft.legacyId && draft.txnNo ? draft.txnNo : nextTransactionNo(pool, draft.date);
        pool.push({ txnNo });
        numbered.push({ ...draft, txnNo });
      }

      const withKey = numbered.filter((d) => d.legacyId);
      const withoutKey = numbered.filter((d) => !d.legacyId);
      const addedWithKey = withKey.length ? await finance.insertTransactions(withKey) : 0;
      const addedPlain = withoutKey.length ? await finance.createTransactions(withoutKey) : 0;

      await hr.audit(actor, "finance.transactions.csv-import", `${drafts.length} rows`, {
        added: addedWithKey + addedPlain,
        skippedAsDuplicates: withKey.length - addedWithKey,
        newCategories,
      });
      await refresh();
      return {
        added: addedWithKey + addedPlain,
        skipped: withKey.length - addedWithKey,
        newCategories,
      };
    },
    [finance, hr, actor, categories, transactions, refresh],
  );

  /* ── Customers & invoices ──────────────────────────────────────────────── */

  const saveClient = useCallback(
    async (draft: ClientDraft, id?: string) => {
      await finance.saveClient(draft, id);
      await hr.audit(actor, id ? "finance.client.update" : "finance.client.create", draft.name, {
        currency: draft.currency,
      });
      await refresh();
    },
    [finance, hr, actor, refresh],
  );

  /** Same protection rule as employees: history makes a record permanent. */
  const deleteClient = useCallback(
    async (client: Client) => {
      const linked = invoices.filter((i) => i.clientId === client.id).length;
      if (linked > 0) {
        throw new Error(
          `${client.name} has ${linked} invoice${linked === 1 ? "" : "s"} — customers with invoices cannot be deleted. Mark them inactive instead.`,
        );
      }
      await finance.removeClient(client.id);
      await hr.audit(actor, "finance.client.delete", client.name);
      await refresh();
    },
    [finance, hr, actor, invoices, refresh],
  );

  const saveInvoice = useCallback(
    async (draft: InvoiceDraft, editing: Invoice | null) => {
      const invoiceNo = draft.invoiceNo.trim() || nextInvoiceNo(invoices);
      const taken = invoices.some(
        (i) => i.invoiceNo === invoiceNo && i.id !== editing?.id,
      );
      if (taken) throw new Error(`Invoice number ${invoiceNo} is already used.`);

      if (editing) {
        await finance.updateInvoice(editing.id, { ...draft, invoiceNo });
      } else {
        await finance.createInvoice({ ...draft, invoiceNo });
      }
      await hr.audit(
        actor,
        editing ? "finance.invoice.update" : "finance.invoice.create",
        `${invoiceNo} — ${draft.clientName}`,
        { total: invoiceTotal(draft), currency: draft.currency },
      );
      await refresh();
    },
    [finance, hr, actor, invoices, refresh],
  );

  const markInvoiceSent = useCallback(
    async (invoice: Invoice) => {
      await finance.updateInvoice(invoice.id, { status: "sent" });
      await hr.audit(actor, "finance.invoice.send", invoice.invoiceNo, {
        client: invoice.clientName,
      });
      await refresh();
    },
    [finance, hr, actor, refresh],
  );

  /**
   * The invoice↔ledger contract, mirroring payroll's: recording a payment
   * writes ONE income entry — in PKR, because that is what actually landed in
   * the bank after remittance — and links it. Deleting that entry later
   * reverts the invoice to "sent".
   */
  const recordInvoicePayment = useCallback(
    async (
      invoice: Invoice,
      payment: { date: string; amountPkr: number; incomeSource: string },
    ) => {
      const transaction = await finance.createTransaction({
        legacyId: "",
        txnNo: nextTransactionNo(transactions, payment.date),
        date: payment.date,
        type: "income",
        category: payment.incomeSource,
        description: `Invoice ${invoice.invoiceNo} — ${invoice.clientName}`,
        notes:
          invoice.currency === "PKR"
            ? ""
            : `Remittance against ${invoice.currency} ${pkr(invoiceTotal(invoice))}`,
        amount: payment.amountPkr,
      });
      await finance.updateInvoice(invoice.id, {
        status: "paid",
        transactionId: transaction.id,
        paidAmount: payment.amountPkr,
        paidDate: payment.date,
      });
      await hr.audit(actor, "finance.invoice.payment", invoice.invoiceNo, {
        client: invoice.clientName,
        receivedPkr: payment.amountPkr,
        invoiced: `${invoice.currency} ${pkr(invoiceTotal(invoice))}`,
        txnNo: transaction.txnNo,
      });
      await refresh();
    },
    [finance, hr, actor, transactions, refresh],
  );

  /** The ledger follows the invoice: deleting a paid one removes the income
   *  entry its payment created. The caller confirms this with the user. */
  const deleteInvoice = useCallback(
    async (invoice: Invoice) => {
      if (invoice.status === "paid" && invoice.transactionId) {
        await finance.removeTransactions([invoice.transactionId]);
      }
      await finance.removeInvoice(invoice.id);
      await hr.audit(actor, "finance.invoice.delete", invoice.invoiceNo, {
        client: invoice.clientName,
        status: invoice.status,
        ledgerEntryRemoved: invoice.status === "paid" && Boolean(invoice.transactionId),
      });
      await refresh();
    },
    [finance, hr, actor, refresh],
  );

  /* ── Recurring templates ───────────────────────────────────────────────── */

  const saveRecurringTemplate = useCallback(
    async (draft: RecurringDraft, id?: string) => {
      await finance.saveRecurring(draft, id);
      await hr.audit(actor, id ? "finance.recurring.update" : "finance.recurring.create", draft.name, {
        amount: draft.amount,
      });
      await refresh();
    },
    [finance, hr, actor, refresh],
  );

  const deleteRecurringTemplate = useCallback(
    async (template: RecurringTemplate) => {
      await finance.removeRecurring(template.id);
      await hr.audit(actor, "finance.recurring.delete", template.name);
      await refresh();
    },
    [finance, hr, actor, refresh],
  );

  /** Posts one template as a normal ledger transaction, dated today. */
  const postRecurring = useCallback(
    async (template: RecurringTemplate) => {
      const date = new Date().toISOString().slice(0, 10);
      await finance.createTransaction({
        legacyId: "",
        txnNo: nextTransactionNo(transactions, date),
        date,
        type: template.type,
        category: template.category,
        description: template.description || template.name,
        notes: "",
        amount: template.amount,
      });
      await hr.audit(actor, "finance.recurring.post", template.name, {
        amount: template.amount,
      });
      await refresh();
    },
    [finance, hr, actor, transactions, refresh],
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
    deleteTransactions,
    importTransactionsCsv,
    saveCategory,
    toggleCategory,
    deleteCategory,
    generateRun,
    savePayrollItem,
    confirmRun,
    deletePayrollItem,
    deletePayrollItems,
    saveSettings,
    runImport,
    recurring,
    saveRecurringTemplate,
    deleteRecurringTemplate,
    postRecurring,
    clients,
    invoices,
    saveClient,
    deleteClient,
    saveInvoice,
    markInvoiceSent,
    recordInvoicePayment,
    deleteInvoice,
  };
};
