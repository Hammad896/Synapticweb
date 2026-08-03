import { useMemo, useState } from "react";
import { EmptyState, inputClass } from "@/components/kit";
import { monthLabel, monthlyClosings, pkr, yearlyClosings, type PeriodClosing } from "../calc";
import type { Transaction } from "../types";

interface Props {
  transactions: Transaction[];
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

const ReportsPanel = ({ transactions }: Props) => {
  const years = useMemo(
    () => [...new Set(transactions.map((t) => t.date.slice(0, 4)))].sort().reverse(),
    [transactions],
  );
  const [year, setYear] = useState<string>("");

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
      <h3 className="text-base font-medium text-foreground">Yearly closing</h3>
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
