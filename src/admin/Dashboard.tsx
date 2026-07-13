import { useMemo } from "react";
import { CalendarClock, TrendingUp, UserCheck, Users, Wallet } from "lucide-react";
import type { Employee } from "./types";

/**
 * Everything here is DERIVED from the employee records — nothing is stored twice.
 * A dashboard that keeps its own copy of the numbers is a dashboard that will one
 * day disagree with the table underneath it.
 */

const monthsSince = (iso: string) =>
  iso ? (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24 * 30.44) : 0;

const Stat = ({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  detail: string;
}) => (
  <div className="surface p-6">
    <div className="flex items-center justify-between">
      <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <Icon size={16} aria-hidden="true" className="shrink-0 text-accent" />
    </div>
    <p className="type-display mt-4 text-3xl tabular-nums text-foreground">{value}</p>
    <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
  </div>
);

const Dashboard = ({ employees }: { employees: Employee[] }) => {
  const metrics = useMemo(() => {
    const active = employees.filter((e) => e.status === "active");

    // Payroll is grouped BY CURRENCY, never summed across them. Adding PKR to NOK
    // would produce a confident, meaningless number — the worst kind.
    const payroll = active.reduce<Record<string, number>>((totals, e) => {
      totals[e.salaryCurrency] = (totals[e.salaryCurrency] ?? 0) + e.salaryAmount;
      return totals;
    }, {});

    const avgTenure = active.length
      ? active.reduce((sum, e) => sum + monthsSince(e.joinedAt), 0) / active.length
      : 0;

    const joinedLast90Days = employees.filter(
      (e) => e.joinedAt && monthsSince(e.joinedAt) <= 3,
    ).length;

    const departments = new Set(
      active.map((e) => e.department.trim()).filter(Boolean),
    ).size;

    const missingEmergency = active.filter(
      (e) => !e.emergencyContact.name || !e.emergencyContact.phone,
    ).length;

    return {
      active,
      payroll,
      avgTenure,
      joinedLast90Days,
      departments,
      missingEmergency,
    };
  }, [employees]);

  const payrollEntries = Object.entries(metrics.payroll);

  const formatMoney = (amount: number, currency: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
      notation: amount >= 1_000_000 ? "compact" : "standard",
    }).format(amount);

  return (
    <section aria-label="Overview">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={Users}
          label="Headcount"
          value={String(employees.length)}
          detail={`${metrics.active.length} active · ${
            employees.length - metrics.active.length
          } inactive`}
        />

        <Stat
          icon={Wallet}
          label="Monthly payroll"
          value={
            payrollEntries.length === 0
              ? "—"
              : formatMoney(payrollEntries[0][1], payrollEntries[0][0])
          }
          detail={
            payrollEntries.length > 1
              ? payrollEntries
                  .slice(1)
                  .map(([currency, total]) => formatMoney(total, currency))
                  .join(" + ")
              : "Active employees only"
          }
        />

        <Stat
          icon={CalendarClock}
          label="Average tenure"
          value={
            metrics.avgTenure >= 12
              ? `${(metrics.avgTenure / 12).toFixed(1)} yr`
              : `${Math.round(metrics.avgTenure)} mo`
          }
          detail="Across active staff"
        />

        <Stat
          icon={TrendingUp}
          label="New joiners"
          value={String(metrics.joinedLast90Days)}
          detail="Started in the last 90 days"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="surface p-6 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
            Headcount by department
          </p>

          {metrics.active.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">
              No active employees yet.
            </p>
          ) : (
            <ul className="mt-5 flex flex-col gap-3">
              {Object.entries(
                metrics.active.reduce<Record<string, number>>((counts, e) => {
                  const key = e.department.trim() || "Unassigned";
                  counts[key] = (counts[key] ?? 0) + 1;
                  return counts;
                }, {}),
              )
                .sort((a, b) => b[1] - a[1])
                .map(([department, count]) => {
                  const share = (count / metrics.active.length) * 100;

                  return (
                    <li key={department} className="flex items-center gap-4">
                      <span className="w-32 shrink-0 truncate text-sm text-foreground">
                        {department}
                      </span>
                      {/* A bar, not a chart library. One dependency saved. */}
                      <span
                        aria-hidden="true"
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                      >
                        <span
                          className="gradient-fill block h-full rounded-full"
                          style={{ width: `${share}%` }}
                        />
                      </span>
                      <span className="w-8 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                        {count}
                      </span>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>

        {/* Data-quality nudge. An emergency contact you don't have is only
            discovered on the day you need it. */}
        <div className="surface p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
              Records to complete
            </p>
            <UserCheck size={16} aria-hidden="true" className="shrink-0 text-accent" />
          </div>

          <p className="type-display mt-4 text-3xl tabular-nums text-foreground">
            {metrics.missingEmergency}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {metrics.missingEmergency === 0
              ? "Every active employee has an emergency contact on file."
              : `${metrics.missingEmergency} active ${
                  metrics.missingEmergency === 1 ? "employee is" : "employees are"
                } missing an emergency contact.`}
          </p>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;
