import { useMemo, useRef, useState } from "react";
import { Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { Badge, Button, EmptyState, Field, inputClass } from "@/components/kit";
import { shortDate } from "@/admin/format";
import { applyFilter, EMPTY_FILTER, pkr, round2, totalsOf, type TransactionFilter } from "../calc";
import { downloadCsv, parseTransactionsCsv, transactionsToCsv } from "../csv";
import {
  EMPTY_TRANSACTION,
  type FinanceCategory,
  type Transaction,
  type TransactionDraft,
} from "../types";

const MONTHS = [
  ["01", "Jan"], ["02", "Feb"], ["03", "Mar"], ["04", "Apr"],
  ["05", "May"], ["06", "Jun"], ["07", "Jul"], ["08", "Aug"],
  ["09", "Sep"], ["10", "Oct"], ["11", "Nov"], ["12", "Dec"],
] as const;

interface Props {
  transactions: Transaction[];
  incomeSources: FinanceCategory[];
  expenseCategories: FinanceCategory[];
  onSave: (draft: TransactionDraft, editing: Transaction | null) => Promise<void>;
  onDelete: (transaction: Transaction) => Promise<void>;
  onImportCsv: (drafts: TransactionDraft[]) => Promise<{
    added: number;
    skipped: number;
    newCategories: string[];
  }>;
}

const TransactionsPanel = ({
  transactions,
  incomeSources,
  expenseCategories,
  onSave,
  onDelete,
  onImportCsv,
}: Props) => {
  const [filter, setFilter] = useState<TransactionFilter>(EMPTY_FILTER);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState<TransactionDraft>(EMPTY_TRANSACTION);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const years = useMemo(
    () => [...new Set(transactions.map((t) => t.date.slice(0, 4)))].sort().reverse(),
    [transactions],
  );

  const filtered = useMemo(
    () => applyFilter(transactions, filter),
    [transactions, filter],
  );
  const totals = useMemo(() => totalsOf(filtered), [filtered]);

  const categoriesFor = (type: string) =>
    type === "income" ? incomeSources : expenseCategories;

  const startCreate = () => {
    setEditing(null);
    setDraft({
      ...EMPTY_TRANSACTION,
      date: new Date().toISOString().slice(0, 10),
      category: expenseCategories[0]?.name ?? "",
    });
    setIsCreating(true);
  };

  const startEdit = (transaction: Transaction) => {
    setEditing(transaction);
    setDraft({
      legacyId: transaction.legacyId,
      date: transaction.date,
      type: transaction.type,
      category: transaction.category,
      description: transaction.description,
      amount: transaction.amount,
    });
    setIsCreating(true);
  };

  const close = () => {
    setIsCreating(false);
    setEditing(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.date || !draft.category || draft.amount < 0) return;
    setSaving(true);
    try {
      await onSave(draft, editing);
      close();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (transaction: Transaction) => {
    const label = transaction.description || transaction.category;
    if (
      window.confirm(
        `Delete this ${transaction.type} of PKR ${pkr(transaction.amount)} (${label})?\n\nThis cannot be undone.`,
      )
    ) {
      await onDelete(transaction);
    }
  };

  const set = (patch: Partial<TransactionFilter>) =>
    setFilter((f) => ({ ...f, ...patch }));

  /** Backup: what's on screen (all rows when no filter is active). */
  const exportCsv = () => {
    const scope = filtered.length === transactions.length ? "all" : "filtered";
    downloadCsv(
      `synapticlab-transactions-${scope}-${new Date().toISOString().slice(0, 10)}.csv`,
      transactionsToCsv(filtered),
    );
  };

  const uploadCsv = async (file: File) => {
    setUploading(true);
    try {
      const { drafts, errors } = parseTransactionsCsv(await file.text());

      if (errors.length) {
        const shown = errors.slice(0, 8).join("\n");
        const more = errors.length > 8 ? `\n…and ${errors.length - 8} more.` : "";
        if (drafts.length === 0) {
          window.alert(`Nothing imported — every row failed:\n\n${shown}${more}`);
          return;
        }
        if (
          !window.confirm(
            `${errors.length} row${errors.length === 1 ? "" : "s"} will be SKIPPED:\n\n${shown}${more}\n\nImport the ${drafts.length} valid row${drafts.length === 1 ? "" : "s"} anyway?`,
          )
        )
          return;
      }

      const income = round2(drafts.filter((d) => d.type === "income").reduce((s, d) => s + d.amount, 0));
      const expense = round2(drafts.filter((d) => d.type === "expense").reduce((s, d) => s + d.amount, 0));
      if (
        !window.confirm(
          `Import ${drafts.length} transactions?\n\nIncome ${pkr(income)} · Expenses ${pkr(expense)}\n\nRows with an id that already exists are skipped automatically.`,
        )
      )
        return;

      const result = await onImportCsv(drafts);
      window.alert(
        `Done. Added ${result.added}, skipped ${result.skipped} duplicate${result.skipped === 1 ? "" : "s"}.` +
          (result.newCategories.length
            ? `\nNew categories added to Settings: ${result.newCategories.join(", ")}.`
            : ""),
      );
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <div>
      {/* ── Filters + running totals of what is on screen ─────────────────── */}
      <div className="surface p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <select
            aria-label="Filter by year"
            className={inputClass()}
            value={filter.year}
            onChange={(e) => set({ year: e.target.value })}
          >
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select
            aria-label="Filter by month"
            className={inputClass()}
            value={filter.month}
            onChange={(e) => set({ month: e.target.value })}
          >
            <option value="">All months</option>
            {MONTHS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <select
            aria-label="Filter by type"
            className={inputClass()}
            value={filter.type}
            onChange={(e) => set({ type: e.target.value, category: "" })}
          >
            <option value="">Income + Expense</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          <select
            aria-label="Filter by category"
            className={inputClass()}
            value={filter.category}
            onChange={(e) => set({ category: e.target.value })}
          >
            <option value="">All categories</option>
            {(filter.type === "income"
              ? incomeSources
              : filter.type === "expense"
                ? expenseCategories
                : [...incomeSources, ...expenseCategories]
            ).map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <input
            type="search"
            aria-label="Search transactions"
            placeholder="Search…"
            className={inputClass("col-span-2 sm:col-span-1")}
            value={filter.search}
            onChange={(e) => set({ search: e.target.value })}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="text-muted-foreground">
            {filtered.length} of {transactions.length} transactions
          </span>
          <span className="tabular-nums text-emerald-500">
            In {pkr(totals.income)}
          </span>
          <span className="tabular-nums text-red-500">
            Out {pkr(totals.expenses)}
          </span>
          <span
            className={`tabular-nums ${totals.net >= 0 ? "text-foreground" : "text-red-500"}`}
          >
            Net {pkr(totals.net)}
          </span>

          <div className="ml-auto flex flex-wrap gap-2">
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              aria-label="Upload transactions CSV"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadCsv(file);
              }}
            />
            <Button
              variant="secondary"
              disabled={uploading}
              className="px-4 py-2 text-xs"
              title="Bulk upload from a CSV file (same columns as the export)"
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={14} aria-hidden="true" />
              {uploading ? "Uploading…" : "Upload CSV"}
            </Button>
            <Button
              variant="secondary"
              disabled={!filtered.length}
              className="px-4 py-2 text-xs"
              title="Download what's on screen as a CSV backup Excel can open"
              onClick={exportCsv}
            >
              <Download size={14} aria-hidden="true" />
              Export CSV
            </Button>
            <Button className="px-4 py-2 text-xs" onClick={startCreate}>
              <Plus size={14} aria-hidden="true" />
              Add transaction
            </Button>
          </div>
        </div>
      </div>

      {/* ── Add / edit form ───────────────────────────────────────────────── */}
      {isCreating && (
        <form onSubmit={submit} className="surface mt-4 p-4 sm:p-5">
          <p className="text-sm font-medium text-foreground">
            {editing ? `Edit ${editing.legacyId || "transaction"}` : "New transaction"}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Field id="tx-date" label="Date">
              <input
                id="tx-date"
                type="date"
                required
                className={inputClass()}
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </Field>

            <Field id="tx-type" label="Type">
              <select
                id="tx-type"
                className={inputClass()}
                value={draft.type}
                onChange={(e) => {
                  const type = e.target.value as TransactionDraft["type"];
                  setDraft({
                    ...draft,
                    type,
                    category: categoriesFor(type)[0]?.name ?? "",
                  });
                }}
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </Field>

            <Field id="tx-category" label={draft.type === "income" ? "Source" : "Category"}>
              <select
                id="tx-category"
                required
                className={inputClass()}
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              >
                {categoriesFor(draft.type).map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
                {/* An imported row can carry a retired category — keep it selectable
                    so editing the row doesn't silently recategorise it. */}
                {draft.category &&
                  !categoriesFor(draft.type).some((c) => c.name === draft.category) && (
                    <option value={draft.category}>{draft.category}</option>
                  )}
              </select>
            </Field>

            <Field id="tx-amount" label="Amount (PKR)">
              <input
                id="tx-amount"
                type="number"
                min={0}
                step="0.01"
                required
                className={inputClass()}
                value={Number.isNaN(draft.amount) ? "" : draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: e.target.valueAsNumber })}
              />
            </Field>

            <Field id="tx-description" label="Description">
              <input
                id="tx-description"
                type="text"
                className={inputClass()}
                placeholder="What was this for?"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </Field>
          </div>

          <div className="mt-4 flex gap-3">
            <Button type="submit" disabled={saving} className="px-4 py-2 text-xs">
              {saving ? "Saving…" : editing ? "Save changes" : "Add transaction"}
            </Button>
            <Button type="button" variant="ghost" className="px-4 py-2 text-xs" onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* ── The ledger ────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={transactions.length === 0 ? "No transactions yet" : "Nothing matches these filters"}
            description={
              transactions.length === 0
                ? "Add your first transaction, or import the Excel history from Settings."
                : "Loosen a filter to see more."
            }
          />
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="mt-4 flex flex-col gap-2 md:hidden">
            {filtered.map((t) => (
              <li key={t.id} className="surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                      {t.description || t.category}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {shortDate(t.date)} · {t.category}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 text-sm tabular-nums ${
                      t.type === "income" ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {t.type === "income" ? "+" : "−"}{pkr(t.amount)}
                  </p>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1 py-1.5 text-xs"
                    onClick={() => startEdit(t)}
                  >
                    <Pencil size={12} aria-hidden="true" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 py-1.5 text-xs text-red-500"
                    onClick={() => void remove(t)}
                  >
                    <Trash2 size={12} aria-hidden="true" /> Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="surface mt-4 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[52rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  {["Date", "Type", "Category", "Description", "Amount", ""].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="whitespace-nowrap px-5 py-4 text-xs uppercase tracking-[0.15em] text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-b-0">
                    <td className="whitespace-nowrap px-5 py-3 text-sm tabular-nums text-muted-foreground">
                      {shortDate(t.date)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={t.type === "income" ? "success" : "danger"} dot>
                        {t.type}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-foreground">
                      {t.category}
                    </td>
                    <td className="max-w-[24rem] truncate px-5 py-3 text-sm text-muted-foreground">
                      {t.description}
                    </td>
                    <td
                      className={`whitespace-nowrap px-5 py-3 text-right text-sm tabular-nums ${
                        t.type === "income" ? "text-emerald-500" : "text-red-500"
                      }`}
                    >
                      {t.type === "income" ? "+" : "−"}{pkr(t.amount)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <Button
                        variant="ghost"
                        aria-label={`Edit ${t.description || t.category}`}
                        className="px-2 py-1 text-xs"
                        onClick={() => startEdit(t)}
                      >
                        <Pencil size={13} aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label={`Delete ${t.description || t.category}`}
                        className="px-2 py-1 text-xs text-red-500"
                        onClick={() => void remove(t)}
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default TransactionsPanel;
