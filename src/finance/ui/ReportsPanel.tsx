import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button, EmptyState, inputClass } from "@/components/kit";
import { monthLabel, monthlyClosings, pkr, yearlyClosings, type PeriodClosing } from "../calc";
import { closingsToCsv, downloadCsv, financialReportToCsv, transactionsToCsv } from "../csv";
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
  /** Optional last column, e.g. expense % of income for the yearly table. */
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
  const years = useMemo(
    () => [...new Set(transactions.map((t) => t.date.slice(0, 4)))].sort().reverse(),
    [transactions],
  );
  const [year, setYear] = useState<string>("");

  const scoped = useMemo(
    () => (year ? transactions.filter((t) => t.date.startsWith(year)) : transactions),
    [transactions, year],
  );
  const scopeLabel = year || "all time";
  const today = new Date().toISOString().slice(0, 10);

  const monthly = useMemo(() => {
    // Carry-forward must run over the WHOLE history — a year filter changes
    // which rows are shown, never how the balance was carried into them.
    const all = monthlyClosings(transactions);
    return year ? all.filter((m) => m.period.startsWith(year)) : all;
  }, [transactions, year]);

  const yearly = useMemo(() => yearlyClosings(transactions), [transactions]);

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
      {/* ── Downloads — everything an accountant would ask for ───────────── */}
      <div className="surface flex flex-wrap items-center gap-3 p-4 sm:p-5">
        <div className="mr-auto">
          <p className="text-sm font-medium text-foreground">Download reports</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            CSV files Excel opens directly. Scope follows the year picker below
            (currently: {scopeLabel}).
          </p>
        </div>
        <Button
          variant="secondary"
          className="px-4 py-2 text-xs"
          onClick={() =>
            downloadCsv(
              `synapticlab-financial-report-${scopeLabel.replace(" ", "-")}-${today}.csv`,
              financialReportToCsv(scoped, categories, scopeLabel),
            )
          }
        >
          <Download size={13} aria-hidden="true" />
          Financial report
        </Button>
        <Button
          variant="secondary"
          className="px-4 py-2 text-xs"
          onClick={() =>
            downloadCsv(
              `synapticlab-yearly-closings-${today}.csv`,
              closingsToCsv(yearly, (p) => p),
            )
          }
        >
          <Download size={13} aria-hidden="true" />
          Yearly closings
        </Button>
        <Button
          variant="secondary"
          className="px-4 py-2 text-xs"
          onClick={() =>
            downloadCsv(
              `synapticlab-monthly-closings-${scopeLabel.replace(" ", "-")}-${today}.csv`,
              closingsToCsv(monthly, monthLabel),
            )
          }
        >
          <Download size={13} aria-hidden="true" />
          Monthly closings
        </Button>
        <Button
          variant="secondary"
          className="px-4 py-2 text-xs"
          onClick={() =>
            downloadCsv(
              `synapticlab-transactions-${scopeLabel.replace(" ", "-")}-${today}.csv`,
              transactionsToCsv(scoped),
            )
          }
        >
          <Download size={13} aria-hidden="true" />
          Transactions
        </Button>
      </div>

      <h3 className="mt-8 text-base font-medium text-foreground">Yearly closing</h3>
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

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <h3 className="text-base font-medium text-foreground">Monthly closing</h3>
        <select
          aria-label="Filter monthly closings by year"
          className={inputClass("w-36")}
          value={year}
          onChange={(e) => setYear(e.target.value)}
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
