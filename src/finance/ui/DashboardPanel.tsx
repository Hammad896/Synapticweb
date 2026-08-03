import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, PiggyBank, ReceiptText } from "lucide-react";
import { Stat, inputClass } from "@/components/kit";
import { breakdown, monthLabel, monthlyClosings, pkr, round2, totalsOf, yearsOf } from "../calc";
import type { FinanceSettings, Transaction } from "../types";

/**
 * Income/expense series colors — validated with the dataviz six-checks
 * (deutan ΔE 9.6, both light and dark surfaces). Identity is never color
 * alone: the legend names the series and every bar pair answers on hover.
 */
const INCOME = "#059669";
const EXPENSE = "#ef4444";

interface Props {
  transactions: Transaction[];
  settings: FinanceSettings;
}

const DashboardPanel = ({ transactions, settings }: Props) => {
  const years = useMemo(() => yearsOf(transactions), [transactions]);
  const [year, setYear] = useState<string>("");
  const [hover, setHover] = useState<number | null>(null);

  const scoped = useMemo(
    () => (year ? transactions.filter((t) => t.date.startsWith(year)) : transactions),
    [transactions, year],
  );
  const totals = useMemo(() => totalsOf(scoped), [scoped]);

  // The reserve applies to the company's REAL balance — all-time net — not to
  // one year's slice. Showing "available" against a filtered subtotal would
  // overstate the money that can actually be spent.
  const allTime = useMemo(() => totalsOf(transactions), [transactions]);
  const available = round2(allTime.net - settings.reserve);

  const chartYear = year || years[0] || "";
  const months = useMemo(() => {
    const closings = monthlyClosings(
      transactions.filter((t) => t.date.startsWith(chartYear)),
    );
    return closings.map((c) => ({
      label: monthLabel(c.period).slice(0, 3),
      period: c.period,
      income: c.income,
      expenses: c.expenses,
    }));
  }, [transactions, chartYear]);

  const expenseBreakdown = useMemo(() => breakdown(scoped, "expense"), [scoped]);
  const incomeBreakdown = useMemo(() => breakdown(scoped, "income"), [scoped]);

  /* ── Chart geometry ────────────────────────────────────────────────────── */
  const W = 720;
  const H = 240;
  const PAD = { top: 12, right: 8, bottom: 24, left: 56 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const max = Math.max(1, ...months.flatMap((m) => [m.income, m.expenses]));
  const yOf = (v: number) => PAD.top + plotH * (1 - v / max);
  const group = months.length ? plotW / months.length : plotW;
  const barW = Math.min(18, Math.max(6, group / 2 - 6));

  const compact = (v: number) =>
    v >= 1_000_000 ? `${round2(v / 1_000_000)}M` : v >= 1_000 ? `${Math.round(v / 1_000)}k` : String(v);

  const gridSteps = [0.25, 0.5, 0.75, 1].map((f) => round2(max * f));

  return (
    <div>
      {/* ── Scope ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Scope by year"
          className={inputClass("w-40")}
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          <option value="">All time</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {year ? `Showing ${year}.` : "Showing the full history."} Reserve of PKR{" "}
          {pkr(settings.reserve)} is always held against the all-time balance.
        </p>
      </div>

      {/* ── Headline numbers ──────────────────────────────────────────────── */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={ArrowUpRight} label="Income" value={pkr(totals.income)} detail={`${totals.count} transactions in scope`} />
        <Stat icon={ArrowDownRight} label="Expenses" value={pkr(totals.expenses)} />
        <Stat
          icon={ReceiptText}
          label={year ? `Net (${year})` : "Net balance"}
          value={pkr(totals.net)}
          detail={year ? `All-time net: ${pkr(allTime.net)}` : undefined}
        />
        <Stat
          icon={PiggyBank}
          label="Available after reserve"
          value={pkr(available)}
          detail={`All-time net ${pkr(allTime.net)} − reserve ${pkr(settings.reserve)}`}
        />
      </div>

      {/* ── Monthly income vs expense ─────────────────────────────────────── */}
      {months.length > 0 && (
        <div className="surface mt-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              Monthly income vs expense · {chartYear}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: INCOME }} aria-hidden="true" />
                Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: EXPENSE }} aria-hidden="true" />
                Expense
              </span>
            </div>
          </div>

          <div className="relative mt-4 overflow-x-auto">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              role="img"
              aria-label={`Monthly income versus expense for ${chartYear}`}
              className="min-w-[36rem] w-full"
            >
              {/* recessive grid */}
              {gridSteps.map((v) => (
                <g key={v}>
                  <line
                    x1={PAD.left} x2={W - PAD.right} y1={yOf(v)} y2={yOf(v)}
                    stroke="currentColor" strokeOpacity={0.08}
                  />
                  <text
                    x={PAD.left - 8} y={yOf(v) + 3} textAnchor="end"
                    fontSize={10} fill="currentColor" opacity={0.45}
                  >
                    {compact(v)}
                  </text>
                </g>
              ))}
              <line
                x1={PAD.left} x2={W - PAD.right} y1={yOf(0)} y2={yOf(0)}
                stroke="currentColor" strokeOpacity={0.2}
              />

              {months.map((m, i) => {
                const cx = PAD.left + group * i + group / 2;
                const isHover = hover === i;
                return (
                  <g
                    key={m.period}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  >
                    {/* hit target wider than the marks */}
                    <rect
                      x={PAD.left + group * i} y={PAD.top}
                      width={group} height={plotH}
                      fill={isHover ? "currentColor" : "transparent"}
                      opacity={isHover ? 0.05 : 0}
                    />
                    <rect
                      x={cx - barW - 1} y={yOf(m.income)}
                      width={barW} height={Math.max(0, yOf(0) - yOf(m.income))}
                      rx={3} fill={INCOME}
                    >
                      <title>{`${monthLabel(m.period)} — income PKR ${pkr(m.income)}`}</title>
                    </rect>
                    <rect
                      x={cx + 1} y={yOf(m.expenses)}
                      width={barW} height={Math.max(0, yOf(0) - yOf(m.expenses))}
                      rx={3} fill={EXPENSE}
                    >
                      <title>{`${monthLabel(m.period)} — expenses PKR ${pkr(m.expenses)}`}</title>
                    </rect>
                    <text
                      x={cx} y={H - 8} textAnchor="middle"
                      fontSize={10} fill="currentColor" opacity={isHover ? 0.9 : 0.45}
                    >
                      {m.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {hover !== null && months[hover] && (
              <div
                className="pointer-events-none absolute top-2 rounded-xl border border-border bg-background px-3 py-2 text-xs shadow-lg"
                style={{
                  left: `${((PAD.left + group * hover + group / 2) / W) * 100}%`,
                  transform: hover > months.length / 2 ? "translateX(-105%)" : "translateX(6px)",
                }}
              >
                <p className="font-medium text-foreground">{monthLabel(months[hover].period)}</p>
                <p className="mt-1 tabular-nums text-muted-foreground">
                  Income <span className="text-foreground">{pkr(months[hover].income)}</span>
                </p>
                <p className="tabular-nums text-muted-foreground">
                  Expense <span className="text-foreground">{pkr(months[hover].expenses)}</span>
                </p>
                <p className="tabular-nums text-muted-foreground">
                  Net{" "}
                  <span className="text-foreground">
                    {pkr(round2(months[hover].income - months[hover].expenses))}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Breakdowns ────────────────────────────────────────────────────── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {(
          [
            ["Expenses by category", expenseBreakdown, EXPENSE],
            ["Income by source", incomeBreakdown, INCOME],
          ] as const
        ).map(([title, rows, color]) => {
          const top = rows[0]?.amount ?? 1;
          const total = rows.reduce((s, r) => s + r.amount, 0) || 1;
          return (
            <div key={title} className="surface p-4 sm:p-6">
              <p className="text-sm font-medium text-foreground">{title}</p>
              {rows.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Nothing in scope.</p>
              ) : (
                <ul className="mt-4 flex flex-col gap-3">
                  {rows.map((row) => (
                    <li key={row.category}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-foreground">{row.category}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {pkr(row.amount)}
                          <span className="ml-2 text-xs opacity-70">
                            {Math.round((row.amount / total) * 100)}%
                          </span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border/60">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(2, (row.amount / top) * 100)}%`,
                            background: color,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardPanel;
