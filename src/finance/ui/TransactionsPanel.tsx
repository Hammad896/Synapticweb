import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, ChevronLeft, ChevronRight, Download, Pencil, Plus, RefreshCw, StickyNote, Trash2, Upload, X } from "lucide-react";
import { Badge, Button, EmptyState, Field, inputClass } from "@/components/kit";
import { SortTh, useSort } from "@/lib/useSort";
import { shortDate } from "@/admin/format";
import { applyFilter, EMPTY_FILTER, pkr, totalsOf, yearsOf, type TransactionFilter } from "../calc";
import { downloadCsv, parseTransactionsCsv, transactionsToCsv } from "../csv";
import {
  EMPTY_TRANSACTION,
  type FinanceCategory,
  type RecurringTemplate,
  type Transaction,
  type TransactionDraft,
} from "../types";

const MONTHS = Array.from({ length: 12 }, (_, i) => [
  String(i + 1).padStart(2, "0"),
  new Date(2000, i).toLocaleDateString("en", { month: "short" }),
]);

interface Props {
  transactions: Transaction[];
  incomeSources: FinanceCategory[];
  expenseCategories: FinanceCategory[];
  onSave: (draft: TransactionDraft, editing: Transaction | null) => Promise<void>;
  /** Both return how many payroll rows were reverted to draft (salary links). */
  onDelete: (transaction: Transaction) => Promise<number>;
  onDeleteMany: (transactions: Transaction[]) => Promise<number>;
  onImportCsv: (drafts: TransactionDraft[]) => Promise<{
    added: number;
    skipped: number;
    newCategories: string[];
  }>;
  recurring: RecurringTemplate[];
  onPostRecurring: (template: RecurringTemplate) => Promise<void>;
}

const TransactionsPanel = ({
  transactions,
  incomeSources,
  expenseCategories,
  onSave,
  onDelete,
  onDeleteMany,
  onImportCsv,
  recurring,
  onPostRecurring,
}: Props) => {
  const [filter, setFilter] = useState<TransactionFilter>(EMPTY_FILTER);
  const [editing, setEditing] = useState<Transaction | null>(null);
  // A non-null draft IS the open form — no separate boolean to fall out of sync.
  const [draft, setDraft] = useState<TransactionDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileInput = useRef<HTMLInputElement>(null);

  const years = useMemo(() => yearsOf(transactions), [transactions]);

  const filtered = useMemo(
    () => applyFilter(transactions, filter),
    [transactions, filter],
  );
  const totals = useMemo(() => totalsOf(filtered), [filtered]);

  /* ── Sorting — applies to the whole filtered set, before pagination ────── */
  const { sorted, sort, toggle } = useSort(filtered, {
    no: (t) => t.txnNo || t.legacyId,
    date: (t) => t.date,
    type: (t) => t.type,
    category: (t) => t.category,
    description: (t) => t.description.toLowerCase(),
    amount: (t) => t.amount,
  });

  /* ── Pagination — totals above always cover the WHOLE filtered set ─────── */
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const paged = useMemo(
    () => sorted.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [sorted, currentPage],
  );
  // Changing any filter jumps back to the first page of the new result set.
  useEffect(() => setPage(0), [filter]);

  /* Deep link from the Overview launchpad: ?new=1 opens the form ready to
     type, then drops the flag so refresh/back don't reopen it. */
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    startCreate();
    setSearchParams((previous) => {
      const params = new URLSearchParams(previous);
      params.delete("new");
      return params;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run on flag only
  }, [searchParams]);

  const pager = pageCount > 1 && (
    <div className="mt-3 flex items-center justify-between gap-3">
      <span className="text-xs tabular-nums text-muted-foreground">
        {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of{" "}
        {filtered.length}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          className="px-3 py-1.5 text-xs"
          disabled={currentPage === 0}
          onClick={() => setPage(currentPage - 1)}
        >
          <ChevronLeft size={13} aria-hidden="true" /> Prev
        </Button>
        <span className="text-xs tabular-nums text-muted-foreground">
          {currentPage + 1} / {pageCount}
        </span>
        <Button
          variant="secondary"
          className="px-3 py-1.5 text-xs"
          disabled={currentPage >= pageCount - 1}
          onClick={() => setPage(currentPage + 1)}
        >
          Next <ChevronRight size={13} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );

  /** The type→category coupling, in one place — form and filter both use it. */
  const categoriesFor = (type: string) =>
    type === "income"
      ? incomeSources
      : type === "expense"
        ? expenseCategories
        : [...incomeSources, ...expenseCategories];

  const startCreate = () => {
    setEditing(null);
    setDraft({
      ...EMPTY_TRANSACTION,
      date: new Date().toISOString().slice(0, 10),
      category: expenseCategories[0]?.name ?? "",
    });
  };

  const startEdit = (transaction: Transaction) => {
    const { id: _id, createdAt: _createdAt, ...rest } = transaction;
    setEditing(transaction);
    setDraft(rest);
  };

  const close = () => {
    setDraft(null);
    setEditing(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft || !draft.date || !draft.category || draft.amount < 0) return;
    setSaving(true);
    try {
      await onSave(draft, editing);
      close();
    } finally {
      setSaving(false);
    }
  };

  const notifyReverted = (reverted: number) => {
    if (reverted > 0) {
      window.alert(
        `${reverted} payroll row${reverted === 1 ? " was" : "s were"} linked to the deleted salary expense${reverted === 1 ? "" : "s"} and reverted to draft.\n\nGo to Payroll and press "Confirm & post to ledger" to repost — or edit the rows first.`,
      );
    }
  };

  const remove = async (transaction: Transaction) => {
    const label = transaction.description || transaction.category;
    if (
      window.confirm(
        `Delete this ${transaction.type} of PKR ${pkr(transaction.amount)} (${label})?\n\nThis cannot be undone.`,
      )
    ) {
      const reverted = await onDelete(transaction);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(transaction.id);
        return next;
      });
      notifyReverted(reverted);
    }
  };

  /* ── Multi-select ──────────────────────────────────────────────────────── */

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allVisibleSelected =
    paged.length > 0 && paged.every((t) => selected.has(t.id));

  const toggleAllVisible = () =>
    setSelected((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        for (const t of paged) next.delete(t.id);
        return next;
      }
      return new Set([...prev, ...paged.map((t) => t.id)]);
    });

  const selectedRows = useMemo(
    () => transactions.filter((t) => selected.has(t.id)),
    [transactions, selected],
  );

  const removeSelected = async () => {
    const total = selectedRows.reduce((sum, t) => sum + t.amount, 0);
    if (
      window.confirm(
        `Delete ${selectedRows.length} selected transaction${selectedRows.length === 1 ? "" : "s"} (PKR ${pkr(total)} in total)?\n\nThis cannot be undone.`,
      )
    ) {
      const reverted = await onDeleteMany(selectedRows);
      setSelected(new Set());
      notifyReverted(reverted);
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

      // The same summing the app uses everywhere — the preview can't disagree.
      const preview = totalsOf(drafts);
      if (
        !window.confirm(
          `Import ${drafts.length} transactions?\n\nIncome ${pkr(preview.income)} · Expenses ${pkr(preview.expenses)}\n\nRows with an id that already exists are skipped automatically.`,
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
            {categoriesFor(filter.type).map((c) => (
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

      {/* ── Recurring — the monthly one-clicks ────────────────────────────── */}
      {recurring.filter((r) => r.isActive).length > 0 && (
        <div className="surface mt-4 flex flex-wrap items-center gap-2 p-4 sm:p-5">
          <span className="mr-1 flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">
            <RefreshCw size={12} aria-hidden="true" /> Recurring
          </span>
          {recurring.filter((r) => r.isActive).map((template) => {
            const month = new Date().toISOString().slice(0, 7);
            const label = template.description || template.name;
            const posted = transactions.some(
              (t) =>
                t.date.startsWith(month) &&
                t.category === template.category &&
                t.amount === template.amount &&
                t.description === label,
            );
            return posted ? (
              <span
                key={template.id}
                className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 px-3 py-1.5 text-xs text-emerald-600"
                title={`Already posted this month (${pkr(template.amount)})`}
              >
                <CheckCircle2 size={12} aria-hidden="true" />
                {template.name}
              </span>
            ) : (
              <button
                key={template.id}
                type="button"
                onClick={() => void onPostRecurring(template)}
                title={`Post ${pkr(template.amount)} as ${template.category}`}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground transition-transform hover:border-accent hover:text-accent active:scale-95"
              >
                {template.name} · {pkr(template.amount)}
              </button>
            );
          })}
          <span className="ml-auto text-xs text-muted-foreground">
            Manage templates in Settings
          </span>
        </div>
      )}

      {/* ── Add / edit form ───────────────────────────────────────────────── */}
      {draft && (
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

          <div className="mt-4">
            <Field
              id="tx-notes"
              label="Notes (optional)"
              hint="A reminder for later — e.g. “half still owed, follow up in September”. Shown with a note icon in the list."
            >
              <textarea
                id="tx-notes"
                rows={2}
                className={inputClass("resize-y")}
                placeholder="Anything you want to remember about this transaction…"
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
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

      {/* ── Bulk selection bar ────────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="surface mt-4 flex flex-wrap items-center gap-3 border-accent/40 p-3 sm:px-5">
          <span className="text-sm text-foreground">
            <strong>{selected.size}</strong> selected · PKR{" "}
            {pkr(selectedRows.reduce((sum, t) => sum + t.amount, 0))}
          </span>
          <Button
            variant="danger"
            className="ml-auto px-4 py-1.5 text-xs"
            onClick={() => void removeSelected()}
          >
            <Trash2 size={13} aria-hidden="true" />
            Delete selected
          </Button>
          <Button
            variant="ghost"
            className="px-3 py-1.5 text-xs"
            onClick={() => setSelected(new Set())}
          >
            <X size={13} aria-hidden="true" />
            Clear
          </Button>
        </div>
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
            {paged.map((t) => (
              <li key={t.id} className="surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${t.description || t.category}`}
                    className="mt-1 h-4 w-4 shrink-0 accent-current"
                    checked={selected.has(t.id)}
                    onChange={() => toggleSelected(t.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      {t.description || t.category}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {(t.txnNo || t.legacyId) && (
                        <span className="tabular-nums text-accent">{t.txnNo || t.legacyId} · </span>
                      )}
                      {shortDate(t.date)} · {t.category}
                    </p>
                    {t.notes && (
                      <p className="mt-1 flex items-start gap-1.5 text-xs italic text-muted-foreground">
                        <StickyNote size={12} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
                        {t.notes}
                      </p>
                    )}
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
          <div className="md:hidden">{pager}</div>

          {/* Desktop: table */}
          <div className="surface mt-4 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[52rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="w-10 px-4 py-4">
                    <input
                      type="checkbox"
                      aria-label={allVisibleSelected ? "Deselect all visible" : "Select all visible"}
                      className="h-4 w-4 accent-current"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                    />
                  </th>
                  <SortTh label="No." sortKey="no" sort={sort} onToggle={toggle} className="!px-4" />
                  <SortTh label="Date" sortKey="date" sort={sort} onToggle={toggle} />
                  <SortTh label="Type" sortKey="type" sort={sort} onToggle={toggle} />
                  <SortTh label="Category" sortKey="category" sort={sort} onToggle={toggle} />
                  <SortTh label="Description" sortKey="description" sort={sort} onToggle={toggle} />
                  <SortTh label="Amount" sortKey="amount" sort={sort} onToggle={toggle} />
                  <th scope="col" className="px-5 py-4" />
                </tr>
              </thead>
              <tbody>
                {paged.map((t) => (
                  <tr
                    key={t.id}
                    className={`border-b border-border last:border-b-0 ${selected.has(t.id) ? "bg-accent/5" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${t.description || t.category}`}
                        className="h-4 w-4 accent-current"
                        checked={selected.has(t.id)}
                        onChange={() => toggleSelected(t.id)}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-accent">
                      {t.txnNo || t.legacyId || "—"}
                    </td>
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
                    <td className="max-w-[24rem] px-5 py-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <span className="truncate">{t.description}</span>
                        {t.notes && (
                          <span title={t.notes} aria-label={`Note: ${t.notes}`} className="shrink-0 cursor-help">
                            <StickyNote size={13} aria-hidden="true" className="text-accent" />
                          </span>
                        )}
                      </span>
                    </td>
                    <td
                      className={`whitespace-nowrap px-5 py-3 text-right text-sm tabular-nums ${
                        t.type === "income" ? "text-emerald-500" : "text-red-500"
                      }`}
                    >
                      {t.type === "income" ? "+" : "−"}{pkr(t.amount)}
                    </td>
                    <td className="w-20 px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          aria-label={`Edit ${t.description || t.category}`}
                          className="tap rounded-full text-muted-foreground transition-colors hover:text-accent"
                          onClick={() => startEdit(t)}
                        >
                          <Pencil size={15} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${t.description || t.category}`}
                          className="tap rounded-full text-muted-foreground transition-colors hover:text-red-500"
                          onClick={() => void remove(t)}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="hidden md:block">{pager}</div>
        </>
      )}
    </div>
  );
};

export default TransactionsPanel;
