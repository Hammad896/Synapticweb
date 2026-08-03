import { useState } from "react";
import { Archive, ArchiveRestore, Download, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Badge, Button, Field, inputClass, Label } from "@/components/kit";
import type { ImportReport } from "../importSeed";
import { pkr } from "../calc";
import type {
  CategoryKind,
  FinanceCategory,
  FinanceSettings,
  RecurringDraft,
  RecurringTemplate,
} from "../types";

interface Props {
  categories: FinanceCategory[];
  settings: FinanceSettings;
  transactionCount: number;
  onSaveCategory: (kind: CategoryKind, name: string, accountCode: string, id?: string) => Promise<void>;
  onToggleCategory: (category: FinanceCategory) => Promise<void>;
  onDeleteCategory: (category: FinanceCategory) => Promise<void>;
  onSaveSettings: (settings: FinanceSettings) => Promise<void>;
  onImport: () => Promise<ImportReport>;
  recurring: RecurringTemplate[];
  onSaveRecurring: (draft: RecurringDraft, id?: string) => Promise<void>;
  onDeleteRecurring: (template: RecurringTemplate) => Promise<void>;
}

const KIND_META: Record<CategoryKind, { title: string; hint: string }> = {
  income_source: {
    title: "Income sources",
    hint: "Who money comes from (your customers/investors). The number is the account code — e.g. 0001, 0002…",
  },
  expense_category: {
    title: "Expense categories",
    hint: "What money goes to. The number is the account code — e.g. Salary 2998, Legal 6500.",
  },
};

const CategoryList = ({
  kind,
  categories,
  onSave,
  onToggle,
  onDelete,
}: {
  kind: CategoryKind;
  categories: FinanceCategory[];
  onSave: Props["onSaveCategory"];
  onToggle: Props["onToggleCategory"];
  onDelete: Props["onDeleteCategory"];
}) => {
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  // One object = one open editor; no way for name/code/id to fall out of sync.
  const [editing, setEditing] = useState<{ id: string; name: string; code: string } | null>(null);

  const rows = categories.filter((c) => c.kind === kind);
  const meta = KIND_META[kind];

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    await onSave(kind, name, newCode.trim());
    setNewName("");
    setNewCode("");
  };

  const rename = async (category: FinanceCategory) => {
    if (!editing) return;
    const name = editing.name.trim();
    const code = editing.code.trim();
    if (name && (name !== category.name || code !== category.accountCode)) {
      await onSave(kind, name, code, category.id);
    }
    setEditing(null);
  };

  const remove = async (category: FinanceCategory) => {
    if (
      window.confirm(
        `Delete "${category.name}"?\n\nExisting transactions keep the name, but it disappears from the dropdowns. Retiring it (archive icon) is usually safer.`,
      )
    ) {
      await onDelete(category);
    }
  };

  return (
    <div className="surface p-4 sm:p-5">
      <p className="text-sm font-medium text-foreground">{meta.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{meta.hint}</p>

      <ul className="mt-4 flex flex-col gap-1.5">
        {rows.map((category) => (
          <li
            key={category.id}
            className="flex items-center gap-2 rounded-xl border border-border px-3 py-2"
          >
            {editing?.id === category.id ? (
              <form
                className="flex flex-1 items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void rename(category);
                }}
              >
                <input
                  aria-label={`Account code for ${category.name}`}
                  placeholder="Code"
                  className={inputClass("w-20 py-1.5 text-sm tabular-nums")}
                  value={editing.code}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                />
                <input
                  aria-label={`Rename ${category.name}`}
                  className={inputClass("py-1.5 text-sm")}
                  value={editing.name}
                  autoFocus
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
                <Button type="submit" className="px-3 py-1.5 text-xs">Save</Button>
                <Button
                  type="button" variant="ghost" className="px-2 py-1.5 text-xs"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
              </form>
            ) : (
              <>
                {category.accountCode && (
                  <span className="w-12 shrink-0 text-xs tabular-nums text-accent">
                    {category.accountCode}
                  </span>
                )}
                <span
                  className={`flex-1 text-sm ${category.isActive ? "text-foreground" : "text-muted-foreground line-through"}`}
                >
                  {category.name}
                </span>
                {!category.isActive && <Badge tone="neutral">retired</Badge>}
                <Button
                  variant="ghost"
                  aria-label={`Rename ${category.name}`}
                  className="px-2 py-1 text-xs"
                  onClick={() =>
                    setEditing({
                      id: category.id,
                      name: category.name,
                      code: category.accountCode,
                    })
                  }
                >
                  <Pencil size={13} aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  aria-label={category.isActive ? `Retire ${category.name}` : `Restore ${category.name}`}
                  title={category.isActive ? "Retire (hide from dropdowns, keep history)" : "Restore"}
                  className="px-2 py-1 text-xs"
                  onClick={() => void onToggle(category)}
                >
                  {category.isActive
                    ? <Archive size={13} aria-hidden="true" />
                    : <ArchiveRestore size={13} aria-hidden="true" />}
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Delete ${category.name}`}
                  className="px-2 py-1 text-xs text-red-500"
                  onClick={() => void remove(category)}
                >
                  <Trash2 size={13} aria-hidden="true" />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <input
          aria-label={`New ${meta.title.toLowerCase()} account code`}
          placeholder="Code"
          className={inputClass("w-20 py-2 text-sm tabular-nums")}
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
        />
        <input
          aria-label={`New ${meta.title.toLowerCase()} name`}
          placeholder="Add new…"
          className={inputClass("py-2 text-sm")}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button type="submit" variant="secondary" className="px-3 py-2 text-xs">
          <Plus size={13} aria-hidden="true" /> Add
        </Button>
      </form>
    </div>
  );
};

const EMPTY_RECURRING: RecurringDraft = {
  name: "",
  type: "expense",
  category: "",
  description: "",
  amount: 0,
  isActive: true,
};

const RecurringManager = ({
  recurring,
  categories,
  onSave,
  onDelete,
}: {
  recurring: RecurringTemplate[];
  categories: FinanceCategory[];
  onSave: Props["onSaveRecurring"];
  onDelete: Props["onDeleteRecurring"];
}) => {
  const [draft, setDraft] = useState<RecurringDraft>(EMPTY_RECURRING);
  const [editingId, setEditingId] = useState<string | null>(null);

  const options = categories.filter(
    (c) =>
      c.isActive &&
      c.kind === (draft.type === "income" ? "income_source" : "expense_category"),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.category || draft.amount <= 0) return;
    await onSave({ ...draft, name: draft.name.trim() }, editingId ?? undefined);
    setDraft(EMPTY_RECURRING);
    setEditingId(null);
  };

  return (
    <div className="surface mt-4 p-4 sm:p-5">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <RefreshCw size={14} aria-hidden="true" className="text-accent" />
        Recurring templates
      </p>
      <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
        The monthly regulars — ChatGPT, Canva, Envato… Each shows as a
        one-click button on the Transactions page until it has been posted for
        the current month.
      </p>

      {recurring.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5">
          {recurring.map((template) => (
            <li
              key={template.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border px-3 py-2"
            >
              <span className={`text-sm ${template.isActive ? "text-foreground" : "text-muted-foreground line-through"}`}>
                {template.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {template.category} · PKR {pkr(template.amount)}
              </span>
              <span className="ml-auto flex items-center gap-1">
                <Button
                  variant="ghost"
                  aria-label={`Edit ${template.name}`}
                  className="px-2 py-1 text-xs"
                  onClick={() => {
                    setEditingId(template.id);
                    setDraft({ ...template });
                  }}
                >
                  <Pencil size={13} aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  aria-label={template.isActive ? `Pause ${template.name}` : `Resume ${template.name}`}
                  title={template.isActive ? "Pause (keeps the template)" : "Resume"}
                  className="px-2 py-1 text-xs"
                  onClick={() => void onSave({ ...template, isActive: !template.isActive }, template.id)}
                >
                  {template.isActive
                    ? <Archive size={13} aria-hidden="true" />
                    : <ArchiveRestore size={13} aria-hidden="true" />}
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Delete ${template.name}`}
                  className="px-2 py-1 text-xs text-red-500"
                  onClick={() => {
                    if (window.confirm(`Delete the "${template.name}" template? Posted transactions stay.`)) {
                      void onDelete(template);
                    }
                  }}
                >
                  <Trash2 size={13} aria-hidden="true" />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <input
          aria-label="Template name"
          placeholder={editingId ? "Name" : "New template name…"}
          className={inputClass("py-2 text-sm")}
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <select
          aria-label="Template type"
          className={inputClass("py-2 text-sm")}
          value={draft.type}
          onChange={(e) =>
            setDraft({ ...draft, type: e.target.value as RecurringDraft["type"], category: "" })
          }
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <select
          aria-label="Template category"
          className={inputClass("py-2 text-sm")}
          value={draft.category}
          onChange={(e) => setDraft({ ...draft, category: e.target.value })}
        >
          <option value="">Category…</option>
          {options.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
        <input
          aria-label="Template amount"
          type="number"
          min={1}
          placeholder="Amount"
          className={inputClass("py-2 text-sm")}
          value={draft.amount || ""}
          onChange={(e) => setDraft({ ...draft, amount: e.target.valueAsNumber || 0 })}
        />
        <div className="flex gap-2">
          <Button type="submit" variant="secondary" className="flex-1 px-3 py-2 text-xs">
            <Plus size={13} aria-hidden="true" /> {editingId ? "Save" : "Add"}
          </Button>
          {editingId && (
            <Button
              type="button" variant="ghost" className="px-3 py-2 text-xs"
              onClick={() => { setEditingId(null); setDraft(EMPTY_RECURRING); }}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

const SettingsPanel = ({
  categories,
  settings,
  transactionCount,
  onSaveCategory,
  onToggleCategory,
  onDeleteCategory,
  onSaveSettings,
  onImport,
  recurring,
  onSaveRecurring,
  onDeleteRecurring,
}: Props) => {
  const [reserve, setReserve] = useState(String(settings.reserve));
  const [slipNote, setSlipNote] = useState(settings.slipNote);
  const [noteSaved, setNoteSaved] = useState(false);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const saveReserve = async () => {
    const value = Number(reserve);
    if (Number.isFinite(value) && value >= 0) {
      await onSaveSettings({ ...settings, reserve: value });
    }
  };

  const saveSlipNote = async () => {
    await onSaveSettings({ ...settings, slipNote: slipNote.trim() });
    setNoteSaved(true);
    window.setTimeout(() => setNoteSaved(false), 2500);
  };

  const runImport = async () => {
    if (
      !window.confirm(
        "Import the Excel history (262 transactions, 15 team members, 30 payroll rows)?\n\nSafe to re-run: rows that already exist are skipped, and no employee is ever deleted.",
      )
    )
      return;
    setImporting(true);
    setImportError(null);
    try {
      setReport(await onImport());
    } catch (caught) {
      setImportError(caught instanceof Error ? caught.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      {/* ── Import ────────────────────────────────────────────────────────── */}
      <div className="surface p-4 sm:p-5">
        <p className="text-sm font-medium text-foreground">Previous data (Excel, up to 3 Aug 2026)</p>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          One click brings in the complete history: the full ledger, the team
          directory with Active/Former status, and the Feb–Jul 2026 payroll
          register. Idempotent — running it twice adds nothing twice. The ledger
          currently holds {transactionCount} transactions.
        </p>
        <Button
          disabled={importing}
          className="mt-4 px-4 py-2 text-xs"
          onClick={() => void runImport()}
        >
          <Download size={14} aria-hidden="true" />
          {importing ? "Importing…" : "Import previous data"}
        </Button>

        {importError && (
          <p role="alert" className="mt-3 text-sm text-red-500">{importError}</p>
        )}

        {report && (
          <div className="mt-4 rounded-xl border border-border p-4 text-sm">
            <p className={report.verified ? "text-emerald-600" : "text-red-500"}>
              {report.verified
                ? "✓ Import verified — ledger totals match the workbook (net PKR 144,218.18)."
                : `Import finished but totals do NOT reconcile: ${report.discrepancy}`}
            </p>
            <ul className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              <li>Transactions added: {report.transactionsAdded}</li>
              <li>Payroll rows added: {report.payrollAdded}</li>
              <li>Employees created: {report.employeesCreated}</li>
              <li>Employees updated: {report.employeesUpdated}</li>
            </ul>
          </div>
        )}
      </div>

      {/* ── Reserve ───────────────────────────────────────────────────────── */}
      <div className="surface mt-4 p-4 sm:p-5">
        <Label>Minimum balance reserve</Label>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          Kept untouchable. The dashboard's "available" figure is the all-time
          net balance minus this amount. Currently PKR {pkr(settings.reserve)}.
        </p>
        <form
          className="mt-3 flex max-w-sm gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void saveReserve();
          }}
        >
          <Field id="reserve" label="Reserve (PKR)">
            <input
              id="reserve"
              type="number"
              min={0}
              className={inputClass()}
              value={reserve}
              onChange={(e) => setReserve(e.target.value)}
            />
          </Field>
          <Button type="submit" variant="secondary" className="mt-7 px-4 py-2 text-xs">
            Save
          </Button>
        </form>
      </div>

      {/* ── Recurring templates ───────────────────────────────────────────── */}
      <RecurringManager
        recurring={recurring}
        categories={categories}
        onSave={onSaveRecurring}
        onDelete={onDeleteRecurring}
      />

      {/* ── Salary slip note ──────────────────────────────────────────────── */}
      <div className="surface mt-4 p-4 sm:p-5">
        <Label>Salary slip note</Label>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          Printed at the bottom of every salary slip, exactly as written here.
          The default is the standard FBR self-filing text.
        </p>
        <textarea
          aria-label="Salary slip note"
          rows={4}
          className={inputClass("mt-3 max-w-2xl resize-y text-sm")}
          value={slipNote}
          onChange={(e) => setSlipNote(e.target.value)}
        />
        <div className="mt-3 flex items-center gap-3">
          <Button variant="secondary" className="px-4 py-2 text-xs" onClick={() => void saveSlipNote()}>
            Save note
          </Button>
          {noteSaved && <span className="text-xs text-emerald-600">Saved ✓</span>}
        </div>
      </div>

      {/* ── Category lists ────────────────────────────────────────────────── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <CategoryList
          kind="income_source"
          categories={categories}
          onSave={onSaveCategory}
          onToggle={onToggleCategory}
          onDelete={onDeleteCategory}
        />
        <CategoryList
          kind="expense_category"
          categories={categories}
          onSave={onSaveCategory}
          onToggle={onToggleCategory}
          onDelete={onDeleteCategory}
        />
      </div>
    </div>
  );
};

export default SettingsPanel;
