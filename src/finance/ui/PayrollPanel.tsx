import { useMemo, useState } from "react";
import { CheckCircle2, Download, FileDown, Pencil, Plus, Trash2, X } from "lucide-react";
import { Badge, Button, EmptyState, Field, inputClass } from "@/components/kit";
import type { Employee } from "@/admin/types";
import { monthLabel, pkr } from "../calc";
import { downloadCsv, payrollToCsv } from "../csv";
import { netPay, type PayrollItem } from "../types";
import { downloadSlip, renderSalarySlip } from "../slip";

interface Props {
  payroll: PayrollItem[];
  employees: Employee[];
  onGenerate: (payMonth: string, employees: Employee[]) => Promise<number>;
  onConfirm: (payMonth: string) => Promise<number>;
  onSaveItem: (item: PayrollItem, patch: Partial<PayrollItem>) => Promise<void>;
  onDeleteItem: (item: PayrollItem) => Promise<void>;
}

/** "2026-08" for the month whose salaries are most likely being run now: the
 *  previous calendar month (July's salaries are paid on 5 August). */
const suggestedMonth = () => {
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  return now.toISOString().slice(0, 7);
};

const PayrollPanel = ({
  payroll,
  employees,
  onGenerate,
  onConfirm,
  onSaveItem,
  onDeleteItem,
}: Props) => {
  const [month, setMonth] = useState(suggestedMonth);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<PayrollItem | null>(null);
  const [patch, setPatch] = useState<Partial<PayrollItem>>({});

  const eligible = useMemo(
    () => employees.filter((e) => e.status === "active" && e.staffType === "internal"),
    [employees],
  );

  /** Newest month first, rows grouped. */
  const byMonth = useMemo(() => {
    const groups = new Map<string, PayrollItem[]>();
    for (const item of payroll) {
      const key = item.payMonth.slice(0, 7);
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [payroll]);

  const generate = async () => {
    if (!month) return;
    setBusy(true);
    try {
      const created = await onGenerate(`${month}-01`, employees);
      if (created === 0) {
        window.alert(
          "No rows to add — every Active internal employee already has a row for this month.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (key: string, draftCount: number) => {
    if (
      window.confirm(
        `Confirm ${monthLabel(key)} payroll?\n\nThis writes ${draftCount} Salary expense${draftCount === 1 ? "" : "s"} to the ledger.`,
      )
    ) {
      await onConfirm(`${key}-01`);
    }
  };

  const remove = async (item: PayrollItem) => {
    const warning =
      item.status === "confirmed"
        ? `Delete ${item.slipNo} (${item.employeeName})?\n\nIts Salary expense of PKR ${pkr(netPay(item))} will ALSO be removed from the ledger.`
        : `Delete ${item.slipNo} (${item.employeeName})?`;
    if (window.confirm(warning)) await onDeleteItem(item);
  };

  const startEdit = (item: PayrollItem) => {
    setEditing(item);
    setPatch({
      basic: item.basic,
      bonus: item.bonus,
      deduction: item.deduction,
      payDate: item.payDate,
      paymentMode: item.paymentMode,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      await onSaveItem(editing, patch);
      setEditing(null);
    } finally {
      setBusy(false);
    }
  };

  const slip = async (item: PayrollItem) => {
    const employee =
      employees.find((e) => e.id === item.employeeId) ??
      employees.find(
        (e) => e.fullName.trim().toLowerCase() === item.employeeName.trim().toLowerCase(),
      ) ??
      null;
    downloadSlip(await renderSalarySlip(item, employee), item.slipNo);
  };

  const editNet = netPay({
    basic: patch.basic ?? 0,
    bonus: patch.bonus ?? 0,
    deduction: patch.deduction ?? 0,
  });

  return (
    <div>
      {/* ── Generate a run ────────────────────────────────────────────────── */}
      <div className="surface flex flex-wrap items-end gap-4 p-4 sm:p-5">
        <Field id="payroll-month" label="Pay month">
          <input
            id="payroll-month"
            type="month"
            className={inputClass("w-44")}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </Field>
        <Button disabled={busy || !month} className="px-4 py-2.5 text-xs" onClick={() => void generate()}>
          <Plus size={14} aria-hidden="true" />
          Generate run
        </Button>
        <Button
          variant="secondary"
          disabled={!payroll.length}
          className="px-4 py-2.5 text-xs"
          title="Download the whole payroll register as a CSV backup Excel can open"
          onClick={() =>
            downloadCsv(
              `synapticlab-payroll-${new Date().toISOString().slice(0, 10)}.csv`,
              payrollToCsv(payroll),
            )
          }
        >
          <Download size={14} aria-hidden="true" />
          Export CSV
        </Button>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Creates one editable row per <strong>Active · Internal</strong> employee
          ({eligible.length} right now: {eligible.map((e) => e.fullName).join(", ") || "none"}),
          pre-filled from their current salary. Confirming writes the Salary expenses
          to the ledger. Slips are paid on the 5th of the following month.
        </p>
      </div>

      {/* ── Edit sheet ────────────────────────────────────────────────────── */}
      {editing && (
        <div className="surface mt-4 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {editing.slipNo} — {editing.employeeName}
              {editing.status === "confirmed" && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (confirmed — the ledger entry updates with it)
                </span>
              )}
            </p>
            <button
              type="button"
              aria-label="Close editor"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setEditing(null)}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Field id="pr-basic" label="Basic">
              <input
                id="pr-basic" type="number" min={0} className={inputClass()}
                value={patch.basic ?? 0}
                onChange={(e) => setPatch({ ...patch, basic: e.target.valueAsNumber || 0 })}
              />
            </Field>
            <Field id="pr-bonus" label="Bonus / allowance">
              <input
                id="pr-bonus" type="number" min={0} className={inputClass()}
                value={patch.bonus ?? 0}
                onChange={(e) => setPatch({ ...patch, bonus: e.target.valueAsNumber || 0 })}
              />
            </Field>
            <Field id="pr-deduction" label="Advance / deduction">
              <input
                id="pr-deduction" type="number" min={0} className={inputClass()}
                value={patch.deduction ?? 0}
                onChange={(e) => setPatch({ ...patch, deduction: e.target.valueAsNumber || 0 })}
              />
            </Field>
            <Field id="pr-paydate" label="Pay date">
              <input
                id="pr-paydate" type="date" className={inputClass()}
                value={patch.payDate ?? ""}
                onChange={(e) => setPatch({ ...patch, payDate: e.target.value })}
              />
            </Field>
            <Field id="pr-mode" label="Mode">
              <select
                id="pr-mode" className={inputClass()}
                value={patch.paymentMode ?? "Bank Transfer"}
                onChange={(e) => setPatch({ ...patch, paymentMode: e.target.value })}
              >
                {["Bank Transfer", "Cash", "Cheque", "Easypaisa / JazzCash"].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <Button disabled={busy} className="px-4 py-2 text-xs" onClick={() => void saveEdit()}>
              Save row
            </Button>
            <span className="text-sm tabular-nums text-foreground">
              Net pay: <strong>PKR {pkr(editNet)}</strong>
            </span>
          </div>
        </div>
      )}

      {/* ── Runs ──────────────────────────────────────────────────────────── */}
      {byMonth.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No payroll runs yet"
            description="Pick a month above and generate the first run, or import the Excel history from Settings."
          />
        </div>
      ) : (
        byMonth.map(([key, items]) => {
          const drafts = items.filter((i) => i.status === "draft");
          const total = items.reduce((sum, i) => sum + netPay(i), 0);
          return (
            <section key={key} className="mt-6">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-base font-medium text-foreground">{monthLabel(key)}</h3>
                <Badge tone={drafts.length ? "warning" : "success"} dot>
                  {drafts.length ? `${drafts.length} draft` : "confirmed"}
                </Badge>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {items.length} people · PKR {pkr(total)}
                </span>
                {drafts.length > 0 && (
                  <Button
                    className="ml-auto px-4 py-2 text-xs"
                    onClick={() => void confirm(key, drafts.length)}
                  >
                    <CheckCircle2 size={14} aria-hidden="true" />
                    Confirm & post to ledger
                  </Button>
                )}
              </div>

              <div className="surface mt-3 overflow-x-auto">
                <table className="w-full min-w-[56rem] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border">
                      {["Slip", "Employee", "Basic", "Bonus", "Deduction", "Net pay", "Pay date", "Status", ""].map((h) => (
                        <th
                          key={h}
                          scope="col"
                          className="whitespace-nowrap px-4 py-3 text-xs uppercase tracking-[0.15em] text-muted-foreground"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-border last:border-b-0">
                        <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-accent">
                          {item.slipNo}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                          {item.employeeName}
                          <span className="block text-xs text-muted-foreground">
                            {item.designation}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{pkr(item.basic)}</td>
                        <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{pkr(item.bonus)}</td>
                        <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{pkr(item.deduction)}</td>
                        <td className="px-4 py-3 text-sm font-medium tabular-nums text-foreground">{pkr(netPay(item))}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-muted-foreground">
                          {item.payDate || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={item.status === "confirmed" ? "success" : "warning"} dot>
                            {item.status}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            aria-label={`Salary slip for ${item.employeeName}`}
                            title="Download salary slip (PDF)"
                            className="px-2 py-1 text-xs"
                            onClick={() => void slip(item)}
                          >
                            <FileDown size={13} aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            aria-label={`Edit ${item.slipNo}`}
                            className="px-2 py-1 text-xs"
                            onClick={() => startEdit(item)}
                          >
                            <Pencil size={13} aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            aria-label={`Delete ${item.slipNo}`}
                            className="px-2 py-1 text-xs text-red-500"
                            onClick={() => void remove(item)}
                          >
                            <Trash2 size={13} aria-hidden="true" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
      )}
    </div>
  );
};

export default PayrollPanel;
