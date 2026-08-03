import { useMemo, useState } from "react";
import { Award, CheckCircle2, Download, FileDown, Pencil, Plus, Trash2, X } from "lucide-react";
import { Badge, Button, EmptyState, Field, inputClass } from "@/components/kit";
import { SortTh, cycleSort, sortItems, type SortState } from "@/lib/useSort";
import { errorMessage } from "@/lib/utils";
import type { Employee } from "@/admin/types";
import { openPdf } from "@/hr/pdf";
import { fiscalYearOf, monthLabel, pkr } from "../calc";
import { downloadCsv, payrollToCsv } from "../csv";
import {
  isPayrollEligible,
  netPay,
  suggestedPayMonth,
  type FinanceSettings,
  type PayrollItem,
  type Transaction,
} from "../types";
import { renderSalarySlip } from "../slip";
import { monthlySalaries, renderSalaryCertificate } from "../certificate";

interface Props {
  payroll: PayrollItem[];
  employees: Employee[];
  transactions: Transaction[];
  settings: FinanceSettings;
  onGenerate: (payMonth: string, employees: Employee[]) => Promise<number>;
  onConfirm: (payMonth: string) => Promise<number>;
  onSaveItem: (item: PayrollItem, patch: Partial<PayrollItem>) => Promise<void>;
  onDeleteItem: (item: PayrollItem) => Promise<void>;
  onDeleteItems: (items: PayrollItem[]) => Promise<void>;
}

const ROW_ACCESSORS: Record<string, (i: PayrollItem) => string | number> = {
  slip: (i) => i.slipNo,
  employee: (i) => i.employeeName.toLowerCase(),
  basic: (i) => i.basic,
  bonus: (i) => i.bonus,
  deduction: (i) => i.deduction,
  net: (i) => netPay(i),
  payDate: (i) => i.payDate,
  status: (i) => i.status,
};

const PayrollPanel = ({
  payroll,
  employees,
  transactions,
  settings,
  onGenerate,
  onConfirm,
  onSaveItem,
  onDeleteItem,
  onDeleteItems,
}: Props) => {
  const [month, setMonth] = useState(suggestedPayMonth);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<PayrollItem | null>(null);
  const [patch, setPatch] = useState<Partial<PayrollItem>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [monthFilter, setMonthFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  // The same predicate generateRun uses — the caption can never lie about
  // who a run will include.
  const eligible = useMemo(() => employees.filter(isPayrollEligible), [employees]);

  const allMonths = useMemo(
    () => [...new Set(payroll.map((p) => p.payMonth.slice(0, 7)))].sort().reverse(),
    [payroll],
  );

  /** Newest month first, rows grouped, filters applied; empty groups drop out. */
  const byMonth = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const groups = new Map<string, PayrollItem[]>();
    for (const item of payroll) {
      const key = item.payMonth.slice(0, 7);
      if (monthFilter && key !== monthFilter) continue;
      if (statusFilter && item.status !== statusFilter) continue;
      if (
        needle &&
        !item.employeeName.toLowerCase().includes(needle) &&
        !item.slipNo.toLowerCase().includes(needle)
      )
        continue;
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [payroll, monthFilter, statusFilter, search]);

  const generate = async () => {
    if (!month) return;
    setBusy(true);
    try {
      const created = await onGenerate(`${month}-01`, employees);
      if (created === 0) {
        window.alert(
          `No rows to add — every Active internal employee already has a payroll row for ${monthLabel(month)}.\n\nManage the existing rows below instead: draft rows can be edited and confirmed to post salaries to the ledger; or delete rows here first if you want to regenerate them.`,
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
    if (window.confirm(warning)) {
      await onDeleteItem(item);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
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

  const toggleMonth = (items: PayrollItem[]) =>
    setSelected((prev) => {
      const next = new Set(prev);
      const allIn = items.every((i) => next.has(i.id));
      for (const item of items) {
        if (allIn) next.delete(item.id);
        else next.add(item.id);
      }
      return next;
    });

  const selectedRows = useMemo(
    () => payroll.filter((p) => selected.has(p.id)),
    [payroll, selected],
  );

  /* One sort state shared by every month's table — consistent columns. */
  const [rowSort, setRowSort] = useState<SortState | null>(null);
  const toggleRowSort = (key: string) => setRowSort((current) => cycleSort(current, key));
  const sortRows = (items: PayrollItem[]) => sortItems(items, ROW_ACCESSORS, rowSort);

  const removeSelected = async () => {
    const confirmed = selectedRows.filter((i) => i.status === "confirmed" && i.transactionId);
    const total = selectedRows.reduce((sum, i) => sum + netPay(i), 0);
    if (
      window.confirm(
        `Delete ${selectedRows.length} payroll row${selectedRows.length === 1 ? "" : "s"} (PKR ${pkr(total)} net in total)?` +
          (confirmed.length
            ? `\n\n${confirmed.length} of them are confirmed — their Salary expenses will ALSO be removed from the ledger.`
            : ""),
      )
    ) {
      await onDeleteItems(selectedRows);
      setSelected(new Set());
    }
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
    try {
      const employee =
        employees.find((e) => e.id === item.employeeId) ??
        employees.find(
          (e) => e.fullName.trim().toLowerCase() === item.employeeName.trim().toLowerCase(),
        ) ??
        null;
      openPdf(await renderSalarySlip(item, employee, settings.slipNote), `${item.slipNo}.pdf`);
    } catch (caught) {
      // A silent failure reads as "the button does nothing" — say what broke.
      window.alert(`Could not generate the salary slip: ${errorMessage(caught)}`);
    }
  };

  const editNet = netPay({
    basic: patch.basic ?? 0,
    bonus: patch.bonus ?? 0,
    deduction: patch.deduction ?? 0,
  });

  /* ── Salary certificate (FBR) ──────────────────────────────────────────── */

  const [certEmployeeId, setCertEmployeeId] = useState("");
  const [certYear, setCertYear] = useState("");
  const [certBusy, setCertBusy] = useState(false);

  const certYears = useMemo(() => {
    const years = new Set<string>();
    for (const p of payroll) years.add(fiscalYearOf(p.payMonth));
    for (const t of transactions) {
      if (t.type === "expense" && t.category === "Salary") years.add(fiscalYearOf(t.date));
    }
    return [...years].sort().reverse();
  }, [payroll, transactions]);

  const downloadCertificate = async () => {
    const person = employees.find((e) => e.id === certEmployeeId);
    const fy = certYear || certYears[0];
    if (!person || !fy) return;
    setCertBusy(true);
    try {
      const rows = monthlySalaries({ employee: person, fiscalYear: fy, payroll, transactions });
      if (rows.length === 0) {
        window.alert(`No salary records found for ${person.fullName} in FY ${fy}.`);
        return;
      }
      openPdf(
        await renderSalaryCertificate({
          employee: person,
          fiscalYear: fy,
          payroll,
          transactions,
          taxNote: settings.slipNote,
        }),
        `salary-certificate-${person.fullName.replace(/\s+/g, "-")}-FY${fy}.pdf`,
      );
    } catch (caught) {
      window.alert(`Could not generate the certificate: ${errorMessage(caught)}`);
    } finally {
      setCertBusy(false);
    }
  };

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

      {/* ── Salary certificate (FBR) ──────────────────────────────────────── */}
      <div className="surface mt-4 flex flex-wrap items-end gap-4 p-4 sm:p-5">
        <Field id="cert-employee" label="Salary certificate (FBR)">
          <select
            id="cert-employee"
            className={inputClass("w-56")}
            value={certEmployeeId}
            onChange={(e) => setCertEmployeeId(e.target.value)}
          >
            <option value="">Select employee…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.fullName}</option>
            ))}
          </select>
        </Field>
        <Field id="cert-year" label="Fiscal year">
          <select
            id="cert-year"
            className={inputClass("w-36")}
            value={certYear || certYears[0] || ""}
            onChange={(e) => setCertYear(e.target.value)}
          >
            {certYears.map((fy) => (
              <option key={fy} value={fy}>FY {fy}</option>
            ))}
          </select>
        </Field>
        <Button
          disabled={certBusy || !certEmployeeId}
          className="px-4 py-2.5 text-xs"
          onClick={() => void downloadCertificate()}
        >
          <Award size={14} aria-hidden="true" />
          Download certificate
        </Button>
        <p className="text-xs leading-relaxed text-muted-foreground">
          The annual statement an employee attaches to their FBR return —
          month-by-month net salary for the fiscal year, on the letterhead.
        </p>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      {payroll.length > 0 && (
        <div className="surface mt-4 grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-5">
          <select
            aria-label="Filter by pay month"
            className={inputClass()}
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          >
            <option value="">All months</option>
            {allMonths.map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
          <select
            aria-label="Filter by status"
            className={inputClass()}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Draft + confirmed</option>
            <option value="draft">Draft only</option>
            <option value="confirmed">Confirmed only</option>
          </select>
          <input
            type="search"
            aria-label="Search payroll"
            placeholder="Employee or slip no…"
            className={inputClass("col-span-2")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* ── Bulk selection bar ────────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="surface mt-4 flex flex-wrap items-center gap-3 border-accent/40 p-3 sm:px-5">
          <span className="text-sm text-foreground">
            <strong>{selected.size}</strong> selected · PKR{" "}
            {pkr(selectedRows.reduce((sum, i) => sum + netPay(i), 0))} net
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

      {/* ── Runs ──────────────────────────────────────────────────────────── */}
      {byMonth.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={payroll.length === 0 ? "No payroll runs yet" : "Nothing matches these filters"}
            description={
              payroll.length === 0
                ? "Pick a month above and generate the first run, or import the Excel history from Settings."
                : "Loosen a filter to see more."
            }
          />
        </div>
      ) : (
        byMonth.map(([key, items]) => {
          // Sorted once, rendered twice (mobile cards + desktop table).
          const rows = sortRows(items);
          // Draft count from the FULL month, not the filtered view — Confirm
          // posts every draft in the month, so the button must say so.
          const drafts = payroll.filter(
            (p) => p.status === "draft" && p.payMonth.slice(0, 7) === key,
          );
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

              {/* Mobile: cards — a 56rem table on a phone is a scroll puzzle. */}
              <ul className="mt-3 flex flex-col gap-2 md:hidden">
                {rows.map((item) => (
                  <li key={item.id} className="surface p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${item.slipNo}`}
                        className="mt-1 h-4 w-4 shrink-0 accent-current"
                        checked={selected.has(item.id)}
                        onChange={() => toggleSelected(item.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.employeeName}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          <span className="tabular-nums text-accent">{item.slipNo}</span>
                          {item.payDate && ` · pays ${item.payDate}`}
                        </p>
                        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                          {pkr(item.basic)} basic
                          {item.bonus > 0 && ` + ${pkr(item.bonus)} bonus`}
                          {item.deduction > 0 && ` − ${pkr(item.deduction)} ded.`}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <p className="text-sm font-medium tabular-nums text-foreground">
                          {pkr(netPay(item))}
                        </p>
                        <Badge tone={item.status === "confirmed" ? "success" : "warning"} dot>
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="secondary"
                        className="flex-1 py-1.5 text-xs"
                        onClick={() => void slip(item)}
                      >
                        <FileDown size={12} aria-hidden="true" /> Slip
                      </Button>
                      <Button
                        variant="secondary"
                        className="flex-1 py-1.5 text-xs"
                        onClick={() => startEdit(item)}
                      >
                        <Pencil size={12} aria-hidden="true" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="flex-1 py-1.5 text-xs text-red-500"
                        onClick={() => void remove(item)}
                      >
                        <Trash2 size={12} aria-hidden="true" /> Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Desktop: the full table */}
              <div className="surface mt-3 hidden overflow-x-auto md:block">
                <table className="w-full min-w-[56rem] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border">
                      <th scope="col" className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Select all rows for ${monthLabel(key)}`}
                          className="h-4 w-4 accent-current"
                          checked={items.every((i) => selected.has(i.id))}
                          onChange={() => toggleMonth(items)}
                        />
                      </th>
                      <SortTh label="Slip" sortKey="slip" sort={rowSort} onToggle={toggleRowSort} className="!px-4 !py-3" />
                      <SortTh label="Employee" sortKey="employee" sort={rowSort} onToggle={toggleRowSort} className="!px-4 !py-3" />
                      <SortTh label="Basic" sortKey="basic" sort={rowSort} onToggle={toggleRowSort} className="!px-4 !py-3" />
                      <SortTh label="Bonus" sortKey="bonus" sort={rowSort} onToggle={toggleRowSort} className="!px-4 !py-3" />
                      <SortTh label="Deduction" sortKey="deduction" sort={rowSort} onToggle={toggleRowSort} className="!px-4 !py-3" />
                      <SortTh label="Net pay" sortKey="net" sort={rowSort} onToggle={toggleRowSort} className="!px-4 !py-3" />
                      <SortTh label="Pay date" sortKey="payDate" sort={rowSort} onToggle={toggleRowSort} className="!px-4 !py-3" />
                      <SortTh label="Status" sortKey="status" sort={rowSort} onToggle={toggleRowSort} className="!px-4 !py-3" />
                      <th scope="col" className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr
                        key={item.id}
                        className={`border-b border-border last:border-b-0 ${selected.has(item.id) ? "bg-accent/5" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            aria-label={`Select ${item.slipNo}`}
                            className="h-4 w-4 accent-current"
                            checked={selected.has(item.id)}
                            onChange={() => toggleSelected(item.id)}
                          />
                        </td>
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
                        <td className="w-24 px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              aria-label={`Salary slip for ${item.employeeName}`}
                              title="Download salary slip (PDF)"
                              className="tap rounded-full text-muted-foreground transition-colors hover:text-accent"
                              onClick={() => void slip(item)}
                            >
                              <FileDown size={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Edit ${item.slipNo}`}
                              className="tap rounded-full text-muted-foreground transition-colors hover:text-accent"
                              onClick={() => startEdit(item)}
                            >
                              <Pencil size={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${item.slipNo}`}
                              className="tap rounded-full text-muted-foreground transition-colors hover:text-red-500"
                              onClick={() => void remove(item)}
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
            </section>
          );
        })
      )}
    </div>
  );
};

export default PayrollPanel;
