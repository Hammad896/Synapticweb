import { useState } from "react";
import { Archive, ArchiveRestore, Download, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Field, inputClass, Label } from "@/components/kit";
import type { ImportReport } from "../importSeed";
import { pkr } from "../calc";
import type { CategoryKind, FinanceCategory, FinanceSettings } from "../types";

interface Props {
  categories: FinanceCategory[];
  settings: FinanceSettings;
  transactionCount: number;
  onSaveCategory: (kind: CategoryKind, name: string, accountCode: string, id?: string) => Promise<void>;
  onToggleCategory: (category: FinanceCategory) => Promise<void>;
  onDeleteCategory: (category: FinanceCategory) => Promise<void>;
  onSaveSettings: (settings: FinanceSettings) => Promise<void>;
  onImport: () => Promise<ImportReport>;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");

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
    const name = editName.trim();
    const code = editCode.trim();
    if (name && (name !== category.name || code !== category.accountCode)) {
      await onSave(kind, name, code, category.id);
    }
    setEditingId(null);
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
            {editingId === category.id ? (
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
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                />
                <input
                  aria-label={`Rename ${category.name}`}
                  className={inputClass("py-1.5 text-sm")}
                  value={editName}
                  autoFocus
                  onChange={(e) => setEditName(e.target.value)}
                />
                <Button type="submit" className="px-3 py-1.5 text-xs">Save</Button>
                <Button
                  type="button" variant="ghost" className="px-2 py-1.5 text-xs"
                  onClick={() => setEditingId(null)}
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
                  onClick={() => {
                    setEditingId(category.id);
                    setEditName(category.name);
                    setEditCode(category.accountCode);
                  }}
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

const SettingsPanel = ({
  categories,
  settings,
  transactionCount,
  onSaveCategory,
  onToggleCategory,
  onDeleteCategory,
  onSaveSettings,
  onImport,
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
