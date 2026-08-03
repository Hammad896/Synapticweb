import { useMemo, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { Button, EmptyState, Field, Stat, inputClass } from "@/components/kit";
import { openPdf } from "@/hr/pdf";
import {
  fiscalYearClosings,
  fiscalYearRange,
  fiscalYearOf,
  inRange,
  monthLabel,
  monthlyClosings,
  openingBalance,
  pkr,
  round2,
  totalsOf,
  yearlyClosings,
  yearsOf,
  type PeriodClosing,
} from "../calc";
import {
  closingsToCsv,
  downloadCsv,
  financialReportToCsv,
  generalLedgerToCsv,
  transactionsToCsv,
  trialBalanceToCsv,
} from "../csv";
import { renderBalanceSheet, renderFinancialReport } from "../report-pdf";
import type { FinanceCategory, Transaction } from "../types";

interface Props {
  transactions: Transaction[];
  categories: FinanceCategory[];
}

const Amount = ({ value, signed = false }: { value: number; signed?: boolean }) => (
  <span
    className={`tabular-nums ${
      signed ? (value > 0 ? "text-emerald-600" : value < 0 ? "text-red-500" : "text-muted-foreground") : "text-foreground"
    }`}
  >
    {signed && value > 0 ? "+" : ""}
    {pkr(value)}
  </span>
);

const ClosingTable = ({
  rows,
  labelOf,
  extra,
}: {
  rows: PeriodClosing[];
  labelOf: (period: string) => string;
  extra?: { header: string; render: (row: PeriodClosing) => string };
}) => (
  <div className="surface overflow-x-auto">
    <table className="w-full min-w-[44rem] border-collapse text-left">
      <thead>
        <tr className="border-b border-border">
          {["Period", "Opening", "Income", "Expenses", "Net", "Closing", ...(extra ? [extra.header] : [])].map((h) => (
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
        {rows.map((row) => (
          <tr key={row.period} className="border-b border-border last:border-b-0">
            <td className="whitespace-nowrap px-5 py-3 text-sm text-foreground">
              {labelOf(row.period)}
            </td>
            <td className="px-5 py-3 text-sm"><Amount value={row.opening} /></td>
            <td className="px-5 py-3 text-sm tabular-nums text-muted-foreground">{pkr(row.income)}</td>
            <td className="px-5 py-3 text-sm tabular-nums text-muted-foreground">{pkr(row.expenses)}</td>
            <td className="px-5 py-3 text-sm"><Amount value={row.net} signed /></td>
            <td className="px-5 py-3 text-sm font-medium"><Amount value={row.closing} /></td>
            {extra && (
              <td className="px-5 py-3 text-sm tabular-nums text-muted-foreground">
                {extra.render(row)}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ReportsPanel = ({ transactions, categories }: Props) => {
  const years = useMemo(() => yearsOf(transactions), [transactions]);
  const fiscalYears = useMemo(
    () => [...new Set(transactions.map((t) => fiscalYearOf(t.date)))].sort().reverse(),
    [transactions],
  );

  /* ── The report builder ────────────────────────────────────────────────── */
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [typeScope, setTypeScope] = useState("");
  const [categoryScope, setCategoryScope] = useState("");
  const [busy, setBusy] = useState(false);

  const applyPreset = (value: string) => {
    if (!value) return;
    const today = new Date().toISOString().slice(0, 10);
    if (value === "all") { setFrom(""); setTo(""); }
    else if (value === "this-month") { setFrom(today.slice(0, 7) + "-01"); setTo(today); }
    else if (value === "last-month") {
      const d = new Date(); d.setDate(1); d.setDate(0); // last day of previous month
      const end = d.toISOString().slice(0, 10);
      setFrom(end.slice(0, 7) + "-01"); setTo(end);
    } else if (value.startsWith("fy:")) {
      const [start, end] = fiscalYearRange(value.slice(3));
      setFrom(start); setTo(end);
    } else if (value.startsWith("y:")) {
      setFrom(`${value.slice(2)}-01-01`); setTo(`${value.slice(2)}-12-31`);
    }
  };

  const scopedCategories = useMemo(
    () =>
      categories.filter(
        (c) =>
          typeScope === "" ||
          c.kind === (typeScope === "income" ? "income_source" : "expense_category"),
      ),
    [categories, typeScope],
  );

  const scoped = useMemo(
    () =>
      inRange(transactions, from, to).filter(
        (t) =>
          (!typeScope || t.type === typeScope) &&
          (!categoryScope || t.category === categoryScope),
      ),
    [transactions, from, to, typeScope, categoryScope],
  );

  const totals = useMemo(() => totalsOf(scoped), [scoped]);
  const opening = useMemo(() => openingBalance(transactions, from), [transactions, from]);
  // Opening/closing describe the company's CASH position, so they only make
  // sense when the selection includes both directions of money.
  const showBalances = !typeScope && !categoryScope;

  const periodLabel =
    !from && !to
      ? "All time"
      : `${from || "start"} — ${to || "today"}`;
  const scopeLabel = categoryScope
    ? `Category: ${categoryScope}`
    : typeScope
      ? typeScope === "income" ? "Income only" : "Expenses only"
      : "Everything";

  const stamp = new Date().toISOString().slice(0, 10);
  const fileBase = `synaptic-report-${(from || "start")}-to-${(to || stamp)}${typeScope ? "-" + typeScope : ""}${categoryScope ? "-" + categoryScope.toLowerCase().replace(/\s+/g, "-") : ""}`;

  const guarded = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } catch (caught) {
      window.alert(
        `Could not generate the report: ${caught instanceof Error ? caught.message : "unknown error"}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = () =>
    guarded(async () =>
      openPdf(
        await renderFinancialReport({
          transactions: scoped,
          allTransactions: transactions,
          categories,
          periodLabel,
          scopeLabel,
          from,
          to,
        }),
        `${fileBase}.pdf`,
      ),
    );

  const downloadBalanceSheet = () =>
    guarded(async () => {
      const asOf = to || stamp;
      openPdf(await renderBalanceSheet(transactions, asOf), `synaptic-balance-sheet-${asOf}.pdf`);
    });

  /* ── The standing tables ───────────────────────────────────────────────── */
  const fiscal = useMemo(() => fiscalYearClosings(transactions), [transactions]);
  const yearly = useMemo(() => yearlyClosings(transactions), [transactions]);
  const [monthYear, setMonthYear] = useState<string>("");
  const monthly = useMemo(() => {
    const all = monthlyClosings(transactions);
    return monthYear ? all.filter((m) => m.period.startsWith(monthYear)) : all;
  }, [transactions, monthYear]);

  if (transactions.length === 0) {
    return (
      <EmptyState
        title="No data to report on"
        description="Add transactions, or import the Excel history from Settings."
      />
    );
  }

  return (
    <div>
      {/* ── Report builder ────────────────────────────────────────────────── */}
      <div className="surface p-4 sm:p-6">
        <p className="text-sm font-medium text-foreground">Build a report</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Any period, any slice — salaries for a fiscal year, income for a
          quarter, everything for a month. Fiscal years run 1 July – 30 June,
          matching FBR returns.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Field id="rp-preset" label="Preset">
            <select
              id="rp-preset"
              className={inputClass()}
              defaultValue=""
              onChange={(e) => { applyPreset(e.target.value); e.target.value = ""; }}
            >
              <option value="">Pick a period…</option>
              <option value="all">All time</option>
              <option value="this-month">This month</option>
              <option value="last-month">Last month</option>
              <optgroup label="Fiscal years (FBR, Jul–Jun)">
                {fiscalYears.map((fy) => (
                  <option key={fy} value={`fy:${fy}`}>FY {fy}</option>
                ))}
              </optgroup>
              <optgroup label="Calendar years">
                {years.map((y) => (
                  <option key={y} value={`y:${y}`}>{y}</option>
                ))}
              </optgroup>
            </select>
          </Field>

          <Field id="rp-from" label="From">
            <input
              id="rp-from" type="date" className={inputClass()}
              value={from} onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field id="rp-to" label="To">
            <input
              id="rp-to" type="date" className={inputClass()}
              value={to} onChange={(e) => setTo(e.target.value)}
            />
          </Field>

          <Field id="rp-type" label="Type">
            <select
              id="rp-type" className={inputClass()} value={typeScope}
              onChange={(e) => { setTypeScope(e.target.value); setCategoryScope(""); }}
            >
              <option value="">Income + Expense</option>
              <option value="income">Income only</option>
              <option value="expense">Expenses only</option>
            </select>
          </Field>

          <Field id="rp-category" label="Category">
            <select
              id="rp-category" className={inputClass()} value={categoryScope}
              onChange={(e) => setCategoryScope(e.target.value)}
            >
              <option value="">All categories</option>
              {scopedCategories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.accountCode ? `${c.accountCode} · ` : ""}{c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Live answer for the selection */}
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Income" value={pkr(totals.income)} detail={`${totals.count} transactions`} />
          <Stat label="Expenses" value={pkr(totals.expenses)} />
          <Stat label="Net" value={pkr(totals.net)} />
          <Stat
            label={showBalances ? "Closing balance" : "Scope"}
            value={showBalances ? pkr(round2(opening + totals.net)) : scopeLabel}
            detail={showBalances ? `Opened at ${pkr(opening)}` : periodLabel}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button disabled={busy || scoped.length === 0} className="px-4 py-2 text-xs" onClick={() => void downloadPdf()}>
            {busy
              ? <Loader2 size={13} className="animate-spin" aria-hidden="true" />
              : <FileText size={13} aria-hidden="true" />}
            Branded PDF report
          </Button>
          <Button
            variant="secondary"
            disabled={scoped.length === 0}
            className="px-4 py-2 text-xs"
            onClick={() =>
              downloadCsv(`${fileBase}.csv`, financialReportToCsv(scoped, categories, `${periodLabel} · ${scopeLabel}`))
            }
          >
            <Download size={13} aria-hidden="true" />
            Report CSV
          </Button>
          <Button
            variant="secondary"
            disabled={scoped.length === 0}
            className="px-4 py-2 text-xs"
            onClick={() => downloadCsv(`${fileBase}-transactions.csv`, transactionsToCsv(scoped))}
          >
            <Download size={13} aria-hidden="true" />
            Transactions CSV
          </Button>
          <Button
            disabled={busy || transactions.length === 0}
            className="px-4 py-2 text-xs"
            title={`The cash position as of ${to || "today"} — assets and how they were funded`}
            onClick={() => void downloadBalanceSheet()}
          >
            <FileText size={13} aria-hidden="true" />
            Balance sheet PDF
          </Button>
          <Button
            variant="secondary"
            disabled={scoped.length === 0}
            className="px-4 py-2 text-xs"
            title="Every transaction grouped under its account with running balances"
            onClick={() =>
              downloadCsv(
                `${fileBase}-general-ledger.csv`,
                generalLedgerToCsv(scoped, categories, `${periodLabel} · ${scopeLabel}`),
              )
            }
          >
            <Download size={13} aria-hidden="true" />
            General ledger CSV
          </Button>
          <Button
            variant="secondary"
            disabled={scoped.length === 0}
            className="px-4 py-2 text-xs"
            title="Per-account debits and credits for the period"
            onClick={() =>
              downloadCsv(
                `${fileBase}-trial-balance.csv`,
                trialBalanceToCsv(scoped, categories, `${periodLabel} · ${scopeLabel}`),
              )
            }
          >
            <Download size={13} aria-hidden="true" />
            Trial balance CSV
          </Button>
        </div>
      </div>

      {/* ── FBR fiscal years ──────────────────────────────────────────────── */}
      <h3 className="mt-8 text-base font-medium text-foreground">
        Fiscal year closing <span className="text-xs text-muted-foreground">(FBR · 1 Jul – 30 Jun)</span>
      </h3>
      <div className="mt-3">
        <ClosingTable
          rows={fiscal}
          labelOf={(p) => `FY ${p}`}
          extra={{
            header: "Exp % of income",
            render: (row) =>
              row.income > 0 ? `${Math.round((row.expenses / row.income) * 100)}%` : "—",
          }}
        />
      </div>
      <div className="mt-3">
        <Button
          variant="secondary"
          className="px-4 py-2 text-xs"
          onClick={() =>
            downloadCsv(`synaptic-fiscal-closings-${stamp}.csv`, closingsToCsv(fiscal, (p) => `FY ${p}`))
          }
        >
          <Download size={13} aria-hidden="true" />
          Fiscal closings CSV
        </Button>
      </div>

      {/* ── Calendar years ────────────────────────────────────────────────── */}
      <h3 className="mt-8 text-base font-medium text-foreground">Calendar year closing</h3>
      <div className="mt-3">
        <ClosingTable
          rows={yearly}
          labelOf={(p) => p}
          extra={{
            header: "Exp % of income",
            render: (row) =>
              row.income > 0 ? `${Math.round((row.expenses / row.income) * 100)}%` : "—",
          }}
        />
      </div>

      {/* ── Months ────────────────────────────────────────────────────────── */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <h3 className="text-base font-medium text-foreground">Monthly closing</h3>
        <select
          aria-label="Filter monthly closings by year"
          className={inputClass("w-36")}
          value={monthYear}
          onChange={(e) => setMonthYear(e.target.value)}
        >
          <option value="">All months</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Opening is carried forward from the previous month across the whole
        history, exactly like the Excel closing sheet.
      </p>
      <div className="mt-3">
        <ClosingTable rows={monthly} labelOf={monthLabel} />
      </div>
    </div>
  );
};

export default ReportsPanel;
